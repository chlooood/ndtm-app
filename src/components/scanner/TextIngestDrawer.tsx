import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/Text';
import { PALETTES, worldVars } from '@/components/ui/theme';
import { parseRawNotesText, type ParsedNotes } from '@/lib/scanner/textIngest';
import { useTrips } from '@/lib/trips/store';

const ACTIVITY_ICON = { clubbing: '✦', beach: '☀', restaurant: '🍽', alpine_backpacking: '▲', general: '◆' } as const;
const EXAMPLE = 'Ibiza Nov 9, clubbing at Pacha, then fly to Barcelona on the 12th for dinner at Paradiso';

/**
 * Paste raw notes, see the places found, then choose: chain them into a
 * multi-city trip, or scatter each place onto Home as its own card.
 */
export function TextIngestDrawer({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const { assembleFromNotes, scatterFromNotes } = useTrips();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedNotes | null>(null);

  const read = async () => {
    setBusy(true);
    setError(null);
    try {
      setParsed(await parseRawNotesText(text));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={worldVars('home')} className="absolute inset-0" pointerEvents="box-none">
      <BottomSheet onDismiss={onClose} accessibilityLabel="Paste notes">
        {(close) => (
          <View className="gap-3">
            <T variant="label">Paste notes</T>
            {!parsed ? (
              <>
                <T variant="title">Drop in your messy list</T>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  multiline
                  autoFocus
                  placeholder={EXAMPLE}
                  placeholderTextColor={PALETTES.home.muted}
                  accessibilityLabel="Notes text"
                  textAlignVertical="top"
                  className="min-h-[130px] rounded-2xl border border-dashed border-line bg-paper p-3 font-sans text-[15px] leading-[22px] text-ink"
                />
                {error && <T variant="small" className="text-alert">{error}</T>}
                {busy ? (
                  <View className="flex-row items-center justify-center gap-2 py-3">
                    <ActivityIndicator color={PALETTES.home.accent} />
                    <T variant="muted">Reading your notes…</T>
                  </View>
                ) : (
                  <Button label="Read my notes" disabled={text.trim().length < 3} onPress={() => void read()} />
                )}
              </>
            ) : (
              <>
                <T variant="title">
                  {parsed.nodes.length} place{parsed.nodes.length === 1 ? '' : 's'} across {parsed.regions.join(' → ')}
                </T>
                <View className="gap-1.5">
                  {parsed.nodes.map((n, i) => (
                    <View key={`${n.placeName}-${i}`} className="flex-row items-center gap-3 rounded-xl bg-chip px-3 py-2">
                      <Text className="w-5 text-center font-sans text-[14px] text-accent">{ACTIVITY_ICON[n.activityType]}</Text>
                      <View className="flex-1">
                        <T variant="heading" className="text-[15px]">
                          {n.placeName}
                        </T>
                        <T variant="small">
                          {n.inferredRegion}
                          {n.inferredDate ? ` · ${n.inferredDate}` : ''}
                        </T>
                      </View>
                    </View>
                  ))}
                </View>
                {parsed.isMultiCityRoute ? (
                  <View className="gap-2">
                    <Button
                      label="🔗 Assemble multi-city itinerary"
                      onPress={() => {
                        const trip = assembleFromNotes(parsed.nodes);
                        close(() => onDone(`${trip.title} is your next trip`));
                      }}
                    />
                    <Button
                      label="📌 Scatter into scrapbook"
                      kind="secondary"
                      onPress={() => {
                        const spots = scatterFromNotes(parsed.nodes);
                        close(() => onDone(`${spots.length} places scattered on Home`));
                      }}
                    />
                  </View>
                ) : (
                  <View className="gap-2">
                    <Button
                      label={`Make a ${parsed.regions[0]} trip`}
                      onPress={() => {
                        const trip = assembleFromNotes(parsed.nodes);
                        close(() => onDone(`${trip.title} is your next trip`));
                      }}
                    />
                    <Button
                      label="📌 Scatter into scrapbook"
                      kind="secondary"
                      onPress={() => {
                        const spots = scatterFromNotes(parsed.nodes);
                        close(() => onDone(`${spots.length} place${spots.length === 1 ? '' : 's'} scattered on Home`));
                      }}
                    />
                  </View>
                )}
                <Button label="Edit the text" kind="quiet" onPress={() => setParsed(null)} />
              </>
            )}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}
