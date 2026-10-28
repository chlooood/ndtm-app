// The imprint map: everywhere you've been, drawn in your chosen pattern over
// a quiet paper map. Patterns come from the moodboard:
//   silk   – your route as flowing ribbons of patchwork print, edged with
//            thin contour lines (the silk-museum poster)
//   rings  – each place as tree rings in red ink (Tizón)
//   cells  – each place filled with cells, like a cut stone
//   canopy – green leafy crowns joined by branches
// Places still ahead are drawn as dashed outlines.

import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import land50 from 'world-atlas/land-50m.json';

import type { ImprintPattern } from '@/lib/profile/ProfileContext';

export type ImprintPlace = {
  name: string;
  lat: number;
  lng: number;
  /** Nights spent there; bigger imprints for longer stays. */
  nights: number;
  /** True once the stay has started. */
  been: boolean;
  /** Order along your travels, for the silk route. */
  order: number;
};

const LAND = feature(land50 as unknown as Topology, (land50 as unknown as Topology).objects.land as GeometryCollection);

export const INK = { silk: '#C9583E', rings: '#D94B3D', cells: '#C8483C', canopy: '#4F6B3A' } as const;

/** Small deterministic noise so each place gets its own wobbly outline. */
function seeded(name: string) {
  let h = 2166136261;
  for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    return ((h >>> 0) % 10000) / 10000;
  };
}

function blob(cx: number, cy: number, r: number, name: string, k = 1): string {
  const rnd = seeded(name);
  const a1 = rnd() * 6;
  const a2 = rnd() * 6;
  const pts = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const w = 1 + 0.18 * Math.sin(3 * a + a1) + 0.09 * Math.sin(5 * a + a2);
    return [cx + Math.cos(a) * r * k * w, cy + Math.sin(a) * r * k * w];
  });
  return `M${pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join('L')}Z`;
}

/** A gently curving segment between two points, bowed to one side. */
function curve(a: [number, number], b: [number, number], bow: number): string {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bow;
  const cy = my + (dx / len) * bow;
  return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

export function ImprintMap({ places, pattern, width, height }: { places: ImprintPlace[]; pattern: ImprintPattern; width: number; height: number }) {
  const ink = INK[pattern];

  const { landPath, gratPath, projected } = useMemo(() => {
    // Fit the map to your places, with a minimum span so a single city still shows its region.
    const lngs = places.map((p) => p.lng);
    const lats = places.map((p) => p.lat);
    const [cLng, cLat] = places.length ? [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2] : [6, 46];
    const halfLng = Math.max(6, places.length ? (Math.max(...lngs) - Math.min(...lngs)) / 2 + 2 : 10);
    const halfLat = Math.max(4, places.length ? (Math.max(...lats) - Math.min(...lats)) / 2 + 2 : 8);
    const frame = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'MultiPoint' as const,
        coordinates: [
          [cLng - halfLng, cLat - halfLat],
          [cLng + halfLng, cLat + halfLat],
        ],
      },
    };
    const projection = geoMercator().fitExtent(
      [
        [16, 16],
        [width - 16, height - 16],
      ],
      frame,
    );
    const path = geoPath(projection);
    return {
      landPath: path(LAND) ?? '',
      gratPath: path(geoGraticule10()) ?? '',
      projected: places.map((p) => ({ ...p, xy: projection([p.lng, p.lat]) as [number, number] })),
    };
  }, [places, width, height]);

  const radius = (n: number) => 12 + Math.min(18, n * 3);
  const been = projected.filter((p) => p.been).sort((a, b) => a.order - b.order);
  const ahead = projected.filter((p) => !p.been);

  // Labels sit below each place; one that would collide with an earlier label moves above instead.
  const labelled: { p: (typeof projected)[number]; y: number }[] = [];
  for (const p of projected) {
    const below = p.xy[1] + radius(p.nights) + 14;
    const clash = labelled.some((l) => Math.abs(l.p.xy[0] - p.xy[0]) < 70 && Math.abs(l.y - below) < 14);
    labelled.push({ p, y: clash ? p.xy[1] - radius(p.nights) - 8 : below });
  }

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <ClipPath id="frame">
          <Rect width={width} height={height} rx={18} />
        </ClipPath>
        <PatternDefs ink={ink} />
      </Defs>
      <G clipPath="url(#frame)">
        <Rect width={width} height={height} fill="#F2ECDE" />
        <Path d={gratPath} fill="none" stroke="#DCD3C1" strokeWidth={0.6} />
        <Path d={landPath} fill="#E6DFCD" stroke="#CFC5AE" strokeWidth={0.8} />

        {pattern === 'silk' &&
          been.slice(1).map((p, i) => {
            const a = been[i].xy;
            const b = p.xy;
            const d = curve(a, b, 30 * (i % 2 ? -1 : 1));
            const print = `print${i % 4}`;
            return (
              <G key={`${p.name}-${i}`}>
                <Path d={d} stroke={ink} strokeWidth={28} strokeLinecap="round" fill="none" />
                <Path d={d} stroke={`url(#${print})`} strokeWidth={25} strokeLinecap="round" fill="none" />
                {[-19, 19, 26].map((o) => (
                  <Path key={o} d={curve([a[0], a[1] + o], [b[0], b[1] + o], 30 * (i % 2 ? -1 : 1) + o / 2)} stroke={ink} strokeWidth={0.8} fill="none" />
                ))}
              </G>
            );
          })}

        {pattern === 'canopy' &&
          been.slice(1).map((p, i) => (
            <Path key={`branch-${i}`} d={curve(been[i].xy, p.xy, 18)} stroke="#6B4E32" strokeWidth={5} strokeLinecap="round" fill="none" />
          ))}

        {been.map((p) => {
          const r = radius(p.nights);
          const [x, y] = p.xy;
          if (pattern === 'rings') {
            const rings = 5 + Math.min(6, p.nights);
            return (
              <G key={p.name}>
                <Path d={blob(x, y, r, p.name, 1.12)} fill={ink} />
                <Path d={blob(x, y, r, p.name, 1.0)} fill="#F6EEE4" />
                {Array.from({ length: rings }, (_, k) => (
                  <Path key={k} d={blob(x, y, r, p.name, ((k + 1) / (rings + 1)) * 0.95)} fill="none" stroke={ink} strokeWidth={0.9} />
                ))}
              </G>
            );
          }
          const fill = pattern === 'cells' ? 'url(#cells)' : pattern === 'canopy' ? 'url(#leaves)' : 'url(#print1)';
          return (
            <G key={p.name}>
              <Path d={blob(x, y, r, p.name, 1.08)} fill={pattern === 'canopy' ? '#DDE6C4' : '#F6EEE4'} stroke={ink} strokeWidth={1.2} />
              <Path d={blob(x, y, r, p.name, 0.98)} fill={fill} />
            </G>
          );
        })}

        {ahead.map((p) => (
          <Path key={`ahead-${p.name}`} d={blob(p.xy[0], p.xy[1], radius(p.nights), p.name)} fill="none" stroke={ink} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7} />
        ))}

        {labelled.map(({ p, y }) => (
          <G key={`label-${p.name}`}>
            <Circle cx={p.xy[0]} cy={p.xy[1]} r={2} fill="#2F3B33" />
            <SvgText x={p.xy[0]} y={y} fill="#2F3B33" fontSize={10} fontFamily="DMSans_600SemiBold" letterSpacing={1.4} textAnchor="middle">
              {p.name.toUpperCase()}
            </SvgText>
          </G>
        ))}
      </G>
    </Svg>
  );
}

