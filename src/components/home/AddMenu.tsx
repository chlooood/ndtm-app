import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

/** A small [ + ] beside the title that unfolds two ways in: scan a screenshot, or paste notes. */
export function AddMenu({ onScan, onPaste }: { onScan: () => void; onPaste: () => void }) {
  const [open, setOpen] = useState(false);
  const pick = (fn: () => void) => () => {
    void Haptics.selectionAsync();
    setOpen(false);
    fn();
  };
  return (
    <View className="items-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close add menu' : 'Add a place'}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setOpen(!open);
        }}
        className={`h-9 w-9 items-center justify-center rounded-full border ${open ? 'border-ink bg-ink' : 'border-line bg-card'}`}
      >
        <Text className={`font-sans-medium text-[20px] leading-[22px] ${open ? 'text-paper' : 'text-ink'}`}>{open ? '×' : '+'}</Text>
      </Pressable>
      {open && (
        <View className="absolute right-0 top-11 z-10 w-[200px] gap-1 rounded-2xl border border-line bg-card p-1.5" style={{ shadowColor: '#3B2E1A', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
          <Pressable accessibilityRole="button" onPress={pick(onScan)} className="rounded-xl px-3 py-2.5 active:bg-chip">
            <Text className="font-sans-medium text-[14px] text-ink">📷  Scan screenshot</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={pick(onPaste)} className="rounded-xl px-3 py-2.5 active:bg-chip">
            <Text className="font-sans-medium text-[14px] text-ink">📝  Paste notes text</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
