import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { T } from '@/components/ui/Text';
import { type LifestyleSpot, VENUE_LABEL } from '@/lib/spots/types';

const PAPERS = ['#F4EFE3', '#EFE6D3', '#E8EDE0', '#F3E4E0'];
const TILTS = [-2.2, 1.6, -1, 2.4, -1.8, 1.1];

/** Places pasted from notes, pinned to the page as loose paper cards. Tap one for the quick actions. */
export function ScatteredSpots({ spots, onOpen }: { spots: LifestyleSpot[]; onOpen: (spot: LifestyleSpot) => void }) {
  return (
    <View className="gap-2">
      <T variant="label">Scattered from your notes</T>
      <View className="flex-row flex-wrap justify-between gap-y-4 pt-1">
        {spots.map((spot, i) => (
          <Pressable
            key={spot.id}
            accessibilityRole="button"
            accessibilityLabel={`${spot.name}, ${VENUE_LABEL[spot.category]} in ${spot.city}`}
            onPress={() => {
              void Haptics.selectionAsync();
              onOpen(spot);
            }}
            style={{
              width: '48%',
              backgroundColor: PAPERS[i % PAPERS.length],
              transform: [{ rotate: `${TILTS[i % TILTS.length]}deg` }],
              shadowColor: '#4B3D26',
              shadowOpacity: 0.16,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
            className="px-3 pb-3 pt-4 active:opacity-80"
          >
            {/* tape */}
            <View pointerEvents="none" style={{ position: 'absolute', top: -7, alignSelf: 'center', width: 44, height: 14, backgroundColor: '#E8DCC0B8', transform: [{ rotate: '-4deg' }] }} />
            <Text className="font-sans-semibold text-[10px] uppercase tracking-[1.4px] text-[#8C2F2B]">{VENUE_LABEL[spot.category]}</Text>
            <Text className="mt-0.5 font-display text-[17px] leading-[21px] text-[#2F3B33]">{spot.name}</Text>
            <Text className="mt-1 font-sans text-[12px] text-[#736D5E]">⌖ {spot.city}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
