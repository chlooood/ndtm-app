import { Alert } from 'react-native';

import { Button } from '@/components/ui/Button';
import { tripToCalendarEvents } from '@/lib/calendar/googleCalendar';
import type { Trip } from '@/lib/trips/types';

/**
 * Builds the trip's Google Calendar events: one all-day event per leg, with
 * booking links and every stacked spot and note in a per-day timeline.
 */
export function CalendarButton({ trip, kind = 'secondary' }: { trip: Trip; kind?: 'primary' | 'secondary' }) {
  return (
    <Button
      label="Add to Google Calendar"
      kind={kind}
      disabled={trip.stops.length === 0}
      onPress={() => {
        const events = tripToCalendarEvents(trip);
        // TODO: get an OAuth token with the calendar.events scope (expo-auth-session),
        // call insertTripIntoGoogleCalendar(), and store each id as stop.googleEventId.
        Alert.alert(
          'Google Calendar',
          `${events.length} all-day event${events.length === 1 ? '' : 's'} ready, with booking links and each day's timeline in the description. Connect Google sign-in to send them.`,
        );
      }}
    />
  );
}
