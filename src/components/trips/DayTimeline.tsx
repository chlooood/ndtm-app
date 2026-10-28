import { Pressable, Text, View } from 'react-native';

import { T } from '@/components/ui/Text';
import { formatClock, formatDayLabel } from '@/lib/dates';
import type { TimelineItem } from '@/lib/trips/types';

const ICON = { club: '✦', bar: '🍸', beach: '☀', restaurant: '🍽', cafe: '☕', landmark: '◆', farm: '🌾', garden: '✿', monument: '🏛' } as const;

/** Venues (timed nodes) and calendar notes for a stop, grouped by day. Items arrive sorted. */
export function DayTimeline({ items, onRemove }: { items: TimelineItem[]; onRemove?: (itemId: string) => void }) {
  const days = [...new Set(items.map((i) => i.date))];
  return (
    <View className="mt-1.5 gap-3">
      {days.map((day) => (
        <View key={day}>
          <T variant="mono" className="text-ink">
            {formatDayLabel(day)}
          </T>
          <View className="ml-1 mt-1.5 border-l border-line pl-3">
            {items
              .filter((i) => i.date === day)
              .map((item) => (
                <View key={item.id} className="flex-row items-center gap-3 py-1.5">
                  <T variant="mono" className="w-16">
                    {formatClock(item.time)}
                  </T>
                  {item.kind === 'venue' ? (
                    <View className="flex-1 flex-row items-center gap-2">
                      <Text className="font-sans text-[13px] text-accent">{ICON[item.category]}</Text>
                      <Text className="flex-1 font-sans-medium text-[14px] text-ink">{item.name}</Text>
                    </View>
                  ) : (
                    <View className="flex-1">
                      <Text className="font-sans text-[14px] text-ink">{item.text}</Text>
                      <T variant="small">Note · goes in the calendar description</T>
                    </View>
                  )}
                  {onRemove && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.kind === 'venue' ? item.name : 'note'}`}
                      onPress={() => onRemove(item.id)}
                      hitSlop={10}
                    >
                      <T variant="small">✕</T>
                    </Pressable>
                  )}
                </View>
              ))}
          </View>
        </View>
      ))}
    </View>
  );
}
