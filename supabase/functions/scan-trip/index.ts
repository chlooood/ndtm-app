// scan-trip: Claude vision worker.
//
//   POST { storagePath }  ->  ScanResponse
//
// 1. Downloads the uploaded screenshot from the private `scans` bucket.
// 2. Asks Claude to read overlays, captions and landmarks and fill the
//    VisionExtraction schema (structured outputs, so the JSON is guaranteed).
// 3. Re-geocodes the destination with Google Places when a key is configured.
// 4. Validates the strict public TripScan payload before returning it.
//
// Secrets: ANTHROPIC_API_KEY (required), GOOGLE_PLACES_API_KEY (optional).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { encodeBase64 } from '@std/encoding/base64';
import { createClient } from '@supabase/supabase-js';

import {
  ScanRequestSchema,
  type ScanResponse,
  TripScanSchema,
  type VisionExtraction,
  VisionExtractionSchema,
} from '../_shared/tripScan.ts';

const SCANS_BUCKET = 'scans';
// The Messages API caps a base64 image at 5 MB.
const MAX_IMAGE_BYTES = Math.floor((5 * 1024 * 1024 * 3) / 4);
const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You turn travel inspiration screenshots into trip destinations for exchange students based in Lyon, France.

The image is usually a screenshot of an Instagram post or Reel, a TikTok freeze-frame, a Reddit thread, a YouTube video, a hiking blog, or a trail app such as AllTrails. Read every text overlay, caption, hashtag, location tag and sign, and look at the landmarks themselves.

Fill the schema as follows:
- destinationName: the specific place the person wants to go (a hut, lake, trail, neighbourhood or club district), not just the country. Prefer the name written in the image.
- estimatedLocation: your best coordinates for that place, and region as "Area, Country" (for example "Haute-Savoie, France" or "Squamish-Lillooet, Canada").
- tripType: "alpine_backpacking" when the trip involves trails, mountain huts or refuges, trailheads, glaciers, summits, multi-day hikes or backcountry camping. Otherwise "city", which also covers nightlife, food and culture trips.
- extractedContext: the useful text you read (overlays, caption, hut names, distances, elevation, dates, prices), condensed into one or two sentences. Use an empty string if there is none.
- sourcePlatform: judge from the interface chrome (TikTok's right-hand action rail, Instagram's Reel or post layout, Reddit's vote arrows, YouTube's player). Use "unknown" for blogs, trail apps, plain photos or when unsure.
- placesQuery: the text query most likely to find this exact place in Google Places, including the park, town or region.
- keywords: short lowercase words from the image that matter for planning, such as "hiking", "huts", "refuge", "via ferrata", "tgv", "techno", "rooftop".
- venueCategory: when the image is about one specific place rather than a whole destination, its category; otherwise "none". A club night in Ibiza is "club"; a beach day at Barceloneta is "beach"; a bouchon in Lyon is "restaurant"; the Pont du Gard is "monument"; a lavender farm is "farm"; the Jardin Majorelle is "garden"; a famous viewpoint, square or building is "landmark".
- venueCity: the city the venue is in, such as "Barcelona". Use an empty string when venueCategory is "none".

If the image shows no identifiable destination, still answer: give the most likely place and say in extractedContext that the location is a guess.`;

const anthropic = new Anthropic();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const parsedBody = ScanRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return json({ error: 'Body must be { storagePath: string }' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: blob, error: downloadError } = await admin.storage
    .from(SCANS_BUCKET)
    .download(parsedBody.data.storagePath);
  if (downloadError || !blob) return json({ error: 'Screenshot not found' }, 404);

  const mediaType = blob.type as SupportedMediaType;
  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
    return json({ error: `Unsupported image type ${blob.type || 'unknown'}` }, 415);
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) return json({ error: 'Image is larger than 5 MB' }, 413);

  let extraction: VisionExtraction;
  try {
    extraction = await extractWithClaude(encodeBase64(bytes), mediaType);
  } catch (error) {
    if (error instanceof RefusedError) return json({ error: error.message }, 422);
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Vision engine is busy, try again' }, 429);
    if (error instanceof Anthropic.APIError) {
      console.error('Claude API error', error.status, error.message);
      return json({ error: 'Vision engine failed' }, 502);
    }
    console.error(error);
    return json({ error: 'Could not read the screenshot' }, 500);
  }

  const place = await geocodeWithPlaces(extraction.placesQuery || extraction.destinationName);

  const scan = TripScanSchema.safeParse({
    destinationName: extraction.destinationName,
    estimatedLocation: {
      lat: place?.lat ?? extraction.estimatedLocation.lat,
      lng: place?.lng ?? extraction.estimatedLocation.lng,
      region: extraction.estimatedLocation.region,
    },
    tripType: extraction.tripType,
    extractedContext: extraction.extractedContext,
    sourcePlatform: extraction.sourcePlatform,
  });
  if (!scan.success) {
    console.error('Invalid scan payload', scan.error.issues);
    return json({ error: 'Vision engine returned an invalid location' }, 502);
  }

  const response: ScanResponse = {
    scan: scan.data,
    meta: {
      keywords: extraction.keywords,
      geocoded: place !== null,
      placeId: place?.placeId ?? null,
      venue:
        extraction.venueCategory === 'none'
          ? null
          : { category: extraction.venueCategory, city: extraction.venueCity || extraction.destinationName },
    },
  };
  return json(response, 200);
});

class RefusedError extends Error {}

async function extractWithClaude(base64: string, mediaType: SupportedMediaType): Promise<VisionExtraction> {
  const message = await anthropic.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    // On a safety decline, re-run on Anthropic's recommended fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'medium',
      format: zodOutputFormat(VisionExtractionSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Where does this screenshot want me to go?' },
        ],
      },
    ],
  });

  if (message.stop_reason === 'refusal') throw new RefusedError('This image could not be scanned');
  if (message.stop_reason === 'max_tokens') throw new Error('Vision response was truncated');

  const text = message.content.find((block) => block.type === 'text');
  if (!text || text.type !== 'text') throw new Error('Vision response had no text block');
  return VisionExtractionSchema.parse(JSON.parse(text.text));
}

type PlaceMatch = { lat: number; lng: number; placeId: string };

/** Google Places (New) Text Search. Returns null when unconfigured or no match. */
async function geocodeWithPlaces(query: string): Promise<PlaceMatch | null> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey || !query) return null;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.location',
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });
  if (!res.ok) {
    console.error('Places lookup failed', res.status, await res.text());
    return null;
  }

  const body = (await res.json()) as {
    places?: { id: string; location?: { latitude: number; longitude: number } }[];
  };
  const top = body.places?.[0];
  if (!top?.location) return null;
  return { lat: top.location.latitude, lng: top.location.longitude, placeId: top.id };
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
