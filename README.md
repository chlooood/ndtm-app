# ndtm

Trip planner for exchange students in Lyon: screenshot a Reel, TikTok or trail page, get a destination with trains or driving already worked out, then share the itinerary with friends.

## Setup

```bash
npm install
cp .env.example .env.local        # fill in your Supabase URL + anon key
npx supabase link --project-ref <ref>
npx supabase db push              # trips table + private `scans` bucket
npx supabase secrets set ANTHROPIC_API_KEY=... GOOGLE_PLACES_API_KEY=...
npx supabase functions deploy scan-trip
npx expo start
```

`GOOGLE_PLACES_API_KEY` is optional. Without it, coordinates come from Claude alone and the result is tagged "Approximate".

## How a scan flows

1. `pickScanImage` (expo-image-picker) → `uploadScanImage` puts the file in Supabase Storage.
2. `parseTripFromImage` invokes `supabase/functions/scan-trip`, which sends the image to Claude (`claude-opus-5-5`, structured outputs) and re-geocodes with Google Places.
3. The response is validated against `TripScanSchema` (`supabase/functions/_shared/tripScan.ts`, shared by app and worker).
4. `planLogistics` routes `city` trips to rail and hostel links; `alpine_backpacking` trips go through `flagTransitUnfeasible`, which uses Google Maps driving, BlaBlaCar and hut booking instead.

Share links look like `ndtm://trip/<id>` and open `src/app/trip/[id].tsx`.
