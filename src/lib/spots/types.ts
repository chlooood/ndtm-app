import type { SourcePlatform, VenueCategory } from '@/lib/scanner/schema';
import type { ClockTime, PlaceRef, Trip } from '@/lib/trips/types';

export { VENUE_CATEGORIES, type VenueCategory } from '@/lib/scanner/schema';

/** The Night out tab groups its spots under three headings. */
export const NIGHT_GROUPS = {
  clubs: ['club', 'bar'],
  beaches: ['beach'],
  restaurants: ['restaurant', 'cafe'],
} as const satisfies Record<string, readonly VenueCategory[]>;

/** The Stroll around tab: daytime places to wander to. */
export const STROLL_GROUPS = {
  landmarks: ['landmark'],
  farms: ['farm'],
  gardens: ['garden'],
  monuments: ['monument'],
} as const satisfies Record<string, readonly VenueCategory[]>;

export type NightGroup = keyof typeof NIGHT_GROUPS;
export type StrollGroup = keyof typeof STROLL_GROUPS;

export const NIGHT_CATEGORIES = ['club', 'bar', 'beach', 'restaurant', 'cafe'] as const satisfies readonly VenueCategory[];
export const STROLL_CATEGORIES = ['landmark', 'farm', 'garden', 'monument'] as const satisfies readonly VenueCategory[];

export const VENUE_LABEL: Record<VenueCategory, string> = {
  club: 'Club',
  bar: 'Bar',
  beach: 'Beach',
  restaurant: 'Restaurant',
  cafe: 'Café',
  landmark: 'Landmark',
  farm: 'Farm',
  garden: 'Garden',
  monument: 'Monument',
};

/** Whether a spot belongs on Stroll around rather than Night out. */
export const isStrollCategory = (c: VenueCategory) => (STROLL_CATEGORIES as readonly VenueCategory[]).includes(c);

/** A club, beach or restaurant the user scanned or typed in. */
export type LifestyleSpot = {
  id: string;
  name: string;
  category: VenueCategory;
  /** City name, e.g. "Ibiza" or "Lyon". Used to build a new trip around the spot. */
  city: string;
  place: PlaceRef;
  source: { type: 'scan'; platform: SourcePlatform; context: string } | { type: 'manual' };
  createdAt: string;
};

/** What the user typed into the Night out form. */
export type ManualSpotInput = {
  name: string;
  category: VenueCategory;
  city: string;
};

/**
 * The three quick actions offered after a spot is scanned or typed in.
 * Each carries exactly the inputs it needs, so a reducer can apply it
 * without looking anything else up.
 */
export type SpotAction =
  | {
      /** [ + Start New Trip ]: a fresh weekend container around the spot's city. */
      type: 'start_new_trip';
      spot: LifestyleSpot;
      startDate: string;
      nights: number;
      /** Optional first slot, so the spot itself appears in the new itinerary. */
      firstSlot?: { date: string; time: ClockTime };
    }
  | {
      /** [ + Add to Active Trip ]: stacks the venue into the live itinerary as a timed node. */
      type: 'add_to_active_trip';
      spot: LifestyleSpot;
      tripId: string;
      date: string;
      time: ClockTime;
    }
  | {
      /** [ + Save as Note ]: appends "11:00 PM: Go to Razzmatazz" to that day's calendar description. */
      type: 'append_note';
      spot: LifestyleSpot;
      tripId: string;
      date: string;
      time: ClockTime;
      /** The exact line to append. Defaults to "<time>: Go to <name>". */
      text: string;
    };

export type SpotActionType = SpotAction['type'];

/** What applying a SpotAction did, for the confirmation toast and navigation. */
export type SpotActionResult =
  | { ok: true; type: SpotActionType; trip: Trip; stopId: string; itemId: string }
  | { ok: false; type: SpotActionType; reason: 'no_active_trip' | 'date_outside_trip' };
