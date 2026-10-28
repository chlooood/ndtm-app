import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

// Soft light behind the Night out tab in the colours of the places it lists.
// Each filter has its own mood; switching filters cross-fades between them
// while every glow keeps drifting slowly, like light moving through wine.

export type GlowMood = 'all' | 'clubs' | 'beaches' | 'restaurants';

type Glow = { cx: string; cy: string; r: string; color: string; opacity: number };

const MOODS: Record<GlowMood, Glow[]> = {
  // A bit of everything: club magenta, sunset amber, beach teal.
  all: [
    { cx: '18%', cy: '14%', r: '55%', color: '#E2407E', opacity: 0.45 },
    { cx: '92%', cy: '42%', r: '50%', color: '#FF9A4A', opacity: 0.28 },
    { cx: '20%', cy: '88%', r: '55%', color: '#2BA3A6', opacity: 0.25 },
  ],
  // Strobes and smoke: magenta, violet, hot pink.
  clubs: [
    { cx: '15%', cy: '20%', r: '60%', color: '#E2407E', opacity: 0.55 },
    { cx: '85%', cy: '35%', r: '55%', color: '#7B4DE0', opacity: 0.42 },
    { cx: '45%', cy: '90%', r: '50%', color: '#FF5FA2', opacity: 0.3 },
  ],
  // Late afternoon at the sea: teal water, sunset, warm sand.
  beaches: [
    { cx: '80%', cy: '12%', r: '55%', color: '#FF9A4A', opacity: 0.45 },
    { cx: '15%', cy: '55%', r: '60%', color: '#2BA3A6', opacity: 0.45 },
    { cx: '70%', cy: '92%', r: '50%', color: '#F5C77E', opacity: 0.3 },
  ],
  // Candlelight: amber, terracotta, a little rosé.
  restaurants: [
    { cx: '25%', cy: '22%', r: '55%', color: '#FFB25B', opacity: 0.45 },
    { cx: '88%', cy: '60%', r: '55%', color: '#D2603A', opacity: 0.38 },
    { cx: '20%', cy: '92%', r: '45%', color: '#C2405F', opacity: 0.3 },
  ],
};

const MOOD_NAMES = Object.keys(MOODS) as GlowMood[];

function MoodLayer({ mood, active }: { mood: GlowMood; active: boolean }) {
  const shown = useSharedValue(active ? 1 : 0);
  const drift = useSharedValue(0);

  useEffect(() => {
    shown.set(withTiming(active ? 1 : 0, { duration: 1100, easing: Easing.inOut(Easing.quad) }));
  }, [active, shown]);

  useEffect(() => {
    // Each mood drifts on its own period so the layers never move in lockstep.
    const period = 9000 + MOOD_NAMES.indexOf(mood) * 1700;
    drift.set(withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [drift, mood]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: -24 + drift.value * 48 }, { translateY: 18 - drift.value * 36 }, { scale: 1.05 + drift.value * 0.08 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          {MOODS[mood].map((g, i) => (
            <RadialGradient key={i} id={`${mood}-${i}`} cx={g.cx} cy={g.cy} r={g.r} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={g.color} stopOpacity={g.opacity} />
              <Stop offset="1" stopColor={g.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {MOODS[mood].map((_, i) => (
          <Rect key={i} width="100%" height="100%" fill={`url(#${mood}-${i})`} />
        ))}
      </Svg>
    </Animated.View>
  );
}

export function NightGlow({ mood = 'all' }: { mood?: GlowMood }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {MOOD_NAMES.map((m) => (
        <MoodLayer key={m} mood={m} active={m === mood} />
      ))}
    </View>
  );
}
