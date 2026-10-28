// The three sticker-like tab icons from the scrapbook prototype.
// Each is drawn in layers (plain SVG) and animated by moving or fading the
// layers with Reanimated, which works the same on native and web.
//   Night out: a pink grapefruit cocktail; selected, it becomes a photo of the
//   glass, now deep red, held in a hand.
//   Home: a fingerprint; its lines turn from dark to white on forest green.
//   Hiking: a postage stamp; the moonlit forest turns sunlit and a sun rises.

import { useEffect } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = { active: boolean; size: number };

const fill = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } as const;

/** 0 → 1 as the tab becomes active. */
function useProgress(active: boolean, duration = 420) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(active ? 1 : 0, { duration, easing: Easing.bezier(0.3, 0.9, 0.3, 1) }));
  }, [active, duration, p]);
  return p;
}

/* ---------------- Night out: cocktail ---------------- */

type Drink = { liquid: [string, string]; flesh: string; pith: string; rind: string; ice: number };
const PINK: Drink = { liquid: ['#F9A193', '#EC6F60'], flesh: '#F2604F', pith: '#FFE0CC', rind: '#F28A45', ice: 0.42 };

// Top-down grapefruit cocktail, after the inspiration board: a half-wheel of
// grapefruit on the right, ice on the left, a thyme sprig across the middle.
function Glass({ size, drink, id }: { size: number; drink: Drink; id: string }) {
  const segments = Array.from({ length: 7 }, (_, i) => -90 + (i + 1) * (180 / 8));
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${id}-liquid`} cx="42%" cy="40%" r="62%">
          <Stop offset="0" stopColor={drink.liquid[0]} />
          <Stop offset="1" stopColor={drink.liquid[1]} />
        </RadialGradient>
        <ClipPath id={`${id}-clip`}>
          <Circle cx={50} cy={50} r={38.5} />
        </ClipPath>
      </Defs>
      {/* coaster, glass wall, liquid */}
      <Circle cx={50} cy={50} r={48} fill="#F8F1E8" />
      <Circle cx={50} cy={50} r={43.5} fill="#F7DCD5" stroke="#FFFFFF" strokeWidth={1.6} />
      <Circle cx={50} cy={50} r={38.5} fill={`url(#${id}-liquid)`} />
      <G clipPath={`url(#${id}-clip)`}>
        {/* grapefruit half-wheel */}
        <Path d="M51 13 A37 37 0 0 1 51 87 Z" fill={drink.rind} />
        <Path d="M51 15.5 A34.5 34.5 0 0 1 51 84.5 Z" fill={drink.pith} />
        <Path d="M51 18 A32 32 0 0 1 51 82 Z" fill={drink.flesh} />
        <G stroke={drink.pith} strokeWidth={1.1} strokeLinecap="round">
          {segments.map((a) => {
            const r = (a * Math.PI) / 180;
            return <Path key={a} d={`M51 50 L${(51 + Math.cos(r) * 31).toFixed(1)} ${(50 + Math.sin(r) * 31).toFixed(1)}`} />;
          })}
        </G>
        <Circle cx={51} cy={50} r={1.6} fill={drink.pith} />
        {/* ice */}
        <G fill="#FFFFFF" fillOpacity={drink.ice} stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={0.9}>
          <Rect x={20} y={28} width={18} height={17} rx={4} transform="rotate(14 29 36)" />
          <Rect x={17} y={53} width={17} height={16} rx={4} transform="rotate(-10 25 61)" />
          <Rect x={33} y={66} width={15} height={14} rx={3.5} transform="rotate(22 40 73)" />
        </G>
        <Path d="M23 31 l6 1.5 M20 56 l5 -1" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.2} strokeLinecap="round" />
      </G>
      {/* glass highlight */}
      <Path d="M18 30 A38 38 0 0 1 36 14" fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={1.8} strokeLinecap="round" />
      {/* thyme */}
      <G stroke="#4F6A3E" strokeLinecap="round">
        <Path d="M33 25 Q46 42 62 66" fill="none" strokeWidth={1.1} />
        {[0.15, 0.3, 0.45, 0.6, 0.75, 0.88].map((t, i) => {
          const x = 33 + 29 * t;
          const y = 25 + 41 * t;
          const flip = i % 2 ? 1 : -1;
          return (
            <G key={t}>
              <Ellipse cx={x + 3.2} cy={y - 1.6 * flip} rx={2.6} ry={1} fill="#6C8A50" stroke="none" transform={`rotate(${-20 * flip} ${x} ${y})`} />
              <Ellipse cx={x - 3.2} cy={y + 1.6 * flip} rx={2.6} ry={1} fill="#5F7D48" stroke="none" transform={`rotate(${-20 * flip} ${x} ${y})`} />
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

// The selected state is a photo: the glass held from the left, cut out of its
// background (assets/images/night-out-glass.webp). In the source crop the
// glass is centred at (470, 350) with a radius of 298 px, out of 800 × 700.
const PHOTO = { width: 800, height: 700, cx: 470, cy: 350, r: 298 };
const HELD_GLASS = require('../../../assets/images/night-out-glass.webp');

export function CocktailMedallion({ active, size }: Props) {
  const p = useProgress(active, 420);
  // Scale the photo so its glass lines up with the drawn glass (r = 43.5 of 100).
  const k = (0.435 * size) / PHOTO.r;
  const idleStyle = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ rotate: `${-6 * p.value}deg` }],
  }));
  const heldStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    // The hand reaches in from the left as the photo fades up.
    transform: [{ translateX: -0.18 * size * (1 - p.value) }, { scale: 0.96 + 0.04 * p.value }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[fill, idleStyle]}>
        <Glass size={size} drink={PINK} id="pink" />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: size / 2 - PHOTO.cx * k, top: size / 2 - PHOTO.cy * k, width: PHOTO.width * k, height: PHOTO.height * k },
          heldStyle,
        ]}
      >
        <Image source={HELD_GLASS} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  );
}

