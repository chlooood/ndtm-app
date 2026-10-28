import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import type { AccommodationType } from '@/lib/trips/types';

const OPTIONS: { value: AccommodationType; label: string; hint: string }[] = [
  { value: 'hut', label: 'Hut / Refuge', hint: 'Beds and meals, book ahead' },
  { value: 'tent', label: 'Tent / Wild camping', hint: 'Carry it all, go by bus' },
];

type Props = {
  value: AccommodationType;
  onChange: (value: AccommodationType) => void;
};

/** Hut vs tent switch for an alpine stop. Changing it swaps the logistics and the packing grid. */
export function AccommodationSelector({ value, onChange }: Props) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Accommodation type" className="flex-row gap-2">
      {OPTIONS.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            className={`flex-1 rounded-2xl border px-3 py-3 ${selected ? 'border-accent bg-accent/10' : 'border-line bg-card'}`}
          >
            <Text className={`font-sans-semibold text-[14px] ${selected ? 'text-accent' : 'text-ink'}`}>{o.label}</Text>
            <Text className="mt-0.5 font-sans text-[12px] text-muted">{o.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
