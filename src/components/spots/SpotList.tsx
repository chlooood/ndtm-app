import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { T } from '@/components/ui/Text';
import { type LifestyleSpot, VENUE_LABEL } from '@/lib/spots/types';

/** Saved spots as tappable rows. Each opens the three quick actions. */
export function SpotList({ spots, emptyHint, onOpen }: { spots: LifestyleSpot[]; emptyHint: string; onOpen: (spot: LifestyleSpot) => void }) {
  return (
    <View className="gap-2">
      <T variant="label">{spots.length ? 'Your spots' : 'No spots here yet'}</T>
      {spots.length === 0 && <T variant="muted">{emptyHint}</T>}
      {spots.map((spot) => (
        <Pressable
          key={spot.id}
          accessibilityRole="button"
          accessibilityHint="Opens start trip, add to trip and save as note"
          onPress={() => {
            void Haptics.selectionAsync();
            onOpen(spot);
          }}
          className="flex-row items-center gap-3 rounded-2xl border border-line/60 bg-card/55 px-4 py-3 active:opacity-70"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/15">
            <Text className="font-sans-semibold text-[13px] text-accent">{VENUE_LABEL[spot.category][0]}</Text>
          </View>
          <View className="flex-1">
            <T variant="heading">{spot.name}</T>
            <T variant="small">
              {VENUE_LABEL[spot.category]} · {spot.city}
              {spot.source.type === 'scan' ? ' · scanned' : ''}
            </T>
          </View>
          <T variant="label" className="text-accent">
            +
          </T>
        </Pressable>
      ))}
    </View>
  );
}
