// Google sign-in on iOS and Android, via @react-native-google-signin (needs a
// development build; it doesn't run in Expo Go). One sign-in does two jobs:
//   1. the ID token signs you into Supabase, so trips sync to your account
//   2. the access token, with the calendar.events scope, lets ndtm write
//      your trips into Google Calendar
// The web build uses google.web.ts instead.

import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { CALENDAR_SCOPE, type GoogleAccount } from '@/lib/auth/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const isGoogleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({
    // The web client ID is what makes Google return an ID token Supabase accepts.
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: [CALENDAR_SCOPE],
  });
  configured = true;
}

const toAccount = (u: { email: string; name: string | null; photo: string | null }): GoogleAccount => ({
  email: u.email,
  name: u.name,
  photo: u.photo,
});

async function linkSupabase(idToken: string | null) {
  if (!idToken || !isSupabaseConfigured) return;
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) console.warn('Signed in to Google but not to Supabase:', error.message);
}

/** Opens Google's sign-in. Returns null if the user backs out. */
export async function signInWithGoogle(): Promise<GoogleAccount | null> {
  configure();
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response) || !isSuccessResponse(response)) return null;
    await linkSupabase(response.data.idToken);
    return toAccount(response.data.user);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return null;
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play services are missing or out of date on this phone.');
    }
    throw error;
  }
}

/** Restores a previous sign-in without showing any UI. */
export async function restoreGoogle(): Promise<GoogleAccount | null> {
  configure();
  try {
    const response = await GoogleSignin.signInSilently();
    if (response.type !== 'success') return null;
    await linkSupabase(response.data.idToken);
    return toAccount(response.data.user);
  } catch {
    return null;
  }
}

/** A fresh access token for the Google Calendar API, or null when signed out. */
export async function getCalendarAccessToken(): Promise<string | null> {
  configure();
  try {
    const { accessToken } = await GoogleSignin.getTokens();
    return accessToken;
  } catch {
    return null;
  }
}

export async function signOutGoogle(): Promise<void> {
  configure();
  await GoogleSignin.signOut();
  if (isSupabaseConfigured) await supabase.auth.signOut();
}
