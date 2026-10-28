import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { CameraIcon, PhotosIcon } from '@/components/ui/Icons';
import { T } from '@/components/ui/Text';
import { PALETTES } from '@/components/ui/theme';
import type { ScanSource } from '@/lib/scanner/scanImage';

const { accent, ink } = PALETTES.home;

/** A paper drop zone with a slowly breathing dashed edge. Tap for the camera roll, or use the camera chip. */
export function DropZone({ onPick, disabled }: { onPick: (source: ScanSource) => void; disabled?: boolean }) {
  const breathe = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    breathe.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [breathe]);

  const edgeStyle = useAnimatedStyle(() => ({ opacity: 0.35 + breathe.value * 0.45 }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  const pick = (source: ScanSource) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPick(source);
  };

  return (
    <Animated.View style={[{ flex: 1 }, scaleStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a screenshot from your camera roll"
        disabled={disabled}
        onPress={() => pick('library')}
        onPressIn={() => press.set(withSpring(0.985))}
        onPressOut={() => press.set(withSpring(1))}
        className="flex-1 overflow-hidden rounded-[30px] bg-card"
      >
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', inset: 10, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: accent }, edgeStyle]}
        />
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-sage">
            <PhotosIcon color={ink} />
          </View>
          <T variant="title" className="text-center">
            Drop in a screenshot
          </T>
          <T variant="muted" className="mt-2 text-center">
            A Reel, a TikTok, an AllTrails page or a club flyer. We find the place and work out how to get there from Lyon.
          </T>
          <T variant="label" className="mt-6 text-accent">
            Tap to open your camera roll
          </T>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Take a photo instead"
        disabled={disabled}
        onPress={() => pick('camera')}
        className="absolute bottom-6 flex-row items-center gap-2 self-center rounded-full bg-ink px-4 py-2.5 active:opacity-80"
      >
        <CameraIcon color={PALETTES.home.card} size={17} />
        <Text className="font-sans-semibold text-[14px] text-paper">Use camera</Text>
      </Pressable>
    </Animated.View>
  );
}
