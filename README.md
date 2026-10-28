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
