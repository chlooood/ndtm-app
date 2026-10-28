import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { StopCard } from '@/components/trips/StopCard';
import { NEON_CYAN } from '@/components/ui/theme';
import { fetchSharedTrip } from '@/lib/trips/repository';
import { useTrips } from '@/lib/trips/store';
import type { Trip } from '@/lib/trips/types';

/** Target of ndtm://trip/<id>. Loads a friend's itinerary and lets you mirror it. */
export default function SharedTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mirrorTrip, saved } = useTrips();
  const router = useRouter();
  // Keyed by id so opening a second link shows the spinner instead of the previous trip.
  type Loaded = { id?: string; trip?: Trip | null; error?: string };
  const [loaded, setLoaded] = useState<Loaded>({});
  const state: Loaded = loaded.id === id ? loaded : {};

  useEffect(() => {
    let active = true;
    fetchSharedTrip(id)
      .then((trip) => active && setLoaded({ id, trip }))
      .catch((e: Error) => active && setLoaded({ id, error: e.message }));
    return () => {
      active = false;
    };
  }, [id]);

  const alreadySaved = saved.some((t) => t.id === id);

  if (state.error || state.trip === null) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-8">
        <Text className="text-center text-lg font-semibold text-mist">Trip not found</Text>
        <Text className="mt-2 text-center text-mist-400">{state.error ?? 'This link may be broken or the trip was never published.'}</Text>
      </View>
    );
  }

  if (!state.trip) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <ActivityIndicator color={NEON_CYAN} />
      </View>
    );
  }

  const trip = state.trip;
  return (
    <>
      <Stack.Screen options={{ title: trip.title }} />
      <ScrollView className="flex-1 bg-ink" contentContainerClassName="gap-4 p-5 pb-12">
        {trip.stops.map((stop, i) => (
          <StopCard key={stop.id} stop={stop} index={i} />
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={alreadySaved}
          onPress={() => {
            mirrorTrip(trip);
            router.dismissTo('/trips');
          }}
          className="items-center rounded-2xl bg-neon-cyan py-4 active:opacity-80 disabled:opacity-40"
        >
          <Text className="text-base font-bold text-ink">{alreadySaved ? 'Already in your trips' : 'Mirror to my trips'}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
