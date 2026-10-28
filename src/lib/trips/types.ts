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

export type BookingKind = 'stay' | 'transport' | 'activity';
export type TransportMode = 'train' | 'flight' | 'bus' | 'car' | 'ferry';

/**
 * Something already booked on an external site: a hostel, a train, a hut, a
 * tour. ndtm never takes payment; it keeps the details in one place and
 * writes them into the calendar.
 */
export type Booking = {
  id: string;
  kind: BookingKind;
  /** "Generator Barcelona", "TGV 6201 Lyon → Paris", "Refuge du Lac Blanc". */
  title: string;
  provider?: string;
  transportMode?: TransportMode;
  /** Local date-time, "YYYY-MM-DDTHH:MM". Check-in time for stays, departure for transport. */
  start: string;
  /** Check-out or arrival, same format. */
  end?: string;
  confirmation?: string;
  address?: string;
  url?: string;
  /** Local URI of a photo: the room, the hut, the ticket. */
  imageUri?: string;
  /** Set once a timed event for this booking exists in Google Calendar. */
  googleEventId?: string;
};

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
  /** Hostels, trains, huts and tours booked for this leg. */
  bookings?: Booking[];
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
  /** The sharer's imprint pattern, so friends see the trip drawn their way. */
  imprintPattern?: 'silk' | 'rings' | 'cells' | 'canopy';
};
