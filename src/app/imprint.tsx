import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Path, Rect } from 'react-native-svg';

import { ImprintMap, INK, PatternDefs } from '@/components/imprint/ImprintMap';
import { useImprintPlaces } from '@/components/imprint/useImprintPlaces';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/Text';
import { shareTrip } from '@/lib/linking/shareTrip';
import { IMPRINT_PATTERNS, type ImprintPattern, useProfile } from '@/lib/profile/ProfileContext';
import { useTrips } from '@/lib/trips/store';

const PATTERN_INFO: Record<ImprintPattern, { label: string; hint: string; swatch: string }> = {
  silk: { label: 'Silk', hint: 'Your route as printed ribbons', swatch: 'url(#print1)' },
  rings: { label: 'Tree rings', hint: 'Each place grows rings', swatch: 'rings' },
  cells: { label: 'Cells', hint: 'Places like cut stone', swatch: 'url(#cells)' },
  canopy: { label: 'Canopy', hint: 'Crowns joined by branches', swatch: 'url(#leaves)' },
};

/** Opened from the map button at the top: everywhere you've been, in the pattern friends see. */
export default function ImprintScreen() {
  const { trips, activeTrip, publishActiveTrip } = useTrips();
  const { profile, updateProfile } = useProfile();
  const { width } = useWindowDimensions();
  const places = useImprintPlaces(trips);
  const mapW = Math.min(width, 520) - 40;
  const been = places.filter((p) => p.been);

  const share = async () => {
    const { trip, publishError } = await publishActiveTrip();
    if (!publishError) await shareTrip(trip);
  };

  return (
    <Screen world="home" eyebrow="Everywhere you've been" title="Your imprint" corners={false}>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-16">
        <View className="overflow-hidden rounded-[22px] border border-line" style={{ shadowColor: '#4B3D26', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
          <ImprintMap places={places} pattern={profile.imprintPattern} width={mapW} height={mapW * 1.15} />
        </View>
        <T variant="muted">
          {been.length
            ? `${been.length} place${been.length === 1 ? '' : 's'} so far · ${been.reduce((n, p) => n + p.nights, 0)} nights. Dashed outlines are still ahead.`
            : 'Nothing here yet. Places fill in from the day each trip starts; planned ones show dashed.'}
        </T>

        <T variant="label">Your pattern</T>
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {IMPRINT_PATTERNS.map((p) => {
            const on = profile.imprintPattern === p;
            const info = PATTERN_INFO[p];
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  void Haptics.selectionAsync();
                  void updateProfile({ imprintPattern: p });
                }}
                style={{ width: '48.5%' }}
                className={`flex-row items-center gap-3 rounded-2xl border p-2.5 ${on ? 'border-ink bg-card' : 'border-line bg-paper'}`}
              >
                <Svg width={42} height={42} viewBox="0 0 42 42">
                  <Defs>
                    <PatternDefs ink={INK[p]} />
                  </Defs>
                  {info.swatch === 'rings' ? (
                    <>
                      <Rect width={42} height={42} rx={10} fill="#F6EEE4" />
                      {[17, 13, 9, 5].map((r) => (
                        <Path key={r} d={`M${21 - r} 21a${r} ${r * 0.9} 0 1 0 ${r * 2} 0a${r} ${r * 0.9} 0 1 0 -${r * 2} 0`} fill="none" stroke={INK.rings} strokeWidth={1.2} />
                      ))}
                    </>
                  ) : (
                    <Rect width={42} height={42} rx={10} fill={info.swatch} />
                  )}
                </Svg>
                <View className="flex-1">
                  <Text className={`font-sans-semibold text-[14px] ${on ? 'text-ink' : 'text-ink'}`}>{info.label}</Text>
                  <T variant="small">{info.hint}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
        <T variant="small">Friends see your trips drawn in this pattern when they open a link you share.</T>
        <Button label={`Share ${activeTrip.title}`} kind="secondary" disabled={activeTrip.stops.length === 0} onPress={() => void share()} />
      </ScrollView>
    </Screen>
  );
}
