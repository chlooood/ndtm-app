import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { syncTripToGoogleCalendar } from '@/lib/calendar/googleCalendar';
import { useTrips } from '@/lib/trips/store';
import type { Trip } from '@/lib/trips/types';

/**
 * Writes the trip into Google Calendar: one all-day event per leg with booking
 * links and the day's timeline, and timed events for trains and tours. Asks
 * you to sign in with Google first if you haven't.
 */
export function CalendarButton({ trip, kind = 'secondary' }: { trip: Trip; kind?: 'primary' | 'secondary' }) {
  const auth = useAuth();
  const { recordGoogleEvents } = useTrips();
  const [busy, setBusy] = useState(false);
  const synced = trip.stops.length > 0 && trip.stops.every((s) => s.googleEventId);

  const run = async () => {
    if (!auth.configured) {
      Alert.alert('Google sign-in isn’t set up', 'Add your Google client IDs to .env.local (see README) to sync with Google Calendar.');
      return;
    }
    setBusy(true);
    try {
      if (!auth.account) await auth.signIn();
      const token = await auth.calendarToken();
      // On web, sign-in navigates away and the sync runs when you tap again.
      if (!token) return;
      const ids = await syncTripToGoogleCalendar(trip, token);
      recordGoogleEvents(trip.id, ids);
      const n = Object.keys(ids.stops).length + Object.keys(ids.bookings).length;
      Alert.alert('In your Google Calendar', `${n} event${n === 1 ? '' : 's'} ${synced ? 'updated' : 'added'} for ${trip.title}.`);
    } catch (error) {
      Alert.alert('Couldn’t sync', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      label={busy ? 'Syncing…' : synced ? 'Update Google Calendar' : auth.account ? 'Add to Google Calendar' : 'Sign in & add to Google Calendar'}
      kind={kind}
      disabled={busy || trip.stops.length === 0}
      onPress={() => void run()}
    />
  );
}
