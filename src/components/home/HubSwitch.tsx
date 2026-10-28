import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { HUB_INFO, useProfile } from '@/lib/profile/ProfileContext';

/**
 * Which hub new plans start from. With an exchange coming up (e.g. living in
 * Vancouver, moving to Lyon), tap to plan from either side.
 */
export function HubSwitch() {
  const { profile, updateProfile } = useProfile();
  const home = HUB_INFO[profile.homeHub];
  const next = profile.nextHub ? HUB_INFO[profile.nextHub] : null;

  if (!next) {
    return (
      <Text className="font-sans text-[13px] text-muted">
        {home.flag} Planning from {home.label}
      </Text>
    );
  }

  const fromNext = profile.planningFor === 'next';
  return (
    <View className="flex-row self-start rounded-full border border-line bg-card p-1" accessibilityRole="radiogroup" accessibilityLabel="Plan from">
      {[
        { key: 'home' as const, hub: home, hint: 'now' },
        { key: 'next' as const, hub: next, hint: 'exchange' },
      ].map(({ key, hub, hint }) => {
        const on = (key === 'next') === fromNext;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              void Haptics.selectionAsync();
              void updateProfile({ planningFor: key });
            }}
            className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${on ? 'bg-forest' : ''}`}
          >
            <Text className="text-[13px]">{hub.flag}</Text>
            <Text className={`font-sans-semibold text-[13px] ${on ? 'text-[#F8F4EA]' : 'text-ink'}`}>{hub.label}</Text>
            <Text className={`font-sans text-[11px] ${on ? 'text-sage' : 'text-muted'}`}>{hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
