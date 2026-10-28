// Pure itinerary logic: building stops, stacking venues and notes, and
// applying the Night out quick actions. No React here, so it is easy to test.

import * as Crypto from 'expo-crypto';

import { addDays, daysBetween as daysApart, formatClock, nextFriday, stopDays } from '@/lib/dates';
import { DEFAULT_ROUTING, planLogistics, type RoutingContext } from '@/lib/logistics/routing';
import type { ScanResponse } from '@/lib/scanner/schema';
import type { ParsedNoteNode } from '@/lib/scanner/textIngest';
import type { LifestyleSpot, ManualSpotInput, SpotAction, SpotActionResult } from '@/lib/spots/types';
import type { AccommodationType, ClockTime, PlaceRef, TimelineItem, Trip, TripStop } from '@/lib/trips/types';

const DEFAULT_NIGHTS = 2;

export function newTrip(title = 'Untitled escape'): Trip {
  return { id: Crypto.randomUUID(), title, stops: [], createdAt: new Date().toISOString() };
}

export function stopFromScan(
  response: ScanResponse,
  accommodation: AccommodationType = 'hut',
  ctx: RoutingContext = DEFAULT_ROUTING,
): TripStop {
  const { scan } = response;
  const alpine = scan.tripType === 'alpine_backpacking';
  const place: PlaceRef = { name: scan.destinationName, ...scan.estimatedLocation };
  return {
    id: Crypto.randomUUID(),
    kind: alpine ? 'alpine' : 'city',
    place,
    scan,
    startDate: nextFriday(),
    nights: DEFAULT_NIGHTS,
    accommodation: alpine ? accommodation : undefined,
    logistics: planLogistics({ kind: alpine ? 'alpine' : 'city', place, accommodation }, ctx),
    timeline: [],
  };
}

/** A city weekend built around a venue's city. */
function stopForSpot(spot: LifestyleSpot, startDate: string, nights: number, ctx: RoutingContext): TripStop {
  const place: PlaceRef = { name: spot.city, region: spot.place.region };
  return {
    id: Crypto.randomUUID(),
    kind: 'city',
    place,
    startDate,
    nights,
    logistics: planLogistics({ kind: 'city', place }, ctx),
    timeline: [],
  };
}

