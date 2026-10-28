import { Text, View } from 'react-native';

import { T } from '@/components/ui/Text';
import type { UserProfile } from '@/lib/profile/ProfileContext';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Season tiles and a month-by-month histogram (hikes and nights out), drawn from the profile's stats. */
export function SeasonStats({ stats }: { stats: UserProfile['stats'] }) {
  const { season } = stats;
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const tiles = [
    { label: 'Hikes', value: sum(season.hikes) },
    { label: 'Distance', value: `${Math.round(sum(season.distanceKm))} km` },
    { label: 'Hut nights', value: sum(season.hutNights) },
    { label: 'Nights out', value: sum(season.nightsOut) },
  ];
  // One scale for both series, so their bars compare honestly.
  const max = Math.max(1, ...season.hikes, ...season.nightsOut);

  return (
    <View className="gap-3 rounded-[26px] border border-line bg-card p-4">
      <View className="flex-row items-baseline justify-between">
        <T variant="label">Your season</T>
        <Text className="font-display-italic text-[15px] text-muted">{season.year}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {tiles.map((t) => (
          <View key={t.label} className="min-w-[46%] flex-1 rounded-2xl bg-chip px-3 py-2.5">
            <T variant="small">{t.label}</T>
            <Text className="font-display text-[20px] text-ink">{t.value}</Text>
          </View>
        ))}
      </View>
      <View className="h-[88px] flex-row items-end gap-1 border-b border-line pt-1" accessibilityLabel="Hikes and nights out by month">
        {MONTHS.map((m, i) => (
          <View key={`${m}${i}`} className="h-full flex-1 flex-row items-end gap-[2px]">
            <View style={{ height: `${(season.hikes[i] / max) * 100}%` }} className="flex-1 rounded-t-sm bg-ember" />
            <View style={{ height: `${(season.nightsOut[i] / max) * 100}%` }} className="flex-1 rounded-t-sm bg-rose" />
          </View>
        ))}
      </View>
      <View className="flex-row gap-1">
        {MONTHS.map((m, i) => (
          <Text key={`${m}${i}`} className="flex-1 text-center font-sans text-[10px] text-muted">
            {m}
          </Text>
        ))}
      </View>
      <View className="flex-row gap-4">
        <T variant="small" className="text-ember">
          ▮ hikes
        </T>
        <T variant="small" className="text-rose">
          ▮ nights out
        </T>
      </View>
    </View>
  );
}
