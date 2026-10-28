# NDTM (Not Doing Too Much) // Dev Manifesto

## 🚨 Problem Statement
Planning spontaneous, student-budget weekend getaways and rugged reading break excursions from an exchange hub is an exhausting, multi-hour chore. 

While travel inspiration lives dynamically across fragmented social media networks (TikTok, Instagram, Reddit, YouTube), the actual logistical execution requires navigating a disjointed maze of tools. Exchange students are forced to manually cross-reference student rail pass constraints, flight aggregators, outdoor trail safety networks, and group availability. 

This friction creates immediate **planning burnout** and severe **decision fatigue**, causing students to either over-engineer their limited free time or abandon trips altogether. There is no lightweight, unified space that effortlessly bridges social media discovery with raw transit and itinerary execution.

## 🎯 Purpose & Core Mission
The sole purpose of **NDTM** is to completely **centralize booking workflows and travel itineraries** for individual exchange travelers and student groups, systematically eliminating logistical friction and decision fatigue. 

The application adheres to a zero-friction, minimalist design philosophy: **it does not handle payments, it does not build closed ecosystems, and it does not overcomplicate.** 

### How NDTM Neutralizes Decision Fatigue:
* **The "Zero-Tap" Input:** Converts loose media inspiration directly into actionable trip structures through raw image-to-trip screenshot parsing.
* **Context-Aware Adaptive Execution:** Instantly bifurcates planning modes. A clubbing weekend in Ibiza prompts hostel searches and drops nightlife sets directly into a timeline checklist. A backpacking trip in the mountains automatically triggers a wild camping gear grid and hides all irrelevant hotel clutter. Transit adapts to the region: in Europe it looks for trains and buses to the nearest trailhead first, while in North America (say, from Vancouver) it shifts straight to Google Maps driving routes.
* **Universal Plan Centralization:** Consolidates all final transit links, reservation deep-links, and daily activity timelines into a single, clean text string inside **Google Calendar**. 
* **Zero-Friction Group Syncing:** Bypasses tedious copy-pasting by using raw native deep-linking (`ndtm://`), allowing groups to mirror, edit, and adopt complex shared itineraries in a single click.

---

## Developer guide

Trip planner for exchange students in Lyon: screenshot a Reel, TikTok or trail page, get a destination with trains or driving already worked out, then share the itinerary with friends.

## Setup

```bash
npm install
cp .env.example .env.local        # fill in Supabase + Google values (below)
npx supabase link --project-ref <ref>
npx supabase db push              # tables, private buckets and owner-only policies
npx supabase secrets set ANTHROPIC_API_KEY=... GOOGLE_PLACES_API_KEY=...
npx supabase functions deploy scan-trip
npx supabase functions deploy parse-notes
npx expo start --web              # web works without a native build
```

`GOOGLE_PLACES_API_KEY` is optional. Without it, coordinates come from Claude alone and the result is tagged "Approximate".

### Google sign-in and Calendar

1. In Google Cloud, create a project, enable the **Google Calendar API**, and set up the OAuth consent screen with the `calendar.events` scope. While the app is in "Testing", add yourself as a test user; no Google review is needed for up to 100 test users.
2. Create OAuth client IDs: **Web** (its ID is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`), **iOS** (bundle `com.ndtm.app`; its ID is `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, its reversed ID is `GOOGLE_IOS_URL_SCHEME`) and **Android** (package `com.ndtm.app` plus your signing certificate's SHA-1).
3. In Supabase → Authentication → Providers → Google, paste the Web client ID and secret, and add the iOS and Android client IDs as authorized client IDs.
4. Native sign-in needs a development build, since Expo Go can't load it: `npx expo run:ios` / `npx expo run:android`, or `npx eas-cli build --profile development`.

## How a scan flows

1. `pickScanImage` (expo-image-picker) → `uploadScanImage` puts the file in Supabase Storage.
2. `parseTripFromImage` invokes `supabase/functions/scan-trip`, which sends the image to Claude (`claude-opus-5-5`, structured outputs) and re-geocodes with Google Places.
3. The response is validated against `TripScanSchema` (`supabase/functions/_shared/tripScan.ts`, shared by app and worker).
4. `lib/logistics/tailoredEngine.ts` turns it into a leg using your profile: city legs get rail and hostel links; alpine legs follow your hut or tent choice and region (transit to the trailhead in Europe, Google Maps driving in North America).

Pasted notes go through `supabase/functions/parse-notes` the same way, then become a chained trip or loose scrapbook cards.

### Your data

Trips and spots are saved on the device after every change. Once you sign in with Google, they also sync to your Supabase account (`user_trips` and `user_spots`), and booking and scan photos upload to the private `photos` bucket. Row-level security means only you can read or change your rows and files. Sign in on a second device or the web app and your trips merge in, with the newest edit to each trip winning. Photos on a trip you share stay private, so friends see the trip without them.

Share links look like `ndtm://trip/<id>` and open `src/app/trip/[id].tsx`, drawn in the sharer's imprint pattern.
