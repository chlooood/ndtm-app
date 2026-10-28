import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, FriendsIcon } from '@/components/ui/Icons';
import { T } from '@/components/ui/Text';
import { isDark, PALETTES, type World, worldVars } from '@/components/ui/theme';

type Props = {
  world: World;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  /** The camera and friends buttons sit in the top corners of every tab. Off for modals. */
  corners?: boolean;
  /** Something to show at the right of the title, e.g. a count. */
  aside?: ReactNode;
  /** Decoration painted behind everything, e.g. the Night out glow. */
  backdrop?: ReactNode;
};

/** A tab's frame: repaints its subtree in the tab's palette, with the corner buttons on top. */
export function Screen({ world, eyebrow, title, children, corners = true, aside, backdrop }: Props) {
  return (
    <View style={worldVars(world)} className="flex-1 bg-paper">
      <StatusBar style={isDark(world) ? 'light' : 'dark'} />
      {backdrop}
      <SafeAreaView edges={['top']} className="flex-1">
        {corners && <CornerActions world={world} />}
        <View className="flex-row items-end justify-between gap-3 px-5 pb-4 pt-1">
          <View className="flex-1">
            {eyebrow && <T variant="label">{eyebrow}</T>}
            <T variant="display" accessibilityRole="header" className={world === 'night' ? 'font-display-italic' : ''}>
              {title}
            </T>
          </View>
          {aside}
        </View>
        <View className="flex-1">{children}</View>
      </SafeAreaView>
    </View>
  );
}

/** Camera (scan or upload) top-left, friends (coordinate) top-right. Not part of the tab bar. */
function CornerActions({ world }: { world: World }) {
  const router = useRouter();
  const go = (href: '/scan' | '/friends') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(href);
  };
  const tint = PALETTES[world].ink;
  return (
    <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
      <CornerButton label="Scan a screenshot or add photos" onPress={() => go('/scan')}>
        <CameraIcon color={tint} />
      </CornerButton>
      <CornerButton label="Friends: coordinate trips" onPress={() => go('/friends')}>
        <FriendsIcon color={tint} />
      </CornerButton>
    </View>
  );
}

function CornerButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
    >
      {children}
    </Pressable>
  );
}
