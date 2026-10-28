import { type ReactNode, useEffect } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

/** Animates the sheet out, then runs `then` (dismiss, navigate, …). */
export type CloseSheet = (then: () => void) => void;

type Props = {
  onDismiss: () => void;
  children: (close: CloseSheet) => ReactNode;
  accessibilityLabel: string;
};

/** Springs up on mount; slides away before calling back. Render it only while it should show. */
export function BottomSheet({ onDismiss, children, accessibilityLabel }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const offset = useSharedValue(height);

  useEffect(() => {
    offset.set(withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 }));
  }, [offset]);

  const close: CloseSheet = (then) => {
    offset.set(
      withTiming(height, { duration: 220 }, (finished) => {
        if (finished) scheduleOnRN(then);
      }),
    );
  };

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, offset.value / height) }));

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: '#1D150C99' }, backdropStyle]}>
        <Pressable accessibilityLabel="Close" className="flex-1" onPress={() => close(onDismiss)} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel}
        style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, sheetStyle]}
      >
        {/* Reanimated views don't take NativeWind classes, so the paint lives on this inner view. */}
        <View style={{ maxHeight: height * 0.85 }} className="overflow-hidden rounded-t-[30px] border-t border-line bg-card">
          <View className="items-center pt-3">
            <View className="h-1 w-10 rounded-full bg-line" />
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
          >
            {children(close)}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}
