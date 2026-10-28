import * as Crypto from 'expo-crypto';
import { createContext, type ReactNode, use, useCallback, useMemo, useReducer } from 'react';

import { addDays, nextFriday } from '@/lib/dates';
import { LYON_PART_DIEU, planLogistics } from '@/lib/scanner/logistics';
import type { TripScan } from '@/lib/scanner/schema';
import { publishTrip } from '@/lib/trips/repository';
import type { Place, Trip, TripStop } from '@/lib/trips/types';

// In-memory for now. Swap the reducer's storage for expo-sqlite/kv-store
// (or Supabase Auth + a per-user table) to keep trips across launches.

type State = { draft: Trip; saved: Trip[] };

type Action =
  | { type: 'addStop'; scan: TripScan }
  | { type: 'setNights'; stopId: string; nights: number }
  | { type: 'removeStop'; stopId: string }
  | { type: 'renameDraft'; title: string }
  | { type: 'commitDraft' }
  | { type: 'saveTrip'; trip: Trip };

const DEFAULT_NIGHTS = 2;

function newDraft(): Trip {
  return { id: Crypto.randomUUID(), title: 'Untitled escape', stops: [], createdAt: new Date().toISOString() };
}

/** Re-chains dates and logistics so each stop departs from the previous one. */
function rechain(stops: TripStop[]): TripStop[] {
  let origin: Place = LYON_PART_DIEU;
  let startDate = stops[0]?.startDate ?? nextFriday();
  return stops.map((stop) => {
    const next = { ...stop, startDate, logistics: planLogistics(stop.scan, origin) };
    origin = { name: stop.scan.destinationName, ...stop.scan.estimatedLocation };
    startDate = addDays(startDate, stop.nights);
    return next;
  });
}

function reducer(state: State, action: Action): State {
  const { draft } = state;
  switch (action.type) {
    case 'addStop': {
      const stop: TripStop = {
        id: Crypto.randomUUID(),
        scan: action.scan,
        startDate: nextFriday(),
        nights: DEFAULT_NIGHTS,
        logistics: planLogistics(action.scan),
      };
      const title = draft.stops.length === 0 ? `${action.scan.destinationName} escape` : draft.title;
      return { ...state, draft: { ...draft, title, stops: rechain([...draft.stops, stop]) } };
    }
    case 'setNights': {
      const stops = draft.stops.map((s) =>
        s.id === action.stopId ? { ...s, nights: Math.min(30, Math.max(1, action.nights)) } : s,
      );
      return { ...state, draft: { ...draft, stops: rechain(stops) } };
    }
    case 'removeStop':
      return { ...state, draft: { ...draft, stops: rechain(draft.stops.filter((s) => s.id !== action.stopId)) } };
    case 'renameDraft':
      return { ...state, draft: { ...draft, title: action.title } };
    case 'commitDraft':
      return { draft: newDraft(), saved: [draft, ...state.saved] };
    case 'saveTrip':
      return { ...state, saved: [action.trip, ...state.saved.filter((t) => t.id !== action.trip.id)] };
  }
}

type TripsContextValue = State & {
  addStop: (scan: TripScan) => void;
  setNights: (stopId: string, nights: number) => void;
  removeStop: (stopId: string) => void;
  renameDraft: (title: string) => void;
  /** Saves the draft locally, then publishes it so its share link works. */
  saveDraft: () => Promise<{ trip: Trip; publishError: string | null }>;
  /** Copies a friend's shared trip into "My trips". */
  mirrorTrip: (trip: Trip) => void;
};

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ draft: newDraft(), saved: [] }));

  const saveDraft = useCallback(async () => {
    const trip = state.draft;
    dispatch({ type: 'commitDraft' });
    try {
      await publishTrip(trip);
      return { trip, publishError: null };
    } catch (error) {
      return { trip, publishError: error instanceof Error ? error.message : String(error) };
    }
  }, [state.draft]);

  const value = useMemo<TripsContextValue>(
    () => ({
      ...state,
      addStop: (scan) => dispatch({ type: 'addStop', scan }),
      setNights: (stopId, nights) => dispatch({ type: 'setNights', stopId, nights }),
      removeStop: (stopId) => dispatch({ type: 'removeStop', stopId }),
      renameDraft: (title) => dispatch({ type: 'renameDraft', title }),
      saveDraft,
      mirrorTrip: (trip) => dispatch({ type: 'saveTrip', trip: { ...trip, mirroredFrom: trip.id } }),
    }),
    [state, saveDraft],
  );

  return <TripsContext value={value}>{children}</TripsContext>;
}

export function useTrips(): TripsContextValue {
  const context = use(TripsContext);
  if (!context) throw new Error('useTrips must be used inside <TripsProvider>');
  return context;
}
