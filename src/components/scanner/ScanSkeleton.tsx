import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { T } from '@/components/ui/Text';

const ANALYZING_STEPS = ['Reading the caption', 'Looking for “hiking”, “TGV”, “huts”', 'Spotting landmarks', 'Matching coordinates'];

const PREVIEW_HEIGHT = 300;

type Props = {
  imageUri: string;
  stage: 'uploading' | 'analyzing';
};

/** Pulsing skeleton with a scan line sweeping over the screenshot while the vision engine works. */
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

  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.45 }));
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * (PREVIEW_HEIGHT - 3) }] }));

  const label = stage === 'uploading' ? 'Uploading screenshot' : ANALYZING_STEPS[step];

  return (
    <View className="flex-1" accessibilityRole="progressbar" accessibilityLabel={label}>
      <View className="overflow-hidden rounded-[26px] bg-ink" style={{ height: PREVIEW_HEIGHT }}>
        <Image source={{ uri: imageUri }} contentFit="cover" style={{ flex: 1, opacity: 0.7 }} />
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#FFF4D6', shadowColor: '#FFD98A', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
            sweepStyle,
          ]}
        />
      </View>

      <T variant="label" className="mt-5 text-accent">
        {label}…
      </T>

      <Animated.View style={pulseStyle}>
        <View className="mt-4 gap-3">
          <View className="h-7 w-3/4 rounded-lg bg-chip" />
          <View className="flex-row gap-2">
            <View className="h-6 w-24 rounded-full bg-chip" />
            <View className="h-6 w-24 rounded-full bg-chip" />
            <View className="h-6 w-16 rounded-full bg-chip" />
          </View>
          <View className="h-4 w-full rounded bg-line" />
          <View className="h-4 w-5/6 rounded bg-line" />
        </View>
      </Animated.View>
    </View>
  );
}
