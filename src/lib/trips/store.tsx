import { createContext, type ReactNode, use, useCallback, useMemo, useRef, useState } from 'react';

import { generateTailoredItinerary, routingFromProfile } from '@/lib/logistics/tailoredEngine';
import { useProfile } from '@/lib/profile/ProfileContext';
import type { ScanResponse } from '@/lib/scanner/schema';
import type { LifestyleSpot, SpotAction, SpotActionResult } from '@/lib/spots/types';
import { applySpotAction, newTrip, rechain, type TripsState } from '@/lib/trips/itinerary';
import { publishTrip } from '@/lib/trips/repository';
import type { AccommodationType, Trip, TripStop } from '@/lib/trips/types';

// In-memory for now. Swap the useState below for expo-sqlite/kv-store
// (or Supabase Auth + a per-user table) to keep trips across launches.

type State = TripsState & { spots: LifestyleSpot[] };

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
};

const TripsContext = createContext<TripsContextValue | null>(null);

function initialState(): State {
  const trip = newTrip();
  return { trips: [trip], activeTripId: trip.id, spots: [] };
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  // Mirror of the latest state so runSpotAction can return its result
  // synchronously. Every update goes through commit(), which keeps it current.
  const latest = useRef(state);
  const { profile } = useProfile();
  // Trips leave from the profile's base and name its rail cards.
  const ctx = useMemo(() => routingFromProfile(profile), [profile]);

  const commit = useCallback((next: State) => {
    latest.current = next;
    setState(next);
  }, []);

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
        const trip = s.trips.find((t) => t.id === s.activeTripId)!;
        try {
          await publishTrip(trip);
          return { trip, publishError: null };
        } catch (error) {
          return { trip, publishError: error instanceof Error ? error.message : String(error) };
        }
      },
      mirrorTrip: (trip) => {
        const s = latest.current;
        commit({ ...s, trips: [{ ...trip, mirroredFrom: trip.id }, ...s.trips.filter((t) => t.id !== trip.id)] });
      },
    };
  }, [state, commit, updateStops, ctx, profile]);

  return <TripsContext value={value}>{children}</TripsContext>;
}

export function useTrips(): TripsContextValue {
  const context = use(TripsContext);
  if (!context) throw new Error('useTrips must be used inside <TripsProvider>');
  return context;
}
