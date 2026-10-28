import * as Crypto from 'expo-crypto';
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useProfile } from '@/lib/profile/ProfileContext';
import { computeStats } from '@/lib/profile/stats';
import type { ScanResponse } from '@/lib/scanner/schema';
import type { LifestyleSpot, SpotAction, SpotActionResult } from '@/lib/spots/types';
import { accommodationFor, generateTailoredItinerary, routingFromProfile } from '@/lib/logistics/tailoredEngine';
import type { ParsedNoteNode } from '@/lib/scanner/textIngest';
import { applySpotAction, newTrip, rechain, spotsFromNotes, tripFromNotes, type TripsState } from '@/lib/trips/itinerary';
import { publishTrip } from '@/lib/trips/repository';
import { readJSON, writeJSON } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { mergeById, pullAll, pushSpot, pushTrip, uploadTripPhotos } from '@/lib/sync/cloud';
import type { AccommodationType, Booking, Trip, TripStop } from '@/lib/trips/types';

// Trips and spots are saved on the device (lib/storage.ts) after every
// change, so a plan survives restarts. When you're signed in they also sync
// to your Supabase account (lib/sync/cloud.ts), photos included, so another
// device or the web app sees the same trips. Shared trips live separately.

type State = TripsState & { spots: LifestyleSpot[] };

/** Event ids Google Calendar returned, keyed by stop and by booking. */
export type GoogleEventIds = { stops: Record<string, string>; bookings: Record<string, string> };

const STORAGE_KEY = 'ndtm.trips.v1';

/** off: not signed in · syncing: talking to Supabase · synced: cloud is current · error: will retry on the next change. */
export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error';

/** Stamps a change time on every trip or spot that is a new object since `prev`. */
function stampChanges(prev: State, next: State): State {
  const now = new Date().toISOString();
  const prevTrips = new Map(prev.trips.map((t) => [t.id, t]));
  const prevSpots = new Map(prev.spots.map((x) => [x.id, x]));
  return {
    ...next,
    trips: next.trips.map((t) => (prevTrips.get(t.id) === t ? t : { ...t, updatedAt: now })),
    spots: next.spots.map((x) => (prevSpots.get(x.id) === x ? x : { ...x, updatedAt: now })),
  };
}

type TripsContextValue = {
  trips: Trip[];
  activeTrip: Trip;
  spots: LifestyleSpot[];
  setActiveTrip: (tripId: string) => void;
  renameActiveTrip: (title: string) => void;
  /** Adds a scanned destination as a new leg of the active trip, tailored to the profile. Pass `accommodation` to override the profile's hiking style. */
  addScannedStop: (response: ScanResponse, accommodation?: AccommodationType, imageUri?: string) => void;
  setNights: (stopId: string, nights: number) => void;
  setAccommodation: (stopId: string, accommodation: AccommodationType) => void;
  removeStop: (stopId: string) => void;
  removeTimelineItem: (stopId: string, itemId: string) => void;
  /** Keeps a scanned or typed spot in the Night out list. */
  saveSpot: (spot: LifestyleSpot) => void;
  /** Runs one of the three Night out quick actions. */
  runSpotAction: (action: SpotAction) => SpotActionResult;
  /** Publishes the active trip so its share link works. */
  publishActiveTrip: () => Promise<{ trip: Trip; publishError: string | null }>;
  /** Copies a friend's shared trip into your trips. */
  mirrorTrip: (trip: Trip) => void;
  /** Adds a booking (stay, train, tour…) to a leg of the active trip. */
  addBooking: (stopId: string, booking: Omit<Booking, 'id'>) => void;
  removeBooking: (stopId: string, bookingId: string) => void;
  /** Remembers which Google Calendar events belong to which legs and bookings, so syncing again updates instead of duplicating. */
  recordGoogleEvents: (tripId: string, ids: GoogleEventIds) => void;
  /** Pasted notes → a new active trip, one leg per city in order, venues on each leg's timeline. */
  assembleFromNotes: (nodes: ParsedNoteNode[]) => Trip;
  /** Pasted notes → independent spots scattered on Home, not tied to any trip. */
  scatterFromNotes: (nodes: ParsedNoteNode[]) => LifestyleSpot[];
  /** Cloud sync state for the account card. */
  syncStatus: SyncStatus;
};

const TripsContext = createContext<TripsContextValue | null>(null);

