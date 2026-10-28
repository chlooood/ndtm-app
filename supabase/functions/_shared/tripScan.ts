// Single source of truth for the scan contract. Imported by the Expo app
// (src/lib/scanner/schema.ts) and by the scan-trip edge function, so the
// client and the worker can never disagree about the payload shape.
// Keep this file free of Deno- or React Native-specific imports.
import { z } from 'zod';

export const TRIP_TYPES = ['city', 'alpine_backpacking'] as const;
export const SOURCE_PLATFORMS = ['instagram', 'tiktok', 'reddit', 'youtube', 'unknown'] as const;

/**
 * Single places a scan can point at. Night out handles the first five;
 * Stroll around handles the rest. `none` means the scan is a whole
 * destination, not one place.
 */
export const VENUE_CATEGORIES = ['club', 'bar', 'beach', 'restaurant', 'cafe', 'landmark', 'farm', 'garden', 'monument'] as const;

export type TripType = (typeof TRIP_TYPES)[number];
export type VenueCategory = (typeof VENUE_CATEGORIES)[number];
export type SourcePlatform = (typeof SOURCE_PLATFORMS)[number];

/** The strict public payload the vision parser must produce. */
export const TripScanSchema = z
  .object({
    destinationName: z.string().min(1),
    estimatedLocation: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        region: z.string(),
      })
      .strict(),
    tripType: z.enum(TRIP_TYPES),
    extractedContext: z.string(),
    sourcePlatform: z.enum(SOURCE_PLATFORMS),
  })
  .strict();

export type TripScan = z.infer<typeof TripScanSchema>;

/**
 * What the model is asked to return: the public payload plus two working
 * fields the worker uses for geocoding. No numeric bounds here, because
 * structured outputs only accept a subset of JSON Schema; the bounds are
 * enforced afterwards by TripScanSchema.
 */
export const VisionExtractionSchema = z.object({
  destinationName: z.string(),
  estimatedLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    region: z.string(),
  }),
  tripType: z.enum(TRIP_TYPES),
  extractedContext: z.string(),
  sourcePlatform: z.enum(SOURCE_PLATFORMS),
  /** Best Google Places text query, e.g. "Elfin Lakes Shelter, Garibaldi Provincial Park". */
  placesQuery: z.string(),
  /** Trip-relevant words spotted in overlays or captions ("hiking", "TGV", "huts"). */
  keywords: z.array(z.string()),
  /** Set when the screenshot is about one venue (a club, beach, restaurant…) rather than a whole destination. */
  venueCategory: z.enum([...VENUE_CATEGORIES, 'none']),
  /** The city the venue is in, e.g. "Barcelona". Empty when venueCategory is "none". */
  venueCity: z.string(),
});

export type VisionExtraction = z.infer<typeof VisionExtractionSchema>;

/** Request body of the scan-trip edge function. */
export const ScanRequestSchema = z.object({
  /** Object path inside the `scans` storage bucket. */
  storagePath: z.string().min(1),
});

export type ScanRequest = z.infer<typeof ScanRequestSchema>;

/** Response body of the scan-trip edge function. */
export const ScanResponseSchema = z.object({
  scan: TripScanSchema,
  meta: z.object({
    keywords: z.array(z.string()),
    /** True when Google Places confirmed the coordinates. */
    geocoded: z.boolean(),
    placeId: z.string().nullable(),
    /** Present when the scan is a single venue, which the app offers to the Night out quick actions. */
    venue: z.object({ category: z.enum(VENUE_CATEGORIES), city: z.string() }).nullable(),
  }),
});

export type ScanResponse = z.infer<typeof ScanResponseSchema>;
