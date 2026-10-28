import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

import { pickScanImage, ScanCancelledError, scanTripFromAsset, type ScanSource } from '@/lib/scanner/scanImage';
import type { ScanResponse } from '@/lib/scanner/schema';

export type ScannerState =
  | { status: 'idle' }
  | { status: 'uploading' | 'analyzing'; imageUri: string }
  | { status: 'result'; imageUri: string; response: ScanResponse }
  | { status: 'error'; imageUri?: string; message: string };

export function useTripScanner() {
  const [state, setState] = useState<ScannerState>({ status: 'idle' });
  // Each scan gets a ticket; results from a scan the user abandoned are dropped.
  const ticket = useRef(0);

  const scan = useCallback(async (source: ScanSource) => {
    const current = ++ticket.current;
    const isCurrent = () => current === ticket.current;

    let imageUri: string | undefined;
    try {
      const asset = await pickScanImage(source);
      imageUri = asset.uri;
      const response = await scanTripFromAsset(asset, (stage) => {
        if (isCurrent()) setState({ status: stage, imageUri: asset.uri });
      });
      if (!isCurrent()) return;

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setState({ status: 'result', imageUri: asset.uri, response });
    } catch (error) {
      if (!isCurrent() || error instanceof ScanCancelledError) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setState({ status: 'error', imageUri, message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  const reset = useCallback(() => {
    ticket.current++;
    setState({ status: 'idle' });
  }, []);

  return { state, scan, reset };
}
