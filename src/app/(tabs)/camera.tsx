import { VisualTripScanner } from '@/components/scanner/VisualTripScanner';
import { Screen } from '@/components/ui/Screen';

export default function CameraScreen() {
  return (
    <Screen eyebrow="Visual intake" title="Scan a screenshot" padded={false}>
      <VisualTripScanner />
    </Screen>
  );
}
