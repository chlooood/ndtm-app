import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { z } from 'zod';

// The user's travel context: where they leave from, which rail cards they
// hold, how they sleep in the mountains, what gear they own and what nights
// out they like. It never leaves the device, and the logistics engine reads
// it so plans are tailored by plain code, not by the AI.

export const TRANSIT_PASSES = ['SNCF_AVANTAGE_JEUNE', 'EURAIL', 'NONE'] as const;
export const HIKING_STYLES = ['WILD_CAMPING', 'REFUGE_HUT'] as const;

export type TransitPass = (typeof TRANSIT_PASSES)[number];
export type HikingStyle = (typeof HIKING_STYLES)[number];

export interface UserProfile {
  /** Exchange hub every trip starts from, e.g. "Lyon, France". */
  baseLocation: string;
  /** Rail cards held. 'NONE' only appears alone. */
  transitPasses: TransitPass[];
  /** Default for alpine legs; each leg can still be switched. */
  hikingStyle: HikingStyle;
  /** Gear already owned, as lowercase keywords ("tent", "stove", "water filter"). Removed from packing lists. */
  gearInventory: string[];
  /** Nights the user is into: 'techno', 'indie', 'nature'… */
  lifestyleVibes: string[];
}

export const DEFAULT_PROFILE: UserProfile = {
  baseLocation: 'Lyon, France',
  transitPasses: ['NONE'],
  hikingStyle: 'REFUGE_HUT',
  gearInventory: [],
  lifestyleVibes: [],
};

// Whatever is on disk is validated before use. A corrupted or outdated value
// falls back to defaults field by field instead of crashing the app.
const ProfileSchema = z.object({
  baseLocation: z.string().min(1).catch(DEFAULT_PROFILE.baseLocation),
  transitPasses: z.array(z.enum(TRANSIT_PASSES)).min(1).catch(DEFAULT_PROFILE.transitPasses),
  hikingStyle: z.enum(HIKING_STYLES).catch(DEFAULT_PROFILE.hikingStyle),
  gearInventory: z.array(z.string()).catch(DEFAULT_PROFILE.gearInventory),
  lifestyleVibes: z.array(z.string()).catch(DEFAULT_PROFILE.lifestyleVibes),
});

/** Keeps 'NONE' exclusive and gear keywords lowercase and unique. */
function normalize(profile: UserProfile): UserProfile {
  const passes = profile.transitPasses.filter((p) => p !== 'NONE');
  return {
    ...profile,
    transitPasses: passes.length ? [...new Set(passes)] : ['NONE'],
    gearInventory: [...new Set(profile.gearInventory.map((g) => g.trim().toLowerCase()).filter(Boolean))],
    lifestyleVibes: [...new Set(profile.lifestyleVibes.map((v) => v.trim().toLowerCase()).filter(Boolean))],
  };
}

// SecureStore is native-only, so web uses localStorage. The profile is small
// (well under SecureStore's ~2 KB comfort zone on older iOS).
const STORAGE_KEY = 'ndtm.profile.v1';
const storage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(STORAGE_KEY);
  },
  set: async (value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, value);
      } catch {
        // Private mode or blocked storage: keep the profile in memory only.
      }
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, value);
  },
};

type ProfileContextValue = {
  profile: UserProfile;
  /** False until the stored profile has been read; the defaults are used meanwhile. */
  loaded: boolean;
  /** Merges a partial update, normalizes it, and saves it. */
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);
  // Latest profile, so back-to-back updates merge instead of overwriting each other.
  const latest = useRef(DEFAULT_PROFILE);

  useEffect(() => {
    let active = true;
    storage
      .get()
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = ProfileSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return;
        latest.current = normalize(parsed.data);
        setProfile(latest.current);
      })
      .catch((error) => console.warn('Could not read the saved profile, using defaults', error))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const next = normalize({ ...latest.current, ...patch });
    latest.current = next;
    setProfile(next);
    await storage.set(JSON.stringify(next));
  }, []);

  const value = useMemo(() => ({ profile, loaded, updateProfile }), [profile, loaded, updateProfile]);
  return <ProfileContext value={value}>{children}</ProfileContext>;
}

export function useProfile(): ProfileContextValue {
  const context = use(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside <ProfileProvider>');
  return context;
}
