// Scrapbook pieces for the Home tab: torn paper edges, tape, postmark
// stamps and polaroids. Drawn with SVG so they look the same everywhere.

import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Text as SvgText, TextPath } from 'react-native-svg';

import { T } from '@/components/ui/Text';

/** Deterministic jitter so an edge looks hand-torn but never changes between renders. */
function jagged(seed: number, steps: number, depth: number): string {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  let d = `M0 ${depth}`;
  for (let i = 1; i <= steps; i++) d += ` L${((i / steps) * 100).toFixed(2)} ${(rand() * depth).toFixed(2)}`;
  return `${d} L100 ${depth + 1} L0 ${depth + 1} Z`;
}

/** A strip that makes the top (or, flipped, the bottom) of a block look torn. */
export function TornEdge({ color, seed = 7, flip = false, height = 8 }: { color: string; seed?: number; flip?: boolean; height?: number }) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={flip ? { transform: [{ scaleY: -1 }] } : undefined}
    >
      <Path d={jagged(seed, 34, height - 1)} fill={color} />
    </Svg>
  );
}

/** A torn paper block. Children sit on the paper. */
export function PaperBlock({ color, seed = 3, children, tilt = 0 }: { color: string; seed?: number; children: ReactNode; tilt?: number }) {
  return (
    <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>
      <TornEdge color={color} seed={seed} />
      <View style={{ backgroundColor: color }}>{children}</View>
      <TornEdge color={color} seed={seed + 11} flip />
    </View>
  );
}

/** A translucent strip of masking tape. */
export function Tape({ width = 64, rotate = -8, style }: { width?: number; rotate?: number; style?: object }) {
  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', width, height: 20, backgroundColor: '#E8DCC0B8', transform: [{ rotate: `${rotate}deg` }], zIndex: 5 }, style]}
    />
  );
}

/** A round postmark with the place name around the edge. */
export function Postmark({ text, ink = '#3E5A49', kind, size = 84 }: { text: string; ink?: string; kind: 'city' | 'alpine'; size?: number }) {
  const label = `${text.toUpperCase()} · ${text.toUpperCase()} · `;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity: 0.85 }}>
      <Defs>
        <Path id="ring" d="M50 50m-33 0a33 33 0 1 1 66 0a33 33 0 1 1-66 0" />
      </Defs>
      <G fill="none" stroke={ink}>
        <Circle cx={50} cy={50} r={46} strokeWidth={2.5} />
        <Circle cx={50} cy={50} r={40} strokeWidth={1.2} />
        <Circle cx={50} cy={50} r={25} strokeWidth={1.2} strokeDasharray="2 3" />
      </G>
      <SvgText fill={ink} fontSize={11} fontFamily="DMSans_600SemiBold" letterSpacing={2}>
        <TextPath href="#ring" startOffset="2%">
          {label.slice(0, 34)}
        </TextPath>
      </SvgText>
      <G fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'alpine' ? (
          <Path d="M34 60l10-16 6 8 5-6 11 14z M41 49l3-5 3 4" />
        ) : (
          <Path d="M40 40h20l-10 12z M50 52v9 M44 61h12" />
        )}
      </G>
    </Svg>
  );
}

/** A polaroid of the scanned screenshot, or a postmark if there's no picture. */
export function Polaroid({ uri, caption, width = 112, height = 132, rotate = 3 }: { uri?: string; caption?: string; width?: number; height?: number; rotate?: number }) {
  return (
    <View
      style={{
        width,
        backgroundColor: '#FBF8F1',
        padding: 5,
        paddingBottom: caption ? 6 : 14,
        transform: [{ rotate: `${rotate}deg` }],
        shadowColor: '#3A2F1D',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
      }}
    >
      {uri ? (
        <Image source={{ uri }} contentFit="cover" style={{ width: width - 10, height: height - 24 }} />
      ) : (
        <View style={{ width: width - 10, height: height - 24, backgroundColor: '#D9E2CF' }} />
      )}
      {caption && (
        <T variant="small" numberOfLines={1} className="mt-1 text-center font-display-italic text-[12px] text-[#4A463C]">
          {caption}
        </T>
      )}
    </View>
  );
}
