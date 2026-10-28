// The user's base identity and scrapbook numbers, saved on the device.
// iOS/Android use expo-secure-store (the profile is a few hundred bytes, well
// under its ~2 KB comfort zone); web falls back to localStorage. Everything
// read back is validated, so a corrupted value falls back to defaults field
// by field instead of crashing the app.

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

export const HUBS = ['LYON', 'VANCOUVER'] as const;
export const TRANSIT_PASSES = ['SNCF_AVANTAGE_JEUNE', 'EURAIL', 'NONE'] as const;
export const HIKING_STYLES = ['WILD_CAMPING', 'REFUGE_HUT'] as const;
/** How your places are drawn on the imprint map: silk ribbons, tree rings, cells or canopy. */
export const IMPRINT_PATTERNS = ['silk', 'rings', 'cells', 'canopy'] as const;

export type Hub = (typeof HUBS)[number];
export type TransitPass = (typeof TRANSIT_PASSES)[number];
export type HikingStyle = (typeof HIKING_STYLES)[number];
export type ImprintPattern = (typeof IMPRINT_PATTERNS)[number];

/** How each hub is shown, and the "City, Region" string the router resolves to a station. */
export const HUB_INFO: Record<Hub, { label: string; station: string; flag: string; location: string }> = {
  LYON: { label: 'Lyon', station: 'Part-Dieu', flag: '🇫🇷', location: 'Lyon, France' },
  VANCOUVER: { label: 'Vancouver', station: 'YVR', flag: '🇨🇦', location: 'Vancouver, BC' },
};

/** Twelve monthly values, January first, for the season charts. */
export type MonthSeries = number[];

export type SeasonStats = {
  year: number;
  hikes: MonthSeries;
  distanceKm: MonthSeries;
  hutNights: MonthSeries;
  nightsOut: MonthSeries;
};

export interface UserProfile {
  /** Where you live now. Trips start from here unless you're planning ahead. */
  homeHub: Hub;
  /** The exchange you're getting ready for, e.g. Lyon while you're still in Vancouver. */
  nextHub: Hub | null;
  /** Which hub new plans start from: today's home, or the next exchange. */
  planningFor: 'home' | 'next';
  /** Rail cards held. 'NONE' only appears alone. */
  transitPasses: TransitPass[];
  /** Default for alpine legs; each leg can still be switched. */
  hikingStyle: HikingStyle;
  /** Gear already owned, as lowercase keywords ("tent", "stove", "water filter"). Removed from packing lists. */
  gearInventory: string[];
  /** Nights the user is into: 'techno', 'indie', 'nature'… */
  lifestyleVibes: string[];
  /** Set when the Homebase onboarding is finished. */
  onboardedAt: string | null;
  /** The pattern your imprint map is drawn in, for you and for friends who open your trips. */
  imprintPattern: ImprintPattern;
  /** Scrapbook counters ("3 trips · 61 photos") and the season charts. Kept up to date from your trips. */
  stats: { completedTrips: number; photos: number; season: SeasonStats };
}

const zeros = (): MonthSeries => Array.from({ length: 12 }, () => 0);

export const emptySeason = (year = new Date().getFullYear()): SeasonStats => ({
  year,
  hikes: zeros(),
  distanceKm: zeros(),
  hutNights: zeros(),
  nightsOut: zeros(),
});

export const DEFAULT_PROFILE: UserProfile = {
  homeHub: 'LYON',
  nextHub: null,
  planningFor: 'home',
  transitPasses: ['NONE'],
  hikingStyle: 'REFUGE_HUT',
  gearInventory: [],
  lifestyleVibes: [],
  onboardedAt: null,
  imprintPattern: 'silk',
  stats: { completedTrips: 0, photos: 0, season: emptySeason() },
};

const Month = z.array(z.number().nonnegative()).length(12);

const ProfileSchema = z.object({
  homeHub: z.enum(HUBS).catch(DEFAULT_PROFILE.homeHub),
  nextHub: z.enum(HUBS).nullable().catch(null),
  planningFor: z.enum(['home', 'next']).catch('home'),
  transitPasses: z.array(z.enum(TRANSIT_PASSES)).min(1).catch(DEFAULT_PROFILE.transitPasses),
  hikingStyle: z.enum(HIKING_STYLES).catch(DEFAULT_PROFILE.hikingStyle),
  gearInventory: z.array(z.string()).catch([]),
  lifestyleVibes: z.array(z.string()).catch([]),
  onboardedAt: z.string().nullable().catch(null),
  imprintPattern: z.enum(IMPRINT_PATTERNS).catch('silk'),
  stats: z
    .object({
      completedTrips: z.number().int().nonnegative(),
      photos: z.number().int().nonnegative(),
      season: z.object({ year: z.number().int(), hikes: Month, distanceKm: Month, hutNights: Month, nightsOut: Month }),
    })
    .catch(DEFAULT_PROFILE.stats),
});

/** Keeps 'NONE' exclusive, gear lowercase and unique, and the next hub different from home. */
export function normalizeProfile(profile: UserProfile): UserProfile {
  const passes = profile.transitPasses.filter((p) => p !== 'NONE');
  const nextHub = profile.nextHub === profile.homeHub ? null : profile.nextHub;
  return {
    ...profile,
    nextHub,
    planningFor: nextHub ? profile.planningFor : 'home',
    transitPasses: passes.length ? [...new Set(passes)] : ['NONE'],
    gearInventory: [...new Set(profile.gearInventory.map((g) => g.trim().toLowerCase()).filter(Boolean))],
    lifestyleVibes: [...new Set(profile.lifestyleVibes.map((v) => v.trim().toLowerCase()).filter(Boolean))],
  };
}

/** The hub new plans start from right now. */
export const activeHub = (p: UserProfile): Hub => (p.planningFor === 'next' && p.nextHub ? p.nextHub : p.homeHub);

const STORAGE_KEY = 'ndtm.profile.v2';

export async function loadProfile(): Promise<UserProfile | null> {
  let raw: string | null = null;
  try {
    raw = Platform.OS === 'web' ? (globalThis.localStorage?.getItem(STORAGE_KEY) ?? null) : await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = ProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? normalizeProfile(parsed.data) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const raw = JSON.stringify(profile);
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, raw);
    } catch {
      // Private mode or blocked storage: keep the profile in memory only.
    }
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, raw);
}