/** Paint servers for the patterns. Kept small so they tile cheaply. */
export function PatternDefs({ ink }: { ink: string }) {
  return (
    <>
      {/* Silk prints: dots, florals, stripes, checks */}
      <Pattern id="print0" patternUnits="userSpaceOnUse" width={14} height={14}>
        <Rect width={14} height={14} fill="#E8523F" />
        <Circle cx={4} cy={4} r={2.2} fill="#F7C9B8" />
        <Circle cx={11} cy={10} r={1.6} fill="#F7C9B8" />
      </Pattern>
      <Pattern id="print1" patternUnits="userSpaceOnUse" width={22} height={22}>
        <Rect width={22} height={22} fill="#F2B544" />
        <Circle cx={11} cy={11} r={6} fill="#F7DFA0" />
        <Circle cx={11} cy={11} r={2.4} fill="#C9583E" />
        <Circle cx={0} cy={0} r={3} fill="#E8523F" />
        <Circle cx={22} cy={22} r={3} fill="#E8523F" />
      </Pattern>
      <Pattern id="print2" patternUnits="userSpaceOnUse" width={10} height={10}>
        <Rect width={10} height={10} fill="#2E3A6B" />
        <Path d="M0 10L10 0" stroke="#E07A4F" strokeWidth={2.4} />
      </Pattern>
      <Pattern id="print3" patternUnits="userSpaceOnUse" width={12} height={12}>
        <Rect width={12} height={12} fill="#F4E7D6" />
        <Rect width={6} height={6} fill="#D2603A" />
        <Rect x={6} y={6} width={6} height={6} fill="#D2603A" />
        <Circle cx={9} cy={3} r={1.2} fill="#5C7A9C" />
      </Pattern>
      {/* Cells: an irregular honeycomb */}
      <Pattern id="cells" patternUnits="userSpaceOnUse" width={18} height={15.6}>
        <Rect width={18} height={15.6} fill="#F6EEE4" />
        <Path d="M4.5 0L13.5 0L18 7.8L13.5 15.6L4.5 15.6L0 7.8Z" fill="none" stroke={ink} strokeWidth={1} />
        <Path d="M9 4L11 7.8L9 11.6L6.6 7.8Z" fill="none" stroke={ink} strokeWidth={0.6} opacity={0.6} />
      </Pattern>
      {/* Canopy: leaf veins */}
      <Pattern id="leaves" patternUnits="userSpaceOnUse" width={16} height={16}>
        <Rect width={16} height={16} fill="#8FAA5C" />
        <Path d="M2 14C6 10 9 6 14 2M6 10l-3-2M8 8l1-4M10 6l3 1M4 12l-2-1" stroke="#3E5A2C" strokeWidth={1} fill="none" strokeLinecap="round" />
        <Path d="M2 6c2-1 3-2 4-4" stroke="#C7D89A" strokeWidth={0.8} fill="none" />
      </Pattern>
    </>
  );
}
