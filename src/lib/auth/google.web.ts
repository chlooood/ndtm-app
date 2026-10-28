// Google sign-in on web, through Supabase Auth's Google provider. The page
// redirects to Google and back; Supabase then holds the session, and the
// Google access token (with the calendar.events scope) arrives once as
// `provider_token`. Supabase doesn't refresh that token, so it's kept for
// this browser tab and the user signs in again when it expires (~1 hour).

import { CALENDAR_SCOPE, type GoogleAccount } from '@/lib/auth/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const isGoogleConfigured = isSupabaseConfigured;

const TOKEN_KEY = 'ndtm.google.providerToken';

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.provider_token) {
    try {
      sessionStorage.setItem(TOKEN_KEY, session.provider_token);
    } catch {
      // Private mode: the token just won't survive a reload.
    }
  }
});

function accountFrom(user: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined): GoogleAccount | null {
  if (!user?.email) return null;
  const meta = user.user_metadata ?? {};
  return {
    email: user.email,
    name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
    photo: (meta.avatar_url as string | undefined) ?? null,
  };
}

/** Sends the browser to Google; the page comes back signed in. Resolves null because it navigates away. */
export async function signInWithGoogle(): Promise<GoogleAccount | null> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured, so web sign-in is unavailable.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: CALENDAR_SCOPE,
      redirectTo: `${window.location.origin}/home`,
    },
  });
  if (error) throw error;
  return null;
}

export async function restoreGoogle(): Promise<GoogleAccount | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return accountFrom(data.session?.user);
}

export async function getCalendarAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.provider_token) return data.session.provider_token;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing stored
  }
  if (isSupabaseConfigured) await supabase.auth.signOut();
}
