import { Text, View } from 'react-native';

const TONES = {
  accent: { box: 'border-accent/40 bg-accent/10', text: 'text-accent' },
  hike: { box: 'border-forest/30 bg-sage', text: 'text-forest' },
  night: { box: 'border-wine/25 bg-blush', text: 'text-wine' },
  alert: { box: 'border-alert/40 bg-alert/10', text: 'text-alert' },
  muted: { box: 'border-line bg-chip', text: 'text-muted' },
} as const;

export type TagTone = keyof typeof TONES;

export function Tag({ label, tone = 'muted', mono }: { label: string; tone?: TagTone; mono?: boolean }) {
  const t = TONES[tone];
  return (
    <View className={`rounded-full border px-2.5 py-1 ${t.box}`}>
      <Text className={`text-[12px] ${t.text} ${mono ? 'font-mono' : 'font-sans-medium'}`}>{label}</Text>
    </View>
  );
}
