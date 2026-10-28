// The sky behind the Hiking tab. Scrolling walks you along a trail's
// elevation profile: the ridge silhouette pans with you, the sun rises as the
// trail climbs, and cloud gathers in the valleys and burns off on the tops.

import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { PALETTES } from '@/components/ui/theme';

/**
 * Sample profile in metres: La Flégère (1,877 m) up to Lac Blanc (2,352 m)
 * and on along the ridge. Replace with the active trail's real profile once
 * routes carry elevation data.
 */
export const SAMPLE_PROFILE = [1877, 1890, 1935, 1990, 2060, 2040, 2110, 2185, 2230, 2205, 2280, 2352, 2330, 2395, 2440, 2410, 2352];

const SCROLL_SPAN = 1000; // px of scrolling that walks the whole profile

function ridgePath(profile: number[], width: number, height: number): string {
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const step = width / (profile.length - 1);
  const y = (m: number) => height - ((m - min) / (max - min || 1)) * height * 0.8 - height * 0.1;
  let d = `M0 ${height} L0 ${y(profile[0]).toFixed(1)}`;
  for (let i = 1; i < profile.length; i++) {
    const x0 = (i - 1) * step;
    const x1 = i * step;
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)} ${y(profile[i - 1]).toFixed(1)} ${cx.toFixed(1)} ${y(profile[i]).toFixed(1)} ${x1.toFixed(1)} ${y(profile[i]).toFixed(1)}`;
  }
  return `${d} L${width} ${height} Z`;
}

function Cloud({ width, color = '#FFFFFF' }: { width: number; color?: string }) {
  return (
    <Svg width={width} height={width * 0.42} viewBox="0 0 100 42">
      <Path d="M14 38c-8 0-12-6-10-12s9-8 13-6c1-9 10-14 19-11 4-8 17-10 24-2 7-3 16 1 17 9 9-1 15 6 13 13-1 6-6 9-12 9z" fill={color} />
    </Svg>
  );
}

export function HikeSky({ scrollY, profile = SAMPLE_PROFILE }: { scrollY: SharedValue<number>; profile?: number[] }) {
  const { width } = useWindowDimensions();
  const ridgeWidth = width * 3;
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const norm = profile.map((m) => (m - min) / (max - min || 1));
  const stops = norm.map((_, i) => i / (norm.length - 1));

  // 0 → 1 as you scroll along the trail, and the normalised altitude there.
  const t = useDerivedValue(() => Math.min(1, Math.max(0, scrollY.value / SCROLL_SPAN)));
  const altitude = useDerivedValue(() => interpolate(t.value, stops, norm));

  const drift = useSharedValue(0);
  useEffect(() => {
    drift.set(withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1));
  }, [drift]);

  const skyStyle = useAnimatedStyle(() => ({
    // Hazy dawn pink in the valley, clear alpine blue on the tops.
    backgroundColor: interpolateColor(altitude.value, [0, 0.5, 1], ['#F3DCCB', '#E4E6D6', '#CFE3E6']),
  }));
  const sunStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [width * 0.12, width * 0.72]) },
      { translateY: interpolate(altitude.value, [0, 1], [150, 40]) },
      { scale: interpolate(altitude.value, [0, 1], [0.85, 1.15]) },
    ],
    opacity: interpolate(altitude.value, [0, 1], [0.55, 1]),
  }));
  const ridgeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -t.value * (ridgeWidth - width) }] }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, skyStyle]} />
      <Animated.View style={[{ position: 'absolute', left: -70, top: -70 }, sunStyle]}>
        <Svg width={140} height={140}>
          <Defs>
            <RadialGradient id="sunglow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFE6A8" stopOpacity={0.95} />
              <Stop offset="0.35" stopColor="#FFD27A" stopOpacity={0.5} />
              <Stop offset="1" stopColor="#FFD27A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={70} cy={70} r={70} fill="url(#sunglow)" />
          <Circle cx={70} cy={70} r={17} fill="#FFE9B5" />
        </Svg>
      </Animated.View>
      <CloudLayer t={t} altitude={altitude} drift={drift} speed={0.6} offset={0} top={70} cloudWidth={130} />
      <CloudLayer t={t} altitude={altitude} drift={drift} speed={1.1} offset={width * 0.6} top={150} cloudWidth={90} color="#FFFFFFD9" />
      <Animated.View style={[{ position: 'absolute', top: 230, width: ridgeWidth }, ridgeStyle]}>
        <Svg width={ridgeWidth} height={140}>
          <Path d={ridgePath(profile, ridgeWidth, 140)} fill="#B9C6AE" opacity={0.75} />
          <Path d={ridgePath([...profile].reverse().map((m, i) => m - 120 + (i % 3) * 40), ridgeWidth, 140)} fill="#7E9A80" opacity={0.25} />
        </Svg>
      </Animated.View>
      <CloudLayer t={t} altitude={altitude} drift={drift} speed={0.3} offset={width} top={300} cloudWidth={160} color="#FFFFFFBF" />
      {/* Below the ridge the page returns to plain paper, so cards and text stay calm. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 369, bottom: 0, backgroundColor: PALETTES.hike.paper }} />
    </View>
  );
}

type CloudLayerProps = {
  t: SharedValue<number>;
  altitude: SharedValue<number>;
  drift: SharedValue<number>;
  /** How fast the cloud slides past as you scroll (parallax). */
  speed: number;
  offset: number;
  top: number;
  cloudWidth: number;
  color?: string;
};

/** One cloud: drifts on its own, slides with scrolling, thins out at altitude. */
function CloudLayer({ t, altitude, drift, speed, offset, top, cloudWidth, color }: CloudLayerProps) {
  const { width } = useWindowDimensions();
  const style = useAnimatedStyle(() => {
    const loop = width * 1.4;
    const x = (((offset + drift.value * loop - t.value * width * speed) % loop) + loop) % loop;
    return {
      opacity: interpolate(altitude.value, [0, 1], [0.95, 0.25]),
      transform: [{ translateX: x - width * 0.2 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', top }, style]}>
      <Cloud width={cloudWidth} color={color} />
    </Animated.View>
  );
}
