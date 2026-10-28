import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/Text';
import { PALETTES, type World } from '@/components/ui/theme';
import { type ManualSpotInput, VENUE_LABEL, type VenueCategory } from '@/lib/spots/types';

type Props = {
  /** The kinds of spot this tab offers, e.g. clubs and beaches, or gardens and farms. */
  categories: readonly VenueCategory[];
  /** Example name and city shown as placeholders. */
  example: { name: string; city: string };
  world: World;
  onSubmit: (input: ManualSpotInput) => void;
};

/** Type in a spot by hand: "Razzmatazz, club, Barcelona" or "Parc de la Tête d'Or, garden, Lyon". */
export function SpotEntryForm({ categories, example, world, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<VenueCategory>(categories[0]);
  const ready = name.trim().length > 1 && city.trim().length > 1;
  const placeholder = PALETTES[world].muted;

  return (
    <View className="gap-3 rounded-[26px] border border-line/60 bg-card/55 p-4">
      <T variant="heading">Add a spot</T>
      <View className="flex-row gap-2">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={example.name}
          placeholderTextColor={placeholder}
          accessibilityLabel="Spot name"
          className="min-w-0 flex-[1.4] rounded-xl border border-line bg-paper px-3 py-2.5 font-sans text-[15px] text-ink"
        />
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={example.city}
          placeholderTextColor={placeholder}
          accessibilityLabel="City"
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 font-sans text-[15px] text-ink"
        />
      </View>
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup" accessibilityLabel="Kind of spot">
        {categories.map((c) => {
          const on = c === category;
          return (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                void Haptics.selectionAsync();
                setCategory(c);
              }}
              className={`rounded-full border px-3 py-1.5 ${on ? 'border-accent bg-accent' : 'border-line bg-paper'}`}
            >
              <Text className={`font-sans-medium text-[13px] ${on ? 'text-on-accent' : 'text-ink'}`}>{VENUE_LABEL[c]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="Add spot"
        disabled={!ready}
        onPress={() => {
          onSubmit({ name, city, category });
          setName('');
        }}
      />
    </View>
  );
}
