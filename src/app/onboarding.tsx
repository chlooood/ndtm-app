import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useRef, useState } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HUB_INFO, type Hub, type HikingStyle, type TransitPass, useProfile } from '@/lib/profile/ProfileContext';

// Homebase onboarding: three full-screen cards you swipe up through, in a
// muted dark palette (charcoal ground, lazy sage accents). Nothing to type.
const C = {
  ground: '#1E2220',
  card: '#272C29',
  raised: '#30362F',
  line: '#3D443E',
  sage: '#9DB09A',
  sageDeep: '#5F7A63',
  text: '#ECE8DC',
  muted: '#9AA197',
};

type GearItem = { key: string; label: string; icon: string };
const BACKPACK_GEAR: GearItem[] = [
  { key: 'tent', label: 'Tent', icon: '⛺' },
  { key: 'sleeping pad', label: 'Sleeping pad', icon: '🛏' },
  { key: 'sleeping bag', label: 'Sleeping bag', icon: '🧣' },
  { key: 'stove', label: 'Stove', icon: '🔥' },
  { key: 'water filter', label: 'Water filter', icon: '💧' },
  { key: 'headlamp', label: 'Headlamp', icon: '🔦' },
];
const HUT_GEAR: GearItem[] = [
  { key: 'liner', label: 'Hut liner', icon: '🛏' },
  { key: 'headlamp', label: 'Headlamp', icon: '🔦' },
  { key: 'poles', label: 'Trekking poles', icon: '🥢' },
  { key: 'shell', label: 'Rain shell', icon: '🧥' },
];
const CLUB_SET: GearItem[] = [
  { key: 'going-out outfit', label: 'Going-out outfit', icon: '🖤' },
  { key: 'earplugs', label: 'Earplugs', icon: '🎧' },
  { key: 'power bank', label: 'Power bank', icon: '🔋' },
  { key: 'card holder', label: 'Card holder', icon: '💳' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const scroller = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);

  // Card 1: hub
  const [homeHub, setHomeHub] = useState<Hub>(profile.homeHub);
  const [planningAhead, setPlanningAhead] = useState(profile.nextHub !== null);
  const [planFromNext, setPlanFromNext] = useState(profile.planningFor === 'next');
  const nextHub: Hub = homeHub === 'LYON' ? 'VANCOUVER' : 'LYON';
  // Card 2: identity
  const [railHolder, setRailHolder] = useState(!profile.transitPasses.includes('NONE'));
  const [passes, setPasses] = useState<TransitPass[]>(profile.transitPasses.filter((p) => p !== 'NONE'));
  const [backpacker, setBackpacker] = useState(true);
  const [hikingStyle, setHikingStyle] = useState<HikingStyle>(profile.hikingStyle);
  // Card 3: gear
  const [gear, setGear] = useState<string[]>(profile.gearInventory);

  const tap = () => void Haptics.selectionAsync();
  const go = (to: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scroller.current?.scrollTo({ y: to * height, animated: true });
    setPage(to);
  };

  const finish = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile({
      homeHub,
      nextHub: planningAhead ? nextHub : null,
      planningFor: planningAhead && planFromNext ? 'next' : 'home',
      transitPasses: railHolder && passes.length ? passes : ['NONE'],
      hikingStyle,
      gearInventory: gear,
      onboardedAt: new Date().toISOString(),
    });
    router.replace('/home');
  };

  const gearList = [...(backpacker ? (hikingStyle === 'WILD_CAMPING' ? BACKPACK_GEAR : HUT_GEAR) : []), ...CLUB_SET];

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scroller}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.y / height))}
      >
        {/* 1 · Set your hub */}
        <Card height={height} top={insets.top} bottom={insets.bottom} step="01" title="Set your hub" lede="Where do your trips start from right now?">
          <View className="gap-3">
            {(Object.keys(HUB_INFO) as Hub[]).map((hub) => (
              <Choice
                key={hub}
                big
                selected={homeHub === hub}
                onPress={() => {
                  tap();
                  setHomeHub(hub);
                }}
                title={`${HUB_INFO[hub].flag}  ${HUB_INFO[hub].label}`}
                hint={HUB_INFO[hub].station}
              />
            ))}
          </View>
          <View style={{ backgroundColor: C.card, borderColor: C.line }} className="mt-5 gap-3 rounded-3xl border p-4">
            <Row label={`Planning an exchange in ${HUB_INFO[nextHub].label}?`} hint="Get a head start before you move.">
              <Switch value={planningAhead} onValueChange={(v) => { tap(); setPlanningAhead(v); }} trackColor={{ true: C.sageDeep, false: C.line }} thumbColor={C.text} />
            </Row>
            {planningAhead && (
              <View className="flex-row gap-2">
                <Choice selected={!planFromNext} onPress={() => { tap(); setPlanFromNext(false); }} title={`From ${HUB_INFO[homeHub].label}`} hint="Plan from here" />
                <Choice selected={planFromNext} onPress={() => { tap(); setPlanFromNext(true); }} title={`From ${HUB_INFO[nextHub].label}`} hint="Plan the exchange" />
              </View>
            )}
          </View>
          <Next onPress={() => go(1)} />
        </Card>

        {/* 2 · Travel identity */}
        <Card height={height} top={insets.top} bottom={insets.bottom} step="02" title="Travel identity" lede="Tick what sounds like you. Change it any time.">
          <Check selected={railHolder} onPress={() => { tap(); setRailHolder(!railHolder); }} title="Rail pass holder" hint="We’ll name your card on every train link." />
          {railHolder && (
            <View className="-mt-1 mb-2 flex-row gap-2 pl-2">
              {([['SNCF_AVANTAGE_JEUNE', 'SNCF Carte Avantage'], ['EURAIL', 'Eurail Pass']] as const).map(([key, label]) => (
                <Choice
                  key={key}
                  selected={passes.includes(key)}
                  onPress={() => {
                    tap();
                    setPasses((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
                  }}
                  title={label}
                />
              ))}
            </View>
          )}
          <Check selected={backpacker} onPress={() => { tap(); setBackpacker(!backpacker); }} title="Backpacking enthusiast" hint="Huts or a tent? It decides your routes and packing lists." />
          {backpacker && (
            <View className="-mt-1 flex-row gap-2 pl-2">
              <Choice selected={hikingStyle === 'WILD_CAMPING'} onPress={() => { tap(); setHikingStyle('WILD_CAMPING'); }} title="⛺ Wild camping" />
              <Choice selected={hikingStyle === 'REFUGE_HUT'} onPress={() => { tap(); setHikingStyle('REFUGE_HUT'); }} title="🏔 Mountain huts" />
            </View>
          )}
          <Next onPress={() => go(2)} />
        </Card>

        {/* 3 · Pack light */}
        <Card height={height} top={insets.top} bottom={insets.bottom} step="03" title="Pack light" lede="Tap what you already own. It drops off your packing lists.">
          <View className="flex-row flex-wrap justify-between gap-y-2.5">
            {gearList.map((g) => {
              const on = gear.includes(g.key);
              return (
                <Pressable
                  key={g.key + g.label}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    tap();
                    setGear((list) => (on ? list.filter((x) => x !== g.key) : [...list, g.key]));
                  }}
                  style={{ backgroundColor: on ? C.sageDeep : C.card, borderColor: on ? C.sage : C.line, width: '48.5%' }}
                  className="flex-row items-center gap-2.5 rounded-2xl border px-3 py-3.5"
                >
                  <Text className="text-[18px]">{g.icon}</Text>
                  <Text style={{ color: C.text }} className="flex-1 font-sans-medium text-[14px]">
                    {g.label}
                  </Text>
                  <Text style={{ color: on ? C.text : C.muted }} className="font-sans text-[14px]">
                    {on ? '✓' : '+'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable accessibilityRole="button" onPress={() => void finish()} style={{ backgroundColor: C.sage }} className="mt-8 items-center rounded-2xl py-4 active:opacity-80">
            <Text style={{ color: C.ground }} className="font-sans-semibold text-[16px]">
              Open my scrapbook
            </Text>
          </Pressable>
        </Card>
      </ScrollView>

      {/* Progress */}
      <View pointerEvents="none" style={{ position: 'absolute', right: 18, top: height / 2 - 30 }} className="gap-2">
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 6, height: i === page ? 22 : 6, borderRadius: 3, backgroundColor: i === page ? C.sage : C.line }} />
        ))}
      </View>
    </View>
  );
}

