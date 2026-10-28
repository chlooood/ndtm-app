import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Tag } from '@/components/ui/Tag';
import { tripToCalendarEvents } from '@/lib/calendar/googleCalendar';
import { formatDayRange } from '@/lib/dates';
import { shareTrip } from '@/lib/linking/shareTrip';
import { useTrips } from '@/lib/trips/store';
import type { Trip } from '@/lib/trips/types';

export default function TripsScreen() {
  const { saved } = useTrips();

  return (
    <Screen eyebrow="Calendars & shared itineraries" title="Trips">
      {saved.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base leading-6 text-mist-400">
            Saved trips and the ones friends send you show up here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 pb-12">
          {saved.map((trip) => (
            <TripRow key={trip.id} trip={trip} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function TripRow({ trip }: { trip: Trip }) {
  const first = trip.stops[0];
  const nights = trip.stops.reduce((sum, s) => sum + s.nights, 0);

  const addToCalendar = () => {
    const events = tripToCalendarEvents(trip);
    // TODO: get an OAuth token with the calendar.events scope (expo-auth-session),
    // then call insertTripIntoGoogleCalendar(trip, token).
    Alert.alert(
      'Google Calendar',
      `${events.length} all-day event${events.length === 1 ? '' : 's'} ready, with booking links in each description. Connect Google sign-in to send them.`,
    );
  };

  return (
    <View className="rounded-3xl border border-ink-600 bg-ink-800 p-5">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-xs text-mist-500">{first ? formatDayRange(first.startDate, nights) : 'No dates'}</Text>
        {trip.mirroredFrom && <Tag label="Shared with you" tone="magenta" />}
      </View>
      <Text className="mt-2 text-xl font-bold text-mist">{trip.title}</Text>
      <Text className="mt-1 text-sm text-mist-400">{trip.stops.map((s) => s.scan.destinationName).join(' → ')}</Text>
      <View className="mt-4 flex-row gap-3">
        <Pressable accessibilityRole="button" onPress={() => void shareTrip(trip)} className="rounded-full border border-neon-cyan/50 px-4 py-2 active:opacity-70">
          <Text className="text-sm font-medium text-neon-cyan">Share link</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={addToCalendar} className="rounded-full border border-ink-600 px-4 py-2 active:opacity-70">
          <Text className="text-sm font-medium text-mist">Add to Google Calendar</Text>
        </Pressable>
      </View>
    </View>
  );
}