/* ---------------- Home: fingerprint ---------------- */

const FINGER_LINES = [
  'M16 50C15 26 38 12 60 19c19 6 29 23 23 44',
  'M24 66C15 42 32 26 50 26c25 0 36 22 27 45',
  'M32 78C21 56 29 37 45 34c23-5 36 14 27 35',
  'M41 84C32 64 35 46 49 43c17-2 26 11 18 28',
  'M50 85C42 69 44 54 54 52c11-2 15 9 9 20',
  'M57 67Q52 61 56 59',
  'M20 78Q34 62 47 80Q66 104 82 76',
];

function Fingerprint({ size, base, line }: { size: number; base: string; line: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={48} fill="#F7F2E6" />
      <Circle cx={50} cy={50} r={44} fill={base} />
      <G fill="none" stroke={line} strokeWidth={3.6} strokeLinecap="round">
        {FINGER_LINES.map((d) => (
          <Path key={d} d={d} />
        ))}
      </G>
    </Svg>
  );
}

export function FingerprintMedallion({ active, size }: Props) {
  const p = useProgress(active, 450);
  const whiteStyle = useAnimatedStyle(() => ({ opacity: p.value }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.05 * Math.sin(p.value * Math.PI) }] }));
  return (
    <Animated.View style={[{ width: size, height: size }, pressStyle]}>
      <Fingerprint size={size} base="#E3E8DC" line="#34493C" />
      <Animated.View style={[fill, whiteStyle]}>
        <Fingerprint size={size} base="#3F5A48" line="#FAF6EA" />
      </Animated.View>
    </Animated.View>
  );
}

/* ---------------- Hiking: postage stamp ---------------- */

function Landscape({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="stampclip">
          <Circle cx={50} cy={50} r={40} />
        </ClipPath>
      </Defs>
      <Circle cx={50} cy={50} r={46} fill="#F3EEE0" />
      <Circle cx={50} cy={50} r={47} fill="none" stroke="#F3EEE0" strokeWidth={5} strokeDasharray="0.1 5.2" strokeLinecap="round" />
      <G clipPath="url(#stampclip)">
        <Rect width={100} height={100} fill="#B7D3CF" />
        <Path d="M0 70 32 26l16 22 13-15 39 44Z" fill="#8AA09A" />
        <Path d="M27 33l5-7 8 11-8-4Z" fill="#F4F2E6" />
        <Path d="M0 76Q42 56 100 74v30H0Z" fill="#6F8F77" />
        <Path d="M0 90Q45 66 100 88v20H0Z" fill="#37563F" />
        <Path d="M20 92V52m-8 15 8-11 8 11M74 96V46m-10 19 10-14 11 14" stroke="#27432F" strokeWidth={3.6} strokeLinecap="round" fill="none" />
      </G>
      <Circle cx={50} cy={50} r={40} fill="none" stroke="#E1D9C6" strokeWidth={2} />
    </Svg>
  );
}

