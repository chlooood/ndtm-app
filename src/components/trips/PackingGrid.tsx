import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { PackGroup } from '@/lib/trips/alpine';

/** Two-column grid of gear groups. Tap an item to tick it off. */
export function PackingGrid({ groups }: { groups: PackGroup[] }) {
  const [packed, setPacked] = useState<Set<string>>(() => new Set());
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const toggle = (key: string) => {
    void Haptics.selectionAsync();
    setPacked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <View>
      <Text className="font-mono text-[12px] text-muted">
        {packed.size}/{total} packed
      </Text>
      <View className="mt-2 flex-row flex-wrap justify-between gap-y-3">
        {groups.map((group) => (
          <View key={group.title} className="w-[48.5%] rounded-2xl border border-line bg-card p-3">
            <Text className="font-sans-semibold text-[11px] uppercase tracking-[1.4px] text-accent">{group.title}</Text>
            {group.items.map((item) => {
              const key = `${group.title}:${item}`;
              const done = packed.has(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  onPress={() => toggle(key)}
                  className="mt-2 flex-row gap-2"
                >
                  <Text className={`font-sans text-[13px] ${done ? 'text-accent' : 'text-muted'}`}>{done ? '☑' : '☐'}</Text>
                  <Text className={`flex-1 font-sans text-[13px] leading-[18px] ${done ? 'text-muted line-through' : 'text-ink'}`}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
