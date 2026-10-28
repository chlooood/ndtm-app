import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { NEON_CYAN } from '@/components/ui/theme';

const ANALYZING_STEPS = [
  'Reading text overlays',
  'Scanning captions for "hiking", "TGV", "huts"',
  'Spotting landmarks',
  'Matching coordinates',
];

const PREVIEW_HEIGHT = 280;

type Props = {
  imageUri: string;
  stage: 'uploading' | 'analyzing';
};

/** Pulse skeleton with a sweeping scan line while the vision engine works. */
export function ScanSkeleton({ imageUri, stage }: Props) {
  const pulse = useSharedValue(0);
  const sweep = useSharedValue(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
    sweep.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }), -1, true));
  }, [pulse, sweep]);

  useEffect(() => {
    if (stage !== 'analyzing') return;
    const id = setInterval(() => setStep((s) => (s + 1) % ANALYZING_STEPS.length), 1400);
    return () => clearInterval(id);
  }, [stage]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.45 }));
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * (PREVIEW_HEIGHT - 2) }] }));

  const label = stage === 'uploading' ? 'Uploading screenshot' : ANALYZING_STEPS[step];

  return (
    <View className="flex-1" accessibilityRole="progressbar" accessibilityLabel={label}>
      <View className="overflow-hidden rounded-[28px] border border-neon-cyan/30 bg-ink-900" style={{ height: PREVIEW_HEIGHT }}>
        <Image source={{ uri: imageUri }} contentFit="cover" style={{ flex: 1, opacity: 0.55 }} />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: NEON_CYAN,
              shadowColor: NEON_CYAN,
              shadowOpacity: 1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
            },
            sweepStyle,
          ]}
        />
      </View>

      <Text className="mt-6 font-mono text-xs uppercase tracking-[3px] text-neon-cyan">{label}…</Text>

      <Animated.View style={pulseStyle} className="mt-4 gap-3">
        <View className="h-7 w-3/4 rounded-lg bg-ink-700" />
        <View className="flex-row gap-2">
          <View className="h-6 w-24 rounded-full bg-ink-700" />
          <View className="h-6 w-24 rounded-full bg-ink-700" />
          <View className="h-6 w-16 rounded-full bg-ink-700" />
        </View>
        <View className="h-4 w-full rounded bg-ink-800" />
        <View className="h-4 w-5/6 rounded bg-ink-800" />
      </Animated.View>
    </View>
  );
}
