import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { StopCard } from '@/components/trips/StopCard';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/Text';
import { PALETTES } from '@/components/ui/theme';
import { fetchSharedTrip } from '@/lib/trips/repository';
import { useTrips } from '@/lib/trips/store';
import type { Trip } from '@/lib/trips/types';

/** Target of ndtm://trip/<id>. Loads a friend's itinerary and lets you mirror it. */
export default function SharedTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mirrorTrip, setActiveTrip, trips } = useTrips();
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

  const alreadySaved = trips.some((t) => t.id === id);
  const trip = state.trip;

  return (
    <Screen world="home" eyebrow="Shared with you" title={trip?.title ?? 'Shared trip'} corners={false}>
      {state.error || trip === null ? (
        <View className="flex-1 items-center justify-center px-8">
          <T variant="heading">Trip not found</T>
          <T variant="muted" className="mt-1 text-center">
            {state.error ?? 'This link may be broken, or the trip was never published.'}
          </T>
        </View>
      ) : !trip ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={PALETTES.home.accent} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 px-5 pb-16">
          {trip.stops.map((stop, i) => (
            <StopCard key={stop.id} stop={stop} index={i} />
          ))}
          <Button
            label={alreadySaved ? 'Already in your trips' : 'Mirror to my trips'}
            disabled={alreadySaved}
            onPress={() => {
              mirrorTrip(trip);
              setActiveTrip(trip.id);
              router.dismissTo('/home');
            }}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
