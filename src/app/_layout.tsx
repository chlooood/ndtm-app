import '../../global.css';

import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { Newsreader_500Medium_Italic, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { PALETTES } from '@/components/ui/theme';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ProfileProvider } from '@/lib/profile/ProfileContext';
import { TripsProvider } from '@/lib/trips/store';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Deep links straight to /trip/<id> still get the tabs underneath, so "back" works.
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const home = PALETTES.home;
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: home.paper, card: home.card, text: home.ink, primary: home.accent, border: home.line },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Newsreader_600SemiBold,
    Newsreader_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMMono_400Regular,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <ProfileProvider>
          <TripsProvider>
          <Stack screenOptions={{ contentStyle: { backgroundColor: home.paper }, headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friends" options={{ presentation: 'modal' }} />
            <Stack.Screen name="imprint" options={{ presentation: 'modal' }} />
            <Stack.Screen name="trip/[id]" options={{ presentation: 'modal' }} />
          </Stack>
          </TripsProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
