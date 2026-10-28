import type { TripScan, VenueCategory } from '@/lib/scanner/schema';

export type BookingLinkKind = 'transport' | 'lodging' | 'map' | 'activity';

/** An external booking page. ndtm never takes payments itself. */
export type BookingLink = {
  label: string;
  url: string;
  kind: BookingLinkKind;
};

/** A named place. Coordinates are optional because typed-in spots often have none yet. */
export type PlaceRef = {
  name: string;
  region: string;
  lat?: number;
  lng?: number;
};

/** Where you sleep on an alpine leg. Decides which logistics and packing list you get. */
export type AccommodationType = 'hut' | 'tent';

export type StopKind = 'city' | 'alpine';

/**
 * How to reach a stop. Built by planLogistics(); never stored by hand.
 * - rail: city trips, trains plus hostels.
 * - road: hut trips, where transit rarely reaches the trailhead, so drive or carpool plus hut booking.
 * - trailhead_transit: tent trips, public transit to the nearest reachable trailhead first and
 *   driving only as a fallback. Never includes lodging links.
 */
export type Logistics =
  | { mode: 'rail'; links: BookingLink[] }
  | { mode: 'road'; reason: string; links: BookingLink[] }
  | { mode: 'trailhead_transit'; reason: string; links: BookingLink[] };

/** 24-hour wall-clock time, "HH:MM". */
export type ClockTime = `${number}:${number}`;

/** A venue stacked into the itinerary sequence at a specific day and time. */
export type TimedNode = {
  kind: 'venue';
  id: string;
  spotId: string;
  name: string;
  category: VenueCategory;
  /** ISO date (YYYY-MM-DD) inside the stop's date range. */
  date: string;
  time: ClockTime;
};

/**
 * A line of text appended to the stop's Google Calendar event description,
 * e.g. "11:00 PM: Go to Razzmatazz" under Saturday. It does not create an
 * itinerary node.
 */
export type CalendarNote = {
  kind: 'note';
  id: string;
  date: string;
  time: ClockTime;
  text: string;
};

export type TimelineItem = TimedNode | CalendarNote;

/** One leg of a trip: a city weekend or an alpine route. */
export type TripStop = {
  id: string;
  kind: StopKind;
  place: PlaceRef;
  /** The scan this leg came from, if any. */
  scan?: TripScan;
  /** Local URI of the screenshot that was scanned, shown as a polaroid on Home. */
  sourceImageUri?: string;
  /** ISO calendar date (YYYY-MM-DD), inclusive. */
  startDate: string;
  /** Number of nights. The stop ends on startDate + nights. */
  nights: number;
  /** Only meaningful for alpine stops. */
  accommodation?: AccommodationType;
  logistics: Logistics;
  /** Venues and notes, kept sorted by date then time. */
  timeline: TimelineItem[];
  /** Set once the stop has been written to Google Calendar, so notes can be appended to it. */
  googleEventId?: string;
};

export type Trip = {
  id: string;
  title: string;
  stops: TripStop[];
  createdAt: string;
  /** Set when the trip was opened from a friend's share link. */
  mirroredFrom?: string;
};
