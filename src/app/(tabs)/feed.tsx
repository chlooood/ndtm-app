import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Tag } from '@/components/ui/Tag';

// Placeholder discovery cards until the social feed has a backend.
const INSPIRATION = [
  { city: 'Lisbon', blurb: 'Bairro Alto bars into a Lux Frágil sunrise', type: 'city' },
  { city: 'Zermatt', blurb: 'Hörnlihütte and the Matterhorn base camp trail', type: 'alpine' },
  { city: 'Barcelona', blurb: 'Raval tapas, Razzmatazz, beach recovery', type: 'city' },
  { city: 'Landmannalaugar', blurb: 'Laugavegur trek, hut to hut across the highlands', type: 'alpine' },
  { city: 'Chamonix', blurb: 'Refuge du Lac Blanc, 2h from Lyon by car', type: 'alpine' },
] as const;

export default function FeedScreen() {
  const router = useRouter();

  return (
    <Screen eyebrow="Social discovery" title="Feed">
      <ScrollView contentContainerClassName="gap-4 pb-12">
        {INSPIRATION.map((item) => (
          <View key={item.city} className="rounded-3xl border border-ink-600 bg-ink-800 p-5">
            <Tag label={item.type === 'alpine' ? 'Alpine' : 'City'} tone={item.type === 'alpine' ? 'lime' : 'magenta'} />
            <Text className="mt-3 text-2xl font-bold text-mist">{item.city}</Text>
            <Text className="mt-1 text-base text-mist-400">{item.blurb}</Text>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/camera')}
          className="items-center rounded-2xl border border-neon-cyan/50 py-4 active:opacity-70"
        >
          <Text className="font-semibold text-neon-cyan">Saw something on TikTok? Scan it</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