function Card({ height, top, bottom, step, title, lede, children }: { height: number; top: number; bottom: number; step: string; title: string; lede: string; children: ReactNode }) {
  return (
    <View style={{ height, paddingTop: top + 48, paddingBottom: bottom + 32 }} className="justify-center px-6">
      <Text style={{ color: C.sage }} className="font-mono text-[12px] tracking-[2px]">
        {step} / 03
      </Text>
      <Text style={{ color: C.text }} className="mt-1 font-display text-[34px] leading-[38px]">
        {title}
      </Text>
      <Text style={{ color: C.muted }} className="mb-6 mt-1 font-sans text-[15px] leading-[22px]">
        {lede}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function Choice({ selected, onPress, title, hint, big }: { selected: boolean; onPress: () => void; title: string; hint?: string; big?: boolean }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ backgroundColor: selected ? C.raised : C.card, borderColor: selected ? C.sage : C.line }}
      className={`flex-1 rounded-2xl border px-4 ${big ? 'py-5' : 'py-3'} active:opacity-80`}
    >
      <Text style={{ color: C.text }} className={`font-sans-semibold ${big ? 'text-[20px]' : 'text-[14px]'}`}>
        {title}
      </Text>
      {hint && (
        <Text style={{ color: selected ? C.sage : C.muted }} className="mt-0.5 font-sans text-[13px]">
          {hint}
        </Text>
      )}
    </Pressable>
  );
}

function Check({ selected, onPress, title, hint }: { selected: boolean; onPress: () => void; title: string; hint: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{ backgroundColor: selected ? C.raised : C.card, borderColor: selected ? C.sage : C.line }}
      className="flex-row items-center gap-3 rounded-3xl border p-4 active:opacity-80"
    >
      <View style={{ borderColor: selected ? C.sage : C.muted, backgroundColor: selected ? C.sage : 'transparent' }} className="h-6 w-6 items-center justify-center rounded-md border-2">
        {selected && <Text style={{ color: C.ground }} className="font-sans-semibold text-[13px]">✓</Text>}
      </View>
      <View className="flex-1">
        <Text style={{ color: C.text }} className="font-sans-semibold text-[16px]">
          {title}
        </Text>
        <Text style={{ color: C.muted }} className="font-sans text-[13px] leading-[18px]">
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1">
        <Text style={{ color: C.text }} className="font-sans-semibold text-[15px]">
          {label}
        </Text>
        <Text style={{ color: C.muted }} className="font-sans text-[13px]">
          {hint}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Next({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Next" onPress={onPress} className="mt-6 flex-row items-center justify-center gap-2 py-3 active:opacity-70">
      <Text style={{ color: C.sage }} className="font-sans-semibold text-[15px]">
        Swipe up or tap to continue
      </Text>
      <Text style={{ color: C.sage }} className="text-[16px]">
        ↓
      </Text>
    </Pressable>
  );
}
