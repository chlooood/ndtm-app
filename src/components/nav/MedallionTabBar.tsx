import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CocktailMedallion, FingerprintMedallion, StampMedallion } from '@/components/nav/Medallions';
import { PALETTES, type World, worldVars } from '@/components/ui/theme';

const TABS = {
  'night-out': { label: 'NIGHT OUT', world: 'night', Medallion: CocktailMedallion, size: 58 },
  home: { label: 'HOME', world: 'home', Medallion: FingerprintMedallion, size: 70 },
  stroll: { label: 'STROLL AROUND', world: 'hike', Medallion: StampMedallion, size: 58 },
} as const satisfies Record<string, { label: string; world: World; Medallion: unknown; size: number }>;

type TabName = keyof typeof TABS;

const WORLD_ORDER: World[] = ['home', 'hike', 'night'];

/** Bottom bar of three sticker medallions. It takes on the colours of the tab you're in. */
export function MedallionTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = TABS[state.routes[state.index].name as TabName]?.world ?? 'home';
  const p = PALETTES[current];

  // The bar's paper colour glides between worlds in step with the screen cross-fade.
  const worldIndex = useSharedValue(WORLD_ORDER.indexOf(current));
  useEffect(() => {
    worldIndex.set(withTiming(WORLD_ORDER.indexOf(current), { duration: 650, easing: Easing.bezier(0.33, 0, 0.2, 1) }));
  }, [current, worldIndex]);
  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(worldIndex.value, [0, 1, 2], WORLD_ORDER.map((w) => PALETTES[w].card)),
    borderTopColor: interpolateColor(worldIndex.value, [0, 1, 2], WORLD_ORDER.map((w) => PALETTES[w].line)),
  }));

  return (
    <Animated.View
      style={[
        worldVars(current),
        { paddingBottom: Math.max(insets.bottom, 10), borderTopWidth: 1, shadowColor: '#3B2E1A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
        { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 16, paddingTop: 12 },
        barStyle,
      ]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name as TabName];
        if (!tab) return null;
        const focused = state.index === index;
        const { Medallion } = tab;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label.toLowerCase()}
            onPress={() => {
              if (focused) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigateToTab(route.key);
            }}
            className="w-[30%] items-center active:opacity-80"
          >
            <View style={{ marginTop: route.name === 'home' ? -24 : 0 }}>
              <PopUp active={focused} size={tab.size}>
                <Medallion active={focused} size={tab.size} />
              </PopUp>
            </View>
            <Text numberOfLines={1} style={{ color: focused ? p.ink : p.muted }} className="mt-1.5 font-sans-semibold text-[10.5px] tracking-[1.2px]">
              {tab.label}
            </Text>
            <Svg width={40} height={6} viewBox="0 0 44 6" style={{ opacity: focused ? 1 : 0, marginTop: 2 }}>
              <Path d="M2 3c6-3 10 3 16 0s10 3 16 0 6 2 8 0" fill="none" stroke={p.accent} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

/**
 * Lifts the selected medallion with a small spring. The shadow is drawn on a
 * circle the size of the medallion, so it never shows as a square.
 */
function PopUp({ active, size, children }: { active: boolean; size: number; children: ReactNode }) {
  const lift = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    lift.set(withSpring(active ? 1 : 0, { damping: 11, stiffness: 260, mass: 0.7 }));
  }, [active, lift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * lift.value }, { scale: 1 + 0.06 * lift.value }],
    shadowOpacity: 0.12 + 0.16 * lift.value,
    shadowRadius: 4 + 6 * lift.value,
  }));

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, shadowColor: '#2B1A10', shadowOffset: { width: 0, height: 4 }, elevation: 4 },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
