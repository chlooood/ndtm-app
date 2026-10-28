import { Link } from 'expo-router';
import { View } from 'react-native';

import { T } from '@/components/ui/Text';
import { worldVars } from '@/components/ui/theme';

export default function NotFoundScreen() {
  return (
    <View style={worldVars('home')} className="flex-1 items-center justify-center bg-paper p-5">
      <T variant="title">This page doesn&apos;t exist.</T>
      <Link href="/home" className="mt-4 py-4">
        <T variant="label" className="text-accent">
          Back home
        </T>
      </Link>
    </View>
  );
}
