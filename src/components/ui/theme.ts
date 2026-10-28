import { vars } from 'nativewind';

/**
 * Three worlds share one set of colour tokens (see tailwind.config.js).
 * - home: cream paper and forest ink, the scrapbook
 * - hike: sage field guide with an ember accent
 * - night: wine glass: a lighter wine with translucent cards over glows taken
 *   from the places themselves (club magenta, sunset amber, beach teal)
 */
export type World = 'home' | 'hike' | 'night';

type Palette = {
  paper: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  chip: string;
  accent: string;
  onAccent: string;
  alert: string;
};

// Hex values; NativeWind needs them as "r g b" triplets, done in worldVars().
export const PALETTES: Record<World, Palette> = {
  home: {
    paper: '#EFE8DA',
    card: '#F8F4EA',
    ink: '#2F3B33',
    muted: '#736D5E',
    line: '#DCD3C1',
    chip: '#E6DFCF',
    accent: '#3F5A48',
    onAccent: '#F8F4EA',
    alert: '#8C2F2B',
  },
  hike: {
    paper: '#E3E7D8',
    card: '#F5F4EA',
    ink: '#28372C',
    muted: '#66705F',
    line: '#CDD3C0',
    chip: '#D6DCC7',
    accent: '#D9622C',
    onAccent: '#FFF8EE',
    alert: '#A4501A',
  },
  night: {
    // Cards sit only a shade above the background, so they read like tinted
    // glass over wine rather than boxes on black.
    paper: '#3D1522',
    card: '#5E2638',
    ink: '#FCEFE8',
    muted: '#DDB4B6',
    line: '#7A3C4F',
    chip: '#56202F',
    accent: '#FF93AA',
    onAccent: '#3D1522',
    alert: '#FFC685',
  },
};

const triplet = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const VARS = Object.fromEntries(
  (Object.keys(PALETTES) as World[]).map((world) => {
    const p = PALETTES[world];
    return [
      world,
      vars({
        '--paper': triplet(p.paper),
        '--card': triplet(p.card),
        '--ink': triplet(p.ink),
        '--muted': triplet(p.muted),
        '--line': triplet(p.line),
        '--chip': triplet(p.chip),
        '--accent': triplet(p.accent),
        '--on-accent': triplet(p.onAccent),
        '--alert': triplet(p.alert),
      }),
    ];
  }),
) as Record<World, ReturnType<typeof vars>>;

/** Style that repaints every token-based class underneath it. */
export const worldVars = (world: World) => VARS[world];

export const isDark = (world: World) => world === 'night';
