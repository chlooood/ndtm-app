import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AlpineBriefing } from '@/components/trips/AlpineBriefing';
import { StopCard } from '@/components/trips/StopCard';
import { MIST_500 } from '@/components/ui/theme';
import { Screen } from '@/components/ui/Screen';
import { shareTrip } from '@/lib/linking/shareTrip';
import { useTrips } from '@/lib/trips/store';

export default function PlanScreen() {
  const { draft, setNights, removeStop, renameDraft, saveDraft } = useTrips();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    const { trip, publishError } = await saveDraft();
    setSaving(false);
    if (publishError) {
      Alert.alert('Saved on this phone only', `Friends can't open the link yet.\n\n${publishError}`);
      router.navigate('/trips');
      return;
    }
    await shareTrip(trip);
    router.navigate('/trips');
  };

  return (
    <Screen eyebrow="Itinerary & transit" title="Plan">
      {draft.stops.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg font-semibold text-mist">No stops yet</Text>
          <Text className="mt-2 text-center text-base leading-6 text-mist-400">
            Scan a screenshot of somewhere you want to go and it lands here, with trains or driving already worked out.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/camera')}
            className="mt-6 rounded-2xl border border-neon-cyan/50 px-5 py-3 active:opacity-70"
          >
            <Text className="font-semibold text-neon-cyan">Open the scanner</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 pb-12" keyboardShouldPersistTaps="handled">
          <TextInput
            value={draft.title}
            onChangeText={renameDraft}
            placeholder="Trip name"
            placeholderTextColor={MIST_500}
            accessibilityLabel="Trip name"
            className="rounded-2xl border border-ink-600 bg-ink-800 px-4 py-3 text-lg font-semibold text-mist"
          />
          {draft.stops.map((stop, i) => (
            <View key={stop.id}>
              <StopCard
                stop={stop}
                index={i}
                onChangeNights={(n) => setNights(stop.id, n)}
                onRemove={() => removeStop(stop.id)}
              />
              {stop.scan.tripType === 'alpine_backpacking' && <AlpineBriefing stop={stop} />}
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onSave}
            className="items-center rounded-2xl bg-neon-cyan py-4 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-base font-bold text-ink">{saving ? 'Saving…' : 'Save & share with friends'}</Text>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}
