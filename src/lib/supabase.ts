import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Falls back to placeholders so the UI still renders before .env.local exists;
// every network call will fail with a clear "not configured" error instead.
export const supabase = createClient(url ?? 'https://not-configured.supabase.co', anonKey ?? 'missing', {
  auth: {
    // Sessions persist in localStorage: the browser's on web, and the
    // SQLite-backed one expo-sqlite installs on iOS and Android.
    storage: (globalThis as { localStorage?: Storage }).localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Only the web build returns from Google's sign-in page via a redirect URL.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Copy .env.example to .env.local and fill in your project keys.');
  }
}
