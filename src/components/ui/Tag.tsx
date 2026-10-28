import { Text, View } from 'react-native';

const TONES = {
  cyan: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan',
  magenta: 'border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta',
  lime: 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime',
  amber: 'border-neon-amber/40 bg-neon-amber/10 text-neon-amber',
  muted: 'border-ink-600 bg-ink-800 text-mist-400',
} as const;

export type TagTone = keyof typeof TONES;

export function Tag({ label, tone = 'muted', mono }: { label: string; tone?: TagTone; mono?: boolean }) {
  const [border, bg, text] = TONES[tone].split(' ');
  return (
    <View className={`rounded-full border px-3 py-1 ${border} ${bg}`}>
      <Text className={`text-xs ${text} ${mono ? 'font-mono' : 'font-medium'}`}>{label}</Text>
    </View>
  );
}