function Night({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="nightclip">
          <Circle cx={50} cy={50} r={40} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#nightclip)">
        <Rect width={100} height={100} fill="#14233A" opacity={0.72} />
        <Path d="M70 21a10 10 0 1 0 11 15 10 10 0 0 1-11-15" fill="#EEE7C3" />
        <G fill="#EEE7C3">
          <Circle cx={30} cy={18} r={1} />
          <Circle cx={46} cy={12} r={0.8} />
          <Circle cx={58} cy={26} r={0.7} />
          <Circle cx={22} cy={30} r={0.7} />
        </G>
      </G>
    </Svg>
  );
}

function Sun({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M16 1v4M16 27v4M1 16h4M27 16h4M5.4 5.4l2.8 2.8M23.8 23.8l2.8 2.8M26.6 5.4l-2.8 2.8M8.2 23.8l-2.8 2.8" stroke="#E8B45A" strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={16} cy={16} r={8} fill="#EAB45B" stroke="#FFF6DC" strokeWidth={2.5} />
    </Svg>
  );
}

/** Warm morning light that blooms inside the stamp as the night lifts. */
function Halo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="halo" cx="78%" cy="22%" r="70%">
          <Stop offset="0" stopColor="#FFE7A6" stopOpacity={0.85} />
          <Stop offset="0.5" stopColor="#FFD9A0" stopOpacity={0.25} />
          <Stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id="haloclip">
          <Circle cx={50} cy={50} r={40} />
        </ClipPath>
      </Defs>
      <Rect width={100} height={100} fill="url(#halo)" clipPath="url(#haloclip)" />
    </Svg>
  );
}

export function StampMedallion({ active, size }: Props) {
  // Slow and soft: night lifts over 1.4 s, like dawn rather than a switch.
  const p = useProgress(active, 1400);
  const spin = useSharedValue(0);
  const cloud = useSharedValue(0);
  const sunSize = size * 0.34;

  useEffect(() => {
    if (active) {
      spin.set(withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1));
      cloud.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true));
    } else {
      cancelAnimation(spin);
      cancelAnimation(cloud);
    }
  }, [active, spin, cloud]);

  const nightStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: p.value }));
  const cloudStyle = useAnimatedStyle(() => ({
    opacity: p.value * 0.9,
    transform: [{ translateX: -size * 0.25 + cloud.value * size * 0.35 }],
  }));
  const sunStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, p.value * 1.6 - 0.6),
    transform: [{ translateY: 10 * (1 - p.value) }, { scale: 0.4 + 0.6 * p.value }, { rotate: `${spin.value}deg` }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Landscape size={size} />
      <Animated.View style={[fill, haloStyle]}>
        <Halo size={size} />
      </Animated.View>
      {/* A small cloud drifting across the sunlit sky, kept inside the stamp's circle. */}
      <View style={{ position: 'absolute', left: size * 0.1, top: size * 0.1, width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4, overflow: 'hidden' }}>
        <Animated.View style={[{ position: 'absolute', top: size * 0.14, left: size * 0.2 }, cloudStyle]}>
          <Svg width={size * 0.32} height={size * 0.14} viewBox="0 0 100 42">
            <Path d="M14 38c-8 0-12-6-10-12s9-8 13-6c1-9 10-14 19-11 4-8 17-10 24-2 7-3 16 1 17 9 9-1 15 6 13 13-1 6-6 9-12 9z" fill="#FFFFFF" />
          </Svg>
        </Animated.View>
      </View>
      <Animated.View style={[fill, nightStyle]}>
        <Night size={size} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: -sunSize * 0.2, right: -sunSize * 0.2, width: sunSize, height: sunSize }, sunStyle]}>
        <Sun size={sunSize} />
      </Animated.View>
    </View>
  );
}