function initialState(): State {
  const saved = readJSON<State>(STORAGE_KEY);
  if (saved && saved.trips?.length && saved.trips.some((t) => t.id === saved.activeTripId)) {
    return { ...saved, spots: saved.spots ?? [] };
  }
  const trip = newTrip();
  return { trips: [trip], activeTripId: trip.id, spots: [] };
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  // Mirror of the latest state so runSpotAction can return its result
  // synchronously. Every update goes through commit(), which keeps it current.
  const latest = useRef(state);
  const { profile, loaded, updateProfile } = useProfile();
  // Trips leave from the profile's active hub and name its rail cards.
  const ctx = useMemo(() => routingFromProfile(profile), [profile]);

  // Keep the scrapbook counters and season charts in the profile up to date.
  useEffect(() => {
    if (!loaded) return;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const stats = computeStats(state.trips, today);
    if (JSON.stringify(stats) !== JSON.stringify(profile.stats)) void updateProfile({ stats });
  }, [state.trips, loaded, profile.stats, updateProfile]);

  /** Saves without stamping change times: for data that came from the cloud. */
  const commitRaw = useCallback((next: State) => {
    latest.current = next;
    setState(next);
    writeJSON(STORAGE_KEY, next);
  }, []);
  /** Saves a local edit, stamping what changed so sync knows it's newer. */
  const commit = useCallback((next: State) => commitRaw(stampChanges(latest.current, next)), [commitRaw]);

  // --- Cloud sync -------------------------------------------------------
  // Who is signed in to Supabase (set by Google sign-in), or null.
  const [owner, setOwner] = useState<string | null>(null);
  const [pushStatus, setSyncStatus] = useState<SyncStatus>('synced');
  // Which account the cloud copy has been merged for; until then we're still syncing.
  const [pulledFor, setPulledFor] = useState<string | null>(null);
  const syncStatus: SyncStatus = !owner ? 'off' : pulledFor !== owner ? 'syncing' : pushStatus;
  // The change time last pushed for each trip and spot, so only edits go up.
  const pushed = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void supabase.auth.getSession().then(({ data }) => setOwner(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setOwner(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // On sign-in: pull the cloud copy and merge it in, newest change winning.
  useEffect(() => {
    pushed.current.clear();
    if (!owner) return;
    let active = true;
    pullAll()
      .then((remote) => {
        if (!active) return;
        for (const t of remote.trips) pushed.current.set(t.id, t.updatedAt ?? '');
        for (const x of remote.spots) pushed.current.set(x.id, x.updatedAt ?? '');
        const s = latest.current;
        // A brand-new empty trip on this device shouldn't hide the cloud's trips.
        const local = s.trips.filter((t) => t.stops.length > 0 || t.id === s.activeTripId);
        const trips = mergeById(local, remote.trips);
        const keepActive = trips.find((t) => t.id === s.activeTripId)?.stops.length;
        commitRaw({
          trips,
          spots: mergeById(s.spots, remote.spots),
          activeTripId: keepActive ? s.activeTripId : (trips.find((t) => t.stops.length) ?? trips[0]).id,
        });
        setSyncStatus('synced');
        setPulledFor(owner);
      })
      .catch((e: Error) => {
        console.warn(e.message);
        if (!active) return;
        setSyncStatus('error');
        setPulledFor(owner);
      });
    return () => {
      active = false;
    };
  }, [owner, commitRaw]);

  // After edits settle, upload new photos and push whatever changed.
  useEffect(() => {
    if (!owner || pulledFor !== owner) return;
    const timer = setTimeout(async () => {
      const s = latest.current;
      const trips = s.trips.filter((t) => t.stops.length && pushed.current.get(t.id) !== (t.updatedAt ?? ''));
      const spots = s.spots.filter((x) => pushed.current.get(x.id) !== (x.updatedAt ?? ''));
      if (!trips.length && !spots.length) {
        setSyncStatus('synced');
        return;
      }
      setSyncStatus('syncing');
      try {
        const uploaded: Trip[] = [];
        for (const trip of trips) {
          const withPhotos = await uploadTripPhotos(owner, trip);
          await pushTrip(owner, withPhotos);
          pushed.current.set(trip.id, trip.updatedAt ?? '');
          if (withPhotos !== trip) uploaded.push(withPhotos);
        }
        for (const spot of spots) {
          await pushSpot(owner, spot);
          pushed.current.set(spot.id, spot.updatedAt ?? '');
        }
        // Remember the new photo paths locally without counting it as an edit.
        if (uploaded.length) {
          const now = latest.current;
          commitRaw({ ...now, trips: now.trips.map((t) => uploaded.find((u) => u.id === t.id && u.updatedAt === t.updatedAt) ?? t) });
        }
        setSyncStatus('synced');
      } catch (e) {
        console.warn(e instanceof Error ? e.message : e);
        setSyncStatus('error');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [state, owner, pulledFor, commitRaw]);

  /** Applies `fn` to the active trip's stops and re-chains dates and logistics. */
  const updateStops = useCallback(
    (fn: (stops: TripStop[]) => TripStop[]) => {
      const s = latest.current;
      commit({
        ...s,
        trips: s.trips.map((t) => (t.id === s.activeTripId ? { ...t, stops: rechain(fn(t.stops), ctx) } : t)),
      });
    },
    [commit, ctx],
  );

  const value = useMemo<TripsContextValue>(() => {
    const activeTrip = state.trips.find((t) => t.id === state.activeTripId) ?? state.trips[0];
    return {
      trips: state.trips,
      syncStatus,
      activeTrip,
      spots: state.spots,
      setActiveTrip: (tripId) => commit({ ...latest.current, activeTripId: tripId }),
      renameActiveTrip: (title) => {
        const s = latest.current;
        commit({ ...s, trips: s.trips.map((t) => (t.id === s.activeTripId ? { ...t, title } : t)) });
      },
      addScannedStop: (response, accommodation, imageUri) => {
        const style = accommodation ? (accommodation === 'tent' ? 'WILD_CAMPING' : 'REFUGE_HUT') : profile.hikingStyle;
        const { stop: tailored } = generateTailoredItinerary(response, { ...profile, hikingStyle: style });
        const stop = { ...tailored, sourceImageUri: imageUri };
        const s = latest.current;
        const active = s.trips.find((t) => t.id === s.activeTripId);
        if (active && active.stops.length === 0) {
          commit({
            ...s,
            trips: s.trips.map((t) => (t.id === active.id ? { ...t, title: `${stop.place.name} escape` } : t)),
          });
        }
        updateStops((stops) => [...stops, stop]);
      },
      setNights: (stopId, nights) =>
        updateStops((stops) => stops.map((s) => (s.id === stopId ? { ...s, nights: Math.min(30, Math.max(1, nights)) } : s))),
      setAccommodation: (stopId, accommodation) =>
        updateStops((stops) => stops.map((s) => (s.id === stopId && s.kind === 'alpine' ? { ...s, accommodation } : s))),
      removeStop: (stopId) => updateStops((stops) => stops.filter((s) => s.id !== stopId)),
      removeTimelineItem: (stopId, itemId) =>
        updateStops((stops) =>
          stops.map((s) => (s.id === stopId ? { ...s, timeline: s.timeline.filter((i) => i.id !== itemId) } : s)),
        ),
      saveSpot: (spot) => {
        const s = latest.current;
        commit({ ...s, spots: [spot, ...s.spots.filter((x) => x.id !== spot.id)] });
      },
      runSpotAction: (action) => {
        const s = latest.current;
        const { state: next, result } = applySpotAction(s, action, ctx);
        if (result.ok) commit({ ...s, ...next, spots: [action.spot, ...s.spots.filter((x) => x.id !== action.spot.id)] });
        return result;
      },
      publishActiveTrip: async () => {
        const s = latest.current;
        const trip = { ...s.trips.find((t) => t.id === s.activeTripId)!, imprintPattern: profile.imprintPattern };
        try {
          await publishTrip(trip);
          return { trip, publishError: null };
        } catch (error) {
          return { trip, publishError: error instanceof Error ? error.message : String(error) };
        }
      },
      addBooking: (stopId, booking) =>
        updateStops((stops) =>
          stops.map((s) =>
            s.id === stopId
              ? { ...s, bookings: [...(s.bookings ?? []), { ...booking, id: Crypto.randomUUID() }].sort((a, b) => a.start.localeCompare(b.start)) }
              : s,
          ),
        ),
      removeBooking: (stopId, bookingId) =>
        updateStops((stops) => stops.map((s) => (s.id === stopId ? { ...s, bookings: (s.bookings ?? []).filter((b) => b.id !== bookingId) } : s))),
      recordGoogleEvents: (tripId, ids) => {
        const s = latest.current;
        commit({
          ...s,
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : {
                  ...t,
                  stops: t.stops.map((stop) => ({
                    ...stop,
                    googleEventId: ids.stops[stop.id] ?? stop.googleEventId,
                    bookings: stop.bookings?.map((b) => ({ ...b, googleEventId: ids.bookings[b.id] ?? b.googleEventId })),
                  })),
                },
          ),
        });
      },
      assembleFromNotes: (nodes) => {
        const s = latest.current;
        const trip = tripFromNotes(nodes, ctx, accommodationFor(profile.hikingStyle));
        commit({ ...s, trips: [trip, ...s.trips.filter((t) => t.stops.length > 0 || t.id !== s.activeTripId)], activeTripId: trip.id });
        return trip;
      },
      scatterFromNotes: (nodes) => {
        const s = latest.current;
        const spots = spotsFromNotes(nodes);
        commit({ ...s, spots: [...spots, ...s.spots] });
        return spots;
      },
      mirrorTrip: (trip) => {
        const s = latest.current;
        commit({ ...s, trips: [{ ...trip, mirroredFrom: trip.id }, ...s.trips.filter((t) => t.id !== trip.id)] });
      },
    };
  }, [state, commit, updateStops, ctx, profile, syncStatus]);

  return <TripsContext value={value}>{children}</TripsContext>;
}

export function useTrips(): TripsContextValue {
  const context = use(TripsContext);
  if (!context) throw new Error('useTrips must be used inside <TripsProvider>');
  return context;
}
