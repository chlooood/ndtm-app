import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { NEON_CYAN, NEON_MAGENTA } from '@/components/ui/theme';
import type { ScanSource } from '@/lib/scanner/scanImage';

type Props = {
  onPick: (source: ScanSource) => void;
  disabled?: boolean;
};

/** Tactile canvas with a breathing neon border. Tap for camera roll, or use the camera chip. */
export function NeonDropZone({ onPick, disabled }: Props) {
  const glow = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    glow.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + glow.value * 0.55,
    shadowOpacity: 0.35 + glow.value * 0.5,
    shadowRadius: 12 + glow.value * 16,
  }));
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
        onPressIn={() => press.set(withSpring(0.98))}
        onPressOut={() => press.set(withSpring(1))}
        className="flex-1"
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              inset: 0,
              borderRadius: 32,
              borderWidth: 1.5,
              borderColor: NEON_CYAN,
              shadowColor: NEON_CYAN,
              shadowOffset: { width: 0, height: 0 },
            },
            glowStyle,
          ]}
        />
        <View className="m-2 flex-1 items-center justify-center rounded-[26px] border border-dashed border-neon-cyan/30 bg-ink-900 px-8">
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-neon-cyan/10">
            <SymbolView
              name={{ ios: 'photo.stack', android: 'photo_library', web: 'photo_library' }}
              tintColor={NEON_CYAN}
              size={36}
            />
          </View>
          <Text className="text-center text-2xl font-semibold text-mist">Drop the vibe here</Text>
          <Text className="mt-2 text-center text-base leading-6 text-mist-400">
            A Reel, a TikTok freeze-frame, an AllTrails page or a hut blog. We&apos;ll work out where it is and how to get there.
          </Text>
          <Text className="mt-6 font-mono text-xs uppercase tracking-[3px] text-neon-cyan">Tap to open camera roll</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Take a photo instead"
        disabled={disabled}
        onPress={() => pick('camera')}
        className="absolute bottom-6 self-center flex-row items-center gap-2 rounded-full border border-neon-magenta/50 bg-ink-800 px-4 py-2 active:opacity-70"
      >
        <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} tintColor={NEON_MAGENTA} size={16} />
        <Text className="text-sm font-medium text-mist">Use camera</Text>
      </Pressable>
    </Animated.View>
  );
}
