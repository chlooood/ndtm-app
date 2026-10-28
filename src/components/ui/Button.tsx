import * as Haptics from 'expo-haptics';
import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  accessibilityHint?: string;
};

const KIND = {
  primary: { box: 'bg-accent', text: 'text-on-accent' },
  secondary: { box: 'border border-line bg-card', text: 'text-ink' },
  quiet: { box: '', text: 'text-muted' },
} as const;

export function Button({ label, onPress, kind = 'primary', disabled, accessibilityHint }: Props) {
  const k = KIND[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(kind === 'primary' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={`items-center rounded-2xl px-4 py-3.5 active:opacity-80 ${disabled ? 'opacity-40' : ''} ${k.box}`}
    >
      <Text className={`font-sans-semibold text-[15px] ${k.text}`}>{label}</Text>
    </Pressable>
  );
}
