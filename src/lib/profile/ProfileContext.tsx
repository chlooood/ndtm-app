import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_PROFILE, loadProfile, normalizeProfile, saveProfile, type UserProfile } from '@/lib/profile/store';

// The user's travel context: which hub they leave from (and the exchange they
// are planning next), rail cards, hiking style, owned gear and scrapbook
// numbers. It never leaves the device, and the logistics engine reads it so
// plans are tailored by plain code, not by the AI.

export {
  HIKING_STYLES,
  HUB_INFO,
  HUBS,
  IMPRINT_PATTERNS,
  TRANSIT_PASSES,
  activeHub,
  type HikingStyle,
  type Hub,
  type ImprintPattern,
  type TransitPass,
  type UserProfile,
} from '@/lib/profile/store';

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
    loadProfile()
      .then((saved) => {
        if (!active || !saved) return;
        latest.current = saved;
        setProfile(saved);
      })
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const next = normalizeProfile({ ...latest.current, ...patch });
    latest.current = next;
    setProfile(next);
    await saveProfile(next);
  }, []);

  const value = useMemo(() => ({ profile, loaded, updateProfile }), [profile, loaded, updateProfile]);
  return <ProfileContext value={value}>{children}</ProfileContext>;
}

export function useProfile(): ProfileContextValue {
  const context = use(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside <ProfileProvider>');
  return context;
}
