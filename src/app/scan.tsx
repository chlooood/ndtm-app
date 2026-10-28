import { VisualTripScanner } from '@/components/scanner/VisualTripScanner';
import { Screen } from '@/components/ui/Screen';

/** Opened from the camera button in the top-left corner of every tab. */
export default function ScanScreen() {
  return (
    <Screen world="home" eyebrow="Visual intake" title="Scan a screenshot" corners={false}>
      <VisualTripScanner />
    </Screen>
  );
}
