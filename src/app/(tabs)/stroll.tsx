import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { HikeSky } from '@/components/nav/HikeSky';
import { FilterChips } from '@/components/spots/FilterChips';
import { SpotEntryForm } from '@/components/spots/SpotEntryForm';
import { SpotList } from '@/components/spots/SpotList';
import { SpotSheet } from '@/components/spots/SpotSheet';
import { AlpineBriefing } from '@/components/trips/AlpineBriefing';
import { CalendarButton } from '@/components/trips/CalendarButton';
import { DayTimeline } from '@/components/trips/DayTimeline';
import { StopCard } from '@/components/trips/StopCard';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/Text';
import { type LifestyleSpot, STROLL_CATEGORIES, STROLL_GROUPS, type StrollGroup } from '@/lib/spots/types';
import { insertTimelineItem, spotFromManual } from '@/lib/trips/itinerary';
import { useTrips } from '@/lib/trips/store';
import type { TimelineItem } from '@/lib/trips/types';

type Filter = 'all' | 'trails' | StrollGroup;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'trails', label: 'Trails' },
  { key: 'landmarks', label: 'Landmarks' },
  { key: 'farms', label: 'Farms' },
  { key: 'gardens', label: 'Gardens' },
  { key: 'monuments', label: 'Monuments' },
];

/**
 * Stroll around: trails with hut-or-tent logistics, plus landmarks, farms,
 * gardens and monuments. Spots stack into the active trip with the same
 * three quick actions as Night out, and the whole plan goes to Google Calendar.
 */
export default function StrollScreen() {
  const t = useTrips();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<LifestyleSpot | null>(null);

  // Scrolling walks the sky along the trail's elevation profile.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const legs = t.activeTrip.stops.map((stop, index) => ({ stop, index })).filter(({ stop }) => stop.kind === 'alpine');
  const strollSpots = t.spots.filter((s) => (STROLL_CATEGORIES as readonly string[]).includes(s.category));
  const shownSpots =
    filter === 'all' || filter === 'trails' ? strollSpots : strollSpots.filter((s) => (STROLL_GROUPS[filter] as readonly string[]).includes(s.category));
  const showTrails = filter === 'all' || filter === 'trails';
  const showSpots = filter !== 'trails';

  // The whole trip's day plan, so you can see where a stroll fits around everything else.
  const plan = t.activeTrip.stops.reduce<TimelineItem[]>((all, s) => s.timeline.reduce(insertTimelineItem, all), []);

  return (
    <>
      <Screen world="hike" eyebrow="Trails, gardens, farms & landmarks" title="Stroll around" backdrop={<HikeSky scrollY={scrollY} />}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingBottom: 64 }}
        >
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

          {showTrails &&
            (legs.length === 0 ? (
              <View className="items-center rounded-[26px] border border-dashed border-line bg-card/70 px-6 py-8">
                <T variant="heading" className="text-center">
                  No trails in {t.activeTrip.title} yet
                </T>
                <T variant="muted" className="mt-1 text-center">
                  Scan a TikTok of a hut, an AllTrails page or a hiking blog. You’ll choose between a hut and a tent, and get a packing list for that
                  weather.
                </T>
                <View className="mt-5 w-full">
                  <Button label="Scan a trail" onPress={() => router.push('/scan')} />
                </View>
              </View>
            ) : (
              legs.map(({ stop, index }) => (
                <View key={stop.id}>
                  <StopCard
                    stop={stop}
                    index={index}
                    onChangeNights={(n) => t.setNights(stop.id, n)}
                    onChangeAccommodation={(a) => t.setAccommodation(stop.id, a)}
                  />
                  <AlpineBriefing stop={stop} />
                </View>
              ))
            ))}

          {showSpots && (
            <>
              <SpotEntryForm
                categories={STROLL_CATEGORIES}
                example={{ name: "Parc de la Tête d'Or", city: 'Lyon' }}
                world="hike"
                onSubmit={(input) => {
                  const spot = spotFromManual(input);
                  t.saveSpot(spot);
                  setOpen(spot);
                }}
              />
              <SpotList
                spots={shownSpots}
                emptyHint="Add a garden, farm, landmark or monument above, or scan one with the camera in the corner."
                onOpen={setOpen}
              />
            </>
          )}

          <View className="gap-3 rounded-[26px] border border-line bg-card p-4">
            <View>
              <T variant="label">Itinerary · {t.activeTrip.title}</T>
              <T variant="muted">Every spot you stack lands here by day, and goes into each leg’s Google Calendar event.</T>
            </View>
            {plan.length > 0 ? (
              <DayTimeline items={plan} />
            ) : (
              <T variant="small">Nothing stacked yet. Tap a spot and choose “Add to active trip”.</T>
            )}
            <CalendarButton trip={t.activeTrip} kind="primary" />
          </View>
        </Animated.ScrollView>
      </Screen>
      {open && <SpotSheet spot={open} world="hike" onClose={() => setOpen(null)} />}
    </>
  );
}
