import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Lost?' }} />
      <View className="flex-1 items-center justify-center bg-ink p-5">
        <Text className="text-xl font-bold text-mist">This screen doesn&apos;t exist.</Text>
        <Link href="/feed" className="mt-4 py-4">
          <Text className="text-sm text-neon-cyan">Back to the feed</Text>
        </Link>
      </View>
    </>
  );
}
