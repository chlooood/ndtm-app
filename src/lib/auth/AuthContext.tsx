import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from 'react';

import { getCalendarAccessToken, isGoogleConfigured, restoreGoogle, signInWithGoogle, signOutGoogle } from '@/lib/auth/google';
import type { GoogleAccount } from '@/lib/auth/types';

type AuthContextValue = {
  account: GoogleAccount | null;
  /** True while a saved sign-in is being restored at launch. */
  restoring: boolean;
  /** False until Google client IDs are set in .env.local. */
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** An access token for the Calendar API, or null when signed out. */
  calendarToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<GoogleAccount | null>(null);
  const [restoring, setRestoring] = useState(isGoogleConfigured);

  useEffect(() => {
    if (!isGoogleConfigured) return;
    let active = true;
    restoreGoogle()
      .then((a) => active && setAccount(a))
      .finally(() => active && setRestoring(false));
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async () => {
    const a = await signInWithGoogle();
    if (a) setAccount(a);
  }, []);

  const signOut = useCallback(async () => {
    await signOutGoogle();
    setAccount(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ account, restoring, configured: isGoogleConfigured, signIn, signOut, calendarToken: getCalendarAccessToken }),
    [account, restoring, signIn, signOut],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
