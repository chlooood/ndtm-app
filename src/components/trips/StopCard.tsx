import * as Linking from 'expo-linking';
import { Pressable, Text, View } from 'react-native';

import { Tag } from '@/components/ui/Tag';
import { formatDayRange } from '@/lib/dates';
import type { TripStop } from '@/lib/trips/types';

type Props = {
  stop: TripStop;
  index: number;
  /** Omit to render read-only (shared trips, saved trips). */
  onChangeNights?: (nights: number) => void;
  onRemove?: () => void;
};

export function StopCard({ stop, index, onChangeNights, onRemove }: Props) {
  const { scan, logistics } = stop;
  const alpine = scan.tripType === 'alpine_backpacking';

  return (
    <View className="rounded-3xl border border-ink-600 bg-ink-800 p-5">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-xs text-mist-500">
          {String(index + 1).padStart(2, '0')} · {formatDayRange(stop.startDate, stop.nights)}
        </Text>
        <Tag label={alpine ? 'Alpine' : 'City'} tone={alpine ? 'lime' : 'magenta'} />
      </View>
      <Text className="mt-2 text-xl font-bold text-mist">{scan.destinationName}</Text>
      <Text className="text-sm text-mist-400">{scan.estimatedLocation.region}</Text>

      {!logistics.publicTransitFeasible && (
        <Text className="mt-3 text-sm leading-5 text-neon-amber">🚗 {logistics.reason}</Text>
      )}

      <View className="mt-3 gap-2">
        {logistics.links.map((link) => (
          // openURL (not an in-app browser) so Google Maps or BlaBlaCar can take over if installed.
          <Pressable key={link.url} accessibilityRole="link" onPress={() => void Linking.openURL(link.url)}>
            <Text className="text-sm text-neon-cyan">{link.label} ↗</Text>
          </Pressable>
        ))}
      </View>

      {(onChangeNights || onRemove) && (
        <View className="mt-4 flex-row items-center justify-between border-t border-ink-600 pt-4">
          {onChangeNights ? (
            <View className="flex-row items-center gap-3">
              <Stepper label="−" onPress={() => onChangeNights(stop.nights - 1)} accessibilityLabel="One night fewer" />
              <Text className="font-mono text-sm text-mist">
                {stop.nights} night{stop.nights === 1 ? '' : 's'}
              </Text>
              <Stepper label="+" onPress={() => onChangeNights(stop.nights + 1)} accessibilityLabel="One more night" />
            </View>
          ) : (
            <View />
          )}
          {onRemove && (
            <Pressable accessibilityRole="button" onPress={onRemove} className="active:opacity-60">
              <Text className="text-sm text-mist-500">Remove</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function Stepper({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="h-8 w-8 items-center justify-center rounded-full border border-ink-600 active:bg-ink-700"
    >
      <Text className="text-base text-mist">{label}</Text>
    </Pressable>
  );
}
