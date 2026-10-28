import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { buildPackList, type DailyForecast, fetchMountainForecast } from '@/lib/trips/alpine';
import type { TripStop } from '@/lib/trips/types';

/** 7-day mountain forecast and a weather-aware pack list for an alpine stop. */
export function AlpineBriefing({ stop }: { stop: TripStop }) {
  const { lat, lng } = stop.scan.estimatedLocation;
  const [forecast, setForecast] = useState<DailyForecast[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMountainForecast(lat, lng)
      .then((f) => active && setForecast(f))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [lat, lng]);

  return (
    <View className="mt-3 rounded-3xl border border-neon-lime/30 bg-ink-900 p-5">
      <Text className="font-mono text-xs uppercase tracking-[3px] text-neon-lime">Mountain briefing</Text>
      {error && <Text className="mt-2 text-sm text-mist-500">Forecast unavailable: {error}</Text>}
      {!forecast && !error && <Text className="mt-2 text-sm text-mist-500">Loading forecast…</Text>}
      {forecast && (
        <>
          <View className="mt-3 flex-row justify-between">
            {forecast.slice(0, 7).map((d) => (
              <View key={d.date} className="items-center">
                <Text className="font-mono text-[10px] text-mist-500">{d.date.slice(8)}</Text>
                <Text className="mt-1 font-mono text-xs text-mist">{Math.round(d.tempMaxC)}°</Text>
                <Text className="font-mono text-[10px] text-mist-500">{Math.round(d.tempMinC)}°</Text>
                {d.precipitationMm >= 1 && <Text className="font-mono text-[10px] text-neon-cyan">{Math.round(d.precipitationMm)}mm</Text>}
              </View>
            ))}
          </View>
          <Text className="mt-4 text-sm font-semibold text-mist">Pack list</Text>
          {buildPackList(forecast, stop.nights).map((item) => (
            <Text key={item} className="mt-1 text-sm text-mist-400">
              ◦ {item}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}
