import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { PackingGrid } from '@/components/trips/PackingGrid';
import { tailoredPackGrid } from '@/lib/logistics/tailoredEngine';
import { useProfile } from '@/lib/profile/ProfileContext';
import { type DailyForecast, fetchMountainForecast } from '@/lib/trips/alpine';
import type { TripStop } from '@/lib/trips/types';

/** 7-day mountain forecast plus a hut or camping packing grid for an alpine stop. */
export function AlpineBriefing({ stop }: { stop: TripStop }) {
  const { lat, lng } = stop.place;
  const { profile } = useProfile();
  const [forecast, setForecast] = useState<{ key: string; days?: DailyForecast[]; error?: string } | null>(null);
  const key = `${lat},${lng}`;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    let active = true;
    fetchMountainForecast(lat, lng)
      .then((days) => active && setForecast({ key: `${lat},${lng}`, days }))
      .catch((e: Error) => active && setForecast({ key: `${lat},${lng}`, error: e.message }));
    return () => {
      active = false;
    };
  }, [lat, lng]);

  const current = forecast?.key === key ? forecast : null;
  const days = current?.days ?? [];
  const accommodation = stop.accommodation ?? 'hut';
  const pack = tailoredPackGrid(stop, profile, days);

  return (
    <View className="mt-3 rounded-3xl border border-line bg-chip/60 p-4">
      <Text className="font-sans-semibold text-[11px] uppercase tracking-[1.6px] text-accent">
        {accommodation === 'tent' ? 'Backcountry briefing' : 'Mountain briefing'}
      </Text>
      {lat === undefined && <Text className="mt-2 font-sans text-[14px] text-muted">No coordinates yet, so no forecast.</Text>}
      {current?.error && <Text className="mt-2 font-sans text-[14px] text-muted">Forecast unavailable: {current.error}</Text>}
      {lat !== undefined && !current && <Text className="mt-2 font-sans text-[14px] text-muted">Loading forecast…</Text>}
      {days.length > 0 && (
        <View className="mt-3 flex-row justify-between">
          {days.slice(0, 7).map((d) => (
            <View key={d.date} className="items-center">
              <Text className="font-mono text-[10px] text-muted">{d.date.slice(8)}</Text>
              <Text className="mt-1 font-mono text-[12px] text-ink">{Math.round(d.tempMaxC)}°</Text>
              <Text className="font-mono text-[10px] text-muted">{Math.round(d.tempMinC)}°</Text>
              {d.precipitationMm >= 1 && <Text className="font-mono text-[10px] text-accent">{Math.round(d.precipitationMm)}mm</Text>}
            </View>
          ))}
        </View>
      )}
      <Text className="mb-1 mt-4 font-sans-semibold text-[15px] text-ink">
        {accommodation === 'tent' ? 'Camping gear' : 'Hut pack list'}
      </Text>
      {/* Keyed by accommodation so ticks reset when the list itself changes. */}
      <PackingGrid key={accommodation} groups={pack.groups} />
      {pack.skipped.length > 0 && (
        <Text className="mt-2 font-sans text-[12px] text-muted">
          Left off because you own it: {pack.skipped.join(', ')}
        </Text>
      )}
    </View>
  );
}
