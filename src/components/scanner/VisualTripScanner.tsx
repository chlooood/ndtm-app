import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { NeonDropZone } from '@/components/scanner/NeonDropZone';
import { ResultDrawer } from '@/components/scanner/ResultDrawer';
import { ScanSkeleton } from '@/components/scanner/ScanSkeleton';
import { useTripScanner } from '@/components/scanner/useTripScanner';
import { useTrips } from '@/lib/trips/store';

/** Screenshot -> destination. Drop zone, then pulse skeleton, then result drawer. */
export function VisualTripScanner() {
  const { state, scan, reset } = useTripScanner();
  const { addStop } = useTrips();
  const router = useRouter();

  const busy = state.status === 'uploading' || state.status === 'analyzing';

  return (
    <View className="flex-1">
      <View className="flex-1 px-5 pb-6">
        {busy ? (
          <ScanSkeleton imageUri={state.imageUri} stage={state.status} />
        ) : (
          <NeonDropZone onPick={scan} />
        )}

        {state.status === 'error' && (
          <View className="absolute inset-x-5 top-0 rounded-2xl border border-neon-magenta/40 bg-ink-800 p-4">
            <Text className="text-sm font-semibold text-neon-magenta">Scan failed</Text>
            <Text className="mt-1 text-sm leading-5 text-mist-400">{state.message}</Text>
            <Pressable accessibilityRole="button" onPress={reset} className="mt-3 self-start">
              <Text className="text-sm font-medium text-mist">Dismiss</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Outside the padded area so the sheet spans the full screen width. */}
      {state.status === 'result' && (
        <ResultDrawer
          response={state.response}
          logistics={state.logistics}
          onDismiss={reset}
          onAssemble={() => {
            addStop(state.response.scan);
            reset();
            router.navigate('/plan');
          }}
        />
      )}
    </View>
  );
}