/** Re-chains dates and logistics so each stop starts when the previous one ends, and departs from it. */
export function rechain(stops: TripStop[], ctx: RoutingContext = DEFAULT_ROUTING): TripStop[] {
  let origin: PlaceRef = ctx.origin;
  let startDate = stops[0]?.startDate ?? nextFriday();
  return stops.map((stop) => {
    // When a stop moves, its venues and notes move with it. If it gets shorter,
    // items on the lost days land on its last day instead of disappearing.
    const shift = daysBetween(stop.startDate, startDate);
    const lastDay = addDays(startDate, stop.nights);
    const timeline = stop.timeline.map((item) => {
      const moved = addDays(item.date, shift);
      return { ...item, date: moved > lastDay ? lastDay : moved };
    });
    const next: TripStop = {
      ...stop,
      startDate,
      logistics: planLogistics(stop, { ...ctx, origin }),
      timeline: timeline.reduce<TimelineItem[]>(insertTimelineItem, []),
    };
    origin = stop.place;
    startDate = addDays(startDate, stop.nights);
    return next;
  });
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Every day of the trip, in order, with the stop that owns it. */
export function tripDays(trip: Trip): { date: string; stop: TripStop }[] {
  const out: { date: string; stop: TripStop }[] = [];
  for (const stop of trip.stops) {
    for (const date of stopDays(stop.startDate, stop.nights)) {
      // A changeover day belongs to the stop you arrive at, so skip the previous stop's last day.
      if (out.at(-1)?.date === date) out.pop();
      out.push({ date, stop });
    }
  }
  return out;
}

export function stopForDate(trip: Trip, date: string): TripStop | undefined {
  return tripDays(trip).find((d) => d.date === date)?.stop;
}

// Nights out run past midnight: 01:00 belongs after 23:00 on the same day.
const NIGHT_ROLLOVER_HOUR = 6;
const sortKey = (item: TimelineItem) => {
  const [h, m] = item.time.split(':').map(Number);
  return `${item.date} ${String((h < NIGHT_ROLLOVER_HOUR ? h + 24 : h) * 60 + m).padStart(4, '0')}`;
};

export function insertTimelineItem(items: TimelineItem[], item: TimelineItem): TimelineItem[] {
  return [...items, item].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

export function defaultNoteText(spot: LifestyleSpot, time: string): string {
  return `${formatClock(time)}: Go to ${spot.name}`;
}

export function spotFromScan(response: ScanResponse): LifestyleSpot | null {
  const { scan, meta } = response;
  if (!meta.venue) return null;
  return {
    id: Crypto.randomUUID(),
    name: scan.destinationName,
    category: meta.venue.category,
    city: meta.venue.city,
    place: { name: scan.destinationName, ...scan.estimatedLocation },
    source: { type: 'scan', platform: scan.sourcePlatform, context: scan.extractedContext },
    createdAt: new Date().toISOString(),
  };
}

export function spotFromManual(input: ManualSpotInput): LifestyleSpot {
  const city = input.city.trim();
  return {
    id: Crypto.randomUUID(),
    name: input.name.trim(),
    category: input.category,
    city,
    place: { name: input.name.trim(), region: city },
    source: { type: 'manual' },
    createdAt: new Date().toISOString(),
  };
}

export type TripsState = { trips: Trip[]; activeTripId: string };

const replaceTrip = (trips: Trip[], trip: Trip) => trips.map((t) => (t.id === trip.id ? trip : t));

/** Applies one of the three quick actions. Returns the new state and what happened. */
export function applySpotAction(
  state: TripsState,
  action: SpotAction,
  ctx: RoutingContext = DEFAULT_ROUTING,
): { state: TripsState; result: SpotActionResult } {
  if (action.type === 'start_new_trip') {
    const stop = stopForSpot(action.spot, action.startDate, action.nights, ctx);
    const itemId = Crypto.randomUUID();
    if (action.firstSlot) {
      stop.timeline = [venueNode(itemId, action.spot, action.firstSlot.date, action.firstSlot.time)];
    }
    const trip: Trip = { ...newTrip(`${action.spot.city} weekend`), stops: rechain([stop], ctx) };
    return {
      state: { trips: [trip, ...state.trips], activeTripId: trip.id },
      result: { ok: true, type: action.type, trip, stopId: stop.id, itemId },
    };
  }

  const trip = state.trips.find((t) => t.id === action.tripId);
  if (!trip || trip.stops.length === 0) return { state, result: { ok: false, type: action.type, reason: 'no_active_trip' } };
  const stop = stopForDate(trip, action.date);
  if (!stop) return { state, result: { ok: false, type: action.type, reason: 'date_outside_trip' } };

  const itemId = Crypto.randomUUID();
  const item: TimelineItem =
    action.type === 'add_to_active_trip'
      ? venueNode(itemId, action.spot, action.date, action.time)
      : { kind: 'note', id: itemId, date: action.date, time: action.time, text: action.text.trim() || defaultNoteText(action.spot, action.time) };

  const updated: Trip = {
    ...trip,
    stops: trip.stops.map((s) => (s.id === stop.id ? { ...s, timeline: insertTimelineItem(s.timeline, item) } : s)),
  };
  return {
    state: { ...state, trips: replaceTrip(state.trips, updated) },
    result: { ok: true, type: action.type, trip: updated, stopId: stop.id, itemId },
  };
}

function venueNode(id: string, spot: LifestyleSpot, date: string, time: ClockTime): TimelineItem {
  return { kind: 'venue', id, spotId: spot.id, name: spot.name, category: spot.category, date, time };
}

/** A sensible default slot per category: clubs at 23:00, dinner at 20:00, gardens in the afternoon light. */
export function defaultTimeFor(category: LifestyleSpot['category']): ClockTime {
  return (
    {
      club: '23:00',
      bar: '21:00',
      beach: '13:00',
      restaurant: '20:00',
      cafe: '10:00',
      landmark: '10:00',
      farm: '11:00',
      garden: '15:00',
      monument: '10:30',
    } as const
  )[category];
}

/* ---------- Pasted notes ---------- */

const NOTE_CATEGORY: Record<ParsedNoteNode['activityType'], LifestyleSpot['category']> = {
  clubbing: 'club',
  beach: 'beach',
  restaurant: 'restaurant',
  alpine_backpacking: 'landmark',
  general: 'landmark',
};

/** [ 📌 Scatter ]: every place in the notes becomes its own spot, unattached to any trip. */
export function spotsFromNotes(nodes: ParsedNoteNode[]): LifestyleSpot[] {
  return nodes.map((n) => ({
    id: Crypto.randomUUID(),
    name: n.placeName,
    category: NOTE_CATEGORY[n.activityType],
    city: n.inferredRegion,
    place: { name: n.placeName, region: n.inferredRegion },
    source: { type: 'notes' },
    createdAt: new Date().toISOString(),
  }));
}

/**
 * [ 🔗 Assemble ]: chains the notes' cities into a trip, one leg per city in
 * the order they appear. Dates in the notes set each leg's start and length;
 * without dates a leg gets two nights. Each venue lands on its leg's timeline
 * at its date (or the leg's first day) and a sensible default time.
 */
export function tripFromNotes(nodes: ParsedNoteNode[], ctx: RoutingContext = DEFAULT_ROUTING, accommodation: AccommodationType = 'hut'): Trip {
  const groups: { region: string; nodes: ParsedNoteNode[] }[] = [];
  for (const n of nodes) {
    const key = n.inferredRegion.trim().toLowerCase();
    const g = groups.find((x) => x.region.trim().toLowerCase() === key);
    if (g) g.nodes.push(n);
    else groups.push({ region: n.inferredRegion.trim(), nodes: [n] });
  }
  const firstDate = (g: (typeof groups)[number]) => g.nodes.map((n) => n.inferredDate).filter(Boolean).sort()[0];

  const stops: TripStop[] = groups.map((g, i) => {
    const start = firstDate(g) ?? (i === 0 ? nextFriday() : undefined);
    const nextStart = groups[i + 1] ? firstDate(groups[i + 1]) : undefined;
    const lastDate = g.nodes.map((n) => n.inferredDate).filter(Boolean).sort().at(-1);
    const nights = start && nextStart ? Math.max(1, daysApart(start, nextStart)) : start && lastDate && lastDate > start ? daysApart(start, lastDate) + 1 : DEFAULT_NIGHTS;
    const alpine = g.nodes.some((n) => n.activityType === 'alpine_backpacking');
    const place: PlaceRef = { name: g.region, region: g.region };
    return {
      id: Crypto.randomUUID(),
      kind: alpine ? 'alpine' : 'city',
      place,
      startDate: start ?? nextFriday(),
      nights,
      accommodation: alpine ? accommodation : undefined,
      logistics: planLogistics({ kind: alpine ? 'alpine' : 'city', place, accommodation }, ctx),
      timeline: [],
    };
  });

  // Chain the dates, then drop each venue onto its leg.
  const chained = rechain(stops, ctx);
  chained.forEach((stop, i) => {
    const days = new Set(stopDays(stop.startDate, stop.nights));
    for (const n of groups[i].nodes) {
      if (n.placeName.trim().toLowerCase() === groups[i].region.trim().toLowerCase()) continue; // just the city
      const spot = spotsFromNotes([n])[0];
      const date = n.inferredDate && days.has(n.inferredDate) ? n.inferredDate : stop.startDate;
      stop.timeline = insertTimelineItem(stop.timeline, venueNode(Crypto.randomUUID(), spot, date, defaultTimeFor(spot.category)));
    }
  });

  return { ...newTrip(groups.map((g) => g.region).join(' → ')), stops: chained };
}
