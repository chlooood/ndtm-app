import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text } from 'react-native';

type Props<K extends string> = {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
};

/** A row of single-choice filter chips that scrolls sideways. */
export function FilterChips<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {options.map((f) => {
        const on = f.key === value;
        return (
          <Pressable
            key={f.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(f.key);
            }}
            className={`rounded-full border px-4 py-2 ${on ? 'border-ink bg-ink' : 'border-line/70 bg-card/60'}`}
          >
            <Text className={`font-sans-medium text-[14px] ${on ? 'text-paper' : 'text-ink'}`}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
