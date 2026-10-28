// Tailored logistics, computed on the device.
//
// The vision model is only trusted for what it can see: which place a
// screenshot shows and whether it's a city or an alpine trip. It is validated
// against TripScanSchema before reaching this file. Everything after that
// (routes, booking links, packing lists, accommodation) comes from this
// file's rules plus the user's profile. The model cannot invent a hostel, a
// fare or a gear item here, because nothing it writes is copied into those
// fields.

import { resolveBase } from '@/lib/logistics/passes';
import type { RoutingContext } from '@/lib/logistics/routing';
import type { HikingStyle, UserProfile } from '@/lib/profile/ProfileContext';
import type { ScanResponse } from '@/lib/scanner/schema';
import { buildPackGrid, type DailyForecast, type PackGroup } from '@/lib/trips/alpine';
import { stopFromScan } from '@/lib/trips/itinerary';
import type { AccommodationType, TripStop } from '@/lib/trips/types';

export type TailoredItinerary = {
  /** Ready to add to a trip. Its logistics already reflect the profile. */
  stop: TripStop;
  /** Packing grid for alpine stops with owned gear removed; null for city stops. */
  packing: PackGroup[] | null;
  /** Items left off the packing grid because the user owns them. */
  skippedGear: string[];
  /** What the profile changed, in plain words, for a "why am I seeing this" line. */
  appliedRules: string[];
};

export const accommodationFor = (style: HikingStyle): AccommodationType => (style === 'WILD_CAMPING' ? 'tent' : 'hut');

export function routingFromProfile(profile: UserProfile): RoutingContext {
  return { origin: resolveBase(profile.baseLocation), passes: profile.transitPasses };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Removes items the user already owns. Matching is by whole word on the
 * owned keyword, so owning a "stove" removes "Stove" but keeps "Gas canister".
 * Groups that end up empty are dropped.
 */
export function subtractOwnedGear(groups: PackGroup[], inventory: readonly string[]): { groups: PackGroup[]; skipped: string[] } {
  const patterns = inventory.filter(Boolean).map((g) => new RegExp(`\\b${escapeRegExp(g)}\\b`, 'i'));
  const skipped: string[] = [];
  const kept = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const owned = patterns.some((p) => p.test(item));
        if (owned) skipped.push(item);
        return !owned;
      }),
    }))
    .filter((group) => group.items.length > 0);
  return { groups: kept, skipped };
}

/** The packing grid for an alpine stop, tailored to the profile. `forecast` may be empty. */
export function tailoredPackGrid(stop: TripStop, profile: UserProfile, forecast: DailyForecast[] = []) {
  return subtractOwnedGear(buildPackGrid(stop.accommodation ?? 'hut', forecast, stop.nights), profile.gearInventory);
}

/**
 * Turns a validated scan into a stop shaped by the user's profile:
 * - trips start from the profile's base location
 * - alpine stops use the profile's hiking style; with WILD_CAMPING every
 *   lodging link is removed and a camping checklist (minus owned gear) is built
 * - rail links name the user's SNCF or Eurail card (see logistics/passes.ts)
 */
export function generateTailoredItinerary(scanned: ScanResponse, profile: UserProfile): TailoredItinerary {
  const ctx = routingFromProfile(profile);
  const alpine = scanned.scan.tripType === 'alpine_backpacking';
  const accommodation = accommodationFor(profile.hikingStyle);
  const appliedRules: string[] = [`Routes start from ${ctx.origin.name}`];

  let stop = stopFromScan(scanned, accommodation, ctx);
  let packing: PackGroup[] | null = null;
  let skippedGear: string[] = [];

  if (alpine) {
    if (accommodation === 'tent') {
      // Belt and braces: tent logistics never include lodging, and this guarantees it.
      stop = { ...stop, logistics: { ...stop.logistics, links: stop.logistics.links.filter((l) => l.kind !== 'lodging') } };
      appliedRules.push('Wild camping: no hotels or huts, transit to the trailhead first');
    } else {
      appliedRules.push('Hut trip: drive or carpool, hut booking included');
    }
    const tailored = tailoredPackGrid(stop, profile);
    packing = tailored.groups;
    skippedGear = tailored.skipped;
    if (skippedGear.length) appliedRules.push(`Left off ${skippedGear.length} item${skippedGear.length === 1 ? '' : 's'} you already own`);
  }

  if (!alpine && profile.transitPasses.includes('SNCF_AVANTAGE_JEUNE')) appliedRules.push('Rail links remind you to add your Carte Avantage Jeune');
  if (!alpine && profile.transitPasses.includes('EURAIL')) appliedRules.push('Eurail: check seat reservations');

  return { stop, packing, skippedGear, appliedRules };
}
