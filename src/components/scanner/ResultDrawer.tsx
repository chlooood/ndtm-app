import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { INK, NEON_AMBER } from '@/components/ui/theme';
import { Tag } from '@/components/ui/Tag';
import type { ScanResponse } from '@/lib/scanner/schema';
import type { Logistics } from '@/lib/trips/types';

type Props = {
  response: ScanResponse;
  logistics: Logistics;
  onAssemble: () => void;
  onDismiss: () => void;
};

const PLATFORM_LABEL = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  reddit: 'Reddit',
  youtube: 'YouTube',
  unknown: 'Web',
} as const;

/** Bottom sheet that springs up the moment a scan lands. */
export function ResultDrawer({ response, logistics, onAssemble, onDismiss }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const offset = useSharedValue(height);

  useEffect(() => {
    offset.set(withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 }));
  }, [offset]);

  const close = (then: () => void) => {
    offset.set(
      withTiming(height, { duration: 220 }, (finished) => {
        if (finished) scheduleOnRN(then);
      }),
    );
  };

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, offset.value / height) }));

  const { scan, meta } = response;
  const { lat, lng, region } = scan.estimatedLocation;
  const alpine = scan.tripType === 'alpine_backpacking';

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: `${INK}CC` }, backdropStyle]}>
        <Pressable accessibilityLabel="Dismiss result" className="flex-1" onPress={() => close(onDismiss)} />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: height * 0.78 }, sheetStyle]}
        className="rounded-t-[32px] border-t border-neon-cyan/30 bg-ink-800"
      >
        <View className="items-center pt-3">
          <View className="h-1 w-10 rounded-full bg-ink-600" />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}>
          <Text className="font-mono text-xs uppercase tracking-[3px] text-mist-500">
            Found via {PLATFORM_LABEL[scan.sourcePlatform]}
          </Text>
          <Text className="mt-2 text-3xl font-bold text-mist" accessibilityRole="header">
            {scan.destinationName}
          </Text>
          <Text className="mt-1 text-base text-mist-400">{region}</Text>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Tag label={alpine ? 'Alpine backpacking' : 'City trip'} tone={alpine ? 'lime' : 'magenta'} />
            <Tag label={`${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`} tone="cyan" mono />
            <Tag label={`${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`} tone="cyan" mono />
            {!meta.geocoded && <Tag label="Approximate" tone="amber" />}
          </View>

          {scan.extractedContext ? (
            <Text className="mt-5 text-base leading-6 text-mist-400">“{scan.extractedContext}”</Text>
          ) : null}

          {meta.keywords.length > 0 && (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {meta.keywords.slice(0, 8).map((k) => (
                <Tag key={k} label={`#${k}`} />
              ))}
            </View>
          )}

          {!logistics.publicTransitFeasible && (
            <View className="mt-5 flex-row gap-3 rounded-2xl border border-neon-amber/40 bg-neon-amber/10 p-4">
              <SymbolView name={{ ios: 'car.fill', android: 'directions_car', web: 'directions_car' }} tintColor={NEON_AMBER} size={20} />
              <Text className="flex-1 text-sm leading-5 text-neon-amber">{logistics.reason}</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => close(onAssemble)}
            className="mt-6 items-center rounded-2xl bg-neon-cyan py-4 active:opacity-80"
            style={{ shadowColor: '#3DF5FF', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } }}
          >
            <Text className="text-base font-bold text-ink">Assemble Itinerary</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => close(onDismiss)} className="mt-3 items-center py-3">
            <Text className="text-sm font-medium text-mist-400">Scan something else</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
