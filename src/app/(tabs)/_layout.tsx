import { Tabs } from 'expo-router';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';
import { Easing } from 'react-native';

import { MedallionTabBar } from '@/components/nav/MedallionTabBar';

/**
 * Switching tabs is a slow cross-fade with a slight settle: the new world
 * fades up from 98% scale while the old one drifts away, so cream paper,
 * sage sky and wine light blend into each other rather than cutting.
 */
const softFade: NonNullable<BottomTabNavigationOptions['sceneStyleInterpolator']> = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
    transform: [{ scale: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.98, 1, 1.01] }) }],
  },
});

const TAB_TRANSITION_MS = 650;

// A JS tab bar (not native tabs) so the medallion icons and their animations
// look the same on iOS, Android and web.
export default function TabLayout() {
  return (
    // The app opens on Home via the redirect in src/app/index.tsx.
    <Tabs
      tabBar={(props) => <MedallionTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyleInterpolator: softFade,
        transitionSpec: { animation: 'timing', config: { duration: TAB_TRANSITION_MS, easing: Easing.bezier(0.33, 0, 0.2, 1) } },
      }}
    >
      <Tabs.Screen name="night-out" options={{ title: 'Night out' }} />
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="stroll" options={{ title: 'Stroll around' }} />
    </Tabs>
  );
}
