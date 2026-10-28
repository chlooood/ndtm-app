import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Pressable, Text, View } from 'react-native';

import { AccommodationSelector } from '@/components/trips/AccommodationSelector';
import { DayTimeline } from '@/components/trips/DayTimeline';
import { Tag } from '@/components/ui/Tag';
import { T } from '@/components/ui/Text';
import { formatDayRange } from '@/lib/dates';
import type { AccommodationType, BookingLink, TripStop } from '@/lib/trips/types';

type Props = {
  stop: TripStop;
  index: number;
  /** Omit the callbacks to render read-only (shared trips). */
  onChangeNights?: (nights: number) => void;
  onRemove?: () => void;
  onChangeAccommodation?: (value: AccommodationType) => void;
  onRemoveTimelineItem?: (itemId: string) => void;
  /** On Home the scrapbook page already shows the place, dates and kind. */
  hideHeader?: boolean;
};

const LINK_GROUPS: [string, BookingLink['kind'][]][] = [
  ['Getting there', ['transport', 'map']],
  ['Where to stay', ['lodging']],
];

/** One leg of the itinerary: dates, how to get there, where to sleep, and its stacked venues. */
export function StopCard({ stop, index, onChangeNights, onRemove, onChangeAccommodation, onRemoveTimelineItem, hideHeader }: Props) {
  const { logistics } = stop;
  const alpine = stop.kind === 'alpine';
  const tent = alpine && stop.accommodation === 'tent';

  return (
    <View className="rounded-[26px] border border-line bg-card p-4">
      {hideHeader ? (
        <View className="flex-row">
          <Tag label={alpine ? (tent ? 'Wild camping' : 'Hut trip') : 'City'} tone={alpine ? 'hike' : 'night'} />
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between">
            <T variant="mono">
              {String(index + 1).padStart(2, '0')} · {formatDayRange(stop.startDate, stop.nights)}
            </T>
            <Tag label={alpine ? (tent ? 'Wild camping' : 'Hut trip') : 'City'} tone={alpine ? 'hike' : 'night'} />
          </View>
          <T variant="title" className="mt-2">
            {stop.place.name}
          </T>
          <T variant="muted">{stop.place.region}</T>
        </>
      )}

      {alpine && onChangeAccommodation && (
        <View className="mt-4">
          <AccommodationSelector value={stop.accommodation ?? 'hut'} onChange={onChangeAccommodation} />
        </View>
      )}

      {logistics.mode !== 'rail' && (
        <View className="mt-4 flex-row gap-2 rounded-2xl bg-alert/10 p-3">
          <Text className="font-sans text-[14px]">{logistics.mode === 'road' ? '🚗' : '🚌'}</Text>
          <T variant="small" className="flex-1 text-alert">
            {logistics.reason}
          </T>
        </View>
      )}

      {/* Tent stops have no lodging links at all, so "Where to stay" drops out on its own. */}
      {LINK_GROUPS.map(([heading, kinds]) => {
        const links = logistics.links.filter((l) => kinds.includes(l.kind));
        if (links.length === 0) return null;
        return (
          <View key={heading} className="mt-4">
            <T variant="label">{heading}</T>
            <View className="mt-1.5 gap-1.5">
              {links.map((link) => (
                // openURL (not an in-app browser) so Google Maps or BlaBlaCar can take over if installed.
                <Pressable
                  key={link.url}
                  accessibilityRole="link"
                  onPress={() => {
                    void Haptics.selectionAsync();
                    void Linking.openURL(link.url);
                  }}
                  className="flex-row items-center justify-between rounded-xl bg-chip px-3 py-2.5 active:opacity-70"
                >
                  <Text className="flex-1 font-sans-medium text-[14px] text-ink">{link.label}</Text>
                  <Text className="font-sans text-[14px] text-accent">↗</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}

      {stop.timeline.length > 0 && (
        <View className="mt-4">
          <T variant="label">Timeline</T>
          <DayTimeline items={stop.timeline} onRemove={onRemoveTimelineItem} />
        </View>
      )}

      {(onChangeNights || onRemove) && (
        <View className="mt-4 flex-row items-center justify-between border-t border-line pt-3">
          {onChangeNights ? (
            <View className="flex-row items-center gap-3">
              <Stepper label="−" onPress={() => onChangeNights(stop.nights - 1)} accessibilityLabel="One night fewer" />
              <T variant="mono" className="text-ink">
                {stop.nights} night{stop.nights === 1 ? '' : 's'}
              </T>
              <Stepper label="+" onPress={() => onChangeNights(stop.nights + 1)} accessibilityLabel="One more night" />
            </View>
          ) : (
            <View />
          )}
          {onRemove && (
            <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={8} className="active:opacity-60">
              <T variant="small">Remove</T>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export function Stepper({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      className="h-8 w-8 items-center justify-center rounded-full border border-line bg-chip active:opacity-70"
    >
      <Text className="font-sans-medium text-[16px] text-ink">{label}</Text>
    </Pressable>
  );
}
