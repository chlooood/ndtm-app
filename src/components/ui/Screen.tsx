import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  /** Horizontal padding for the body. Turn off for edge-to-edge content. */
  padded?: boolean;
};

export function Screen({ eyebrow, title, children, padded = true }: Props) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ink">
      <View className="px-5 pb-4 pt-2">
        <Text className="font-mono text-xs uppercase tracking-[3px] text-neon-cyan">{eyebrow}</Text>
        <Text className="mt-1 text-3xl font-bold text-mist" accessibilityRole="header">
          {title}
        </Text>
      </View>
      <View className={`flex-1 ${padded ? 'px-5' : ''}`}>{children}</View>
    </SafeAreaView>
  );
}
