import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { DropZone } from '@/components/scanner/DropZone';
import { ResultDrawer } from '@/components/scanner/ResultDrawer';
import { ScanSkeleton } from '@/components/scanner/ScanSkeleton';
import { useTripScanner } from '@/components/scanner/useTripScanner';
import { T } from '@/components/ui/Text';
import { useTrips } from '@/lib/trips/store';

/** Screenshot -> destination or venue. Drop zone, then pulse skeleton, then result sheet. */
export function VisualTripScanner() {
  const { state, scan, reset } = useTripScanner();
  const { addScannedStop } = useTrips();
  const router = useRouter();

  const busy = state.status === 'uploading' || state.status === 'analyzing';

  return (
    <View className="flex-1">
      <View className="flex-1 px-5 pb-6">
        {busy ? <ScanSkeleton imageUri={state.imageUri} stage={state.status} /> : <DropZone onPick={scan} />}

        {state.status === 'error' && (
          <View className="absolute inset-x-5 top-0 rounded-2xl border border-alert/40 bg-card p-4">
            <T variant="heading" className="text-alert">
              Scan failed
            </T>
            <T variant="muted" className="mt-1">
              {state.message}
            </T>
            <Pressable accessibilityRole="button" onPress={reset} className="mt-3 self-start">
              <T variant="label" className="text-ink">
                Dismiss
              </T>
            </Pressable>
          </View>
        )}
      </View>

      {/* Outside the padded area so the sheet spans the full screen width. */}
      {state.status === 'result' && (
        <ResultDrawer
          response={state.response}
          onDismiss={reset}
          onAssemble={(accommodation) => {
            addScannedStop(state.response, accommodation, state.imageUri);
            reset();
            router.dismissTo(state.response.scan.tripType === 'alpine_backpacking' ? '/stroll' : '/home');
          }}
          onSpotAction={() => {
            reset();
            router.dismissTo('/home');
          }}
        />
      )}
    </View>
  );
}
