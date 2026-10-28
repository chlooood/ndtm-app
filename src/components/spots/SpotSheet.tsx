import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { SpotQuickActions } from '@/components/spots/SpotQuickActions';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { T } from '@/components/ui/Text';
import { type World, worldVars } from '@/components/ui/theme';
import { type LifestyleSpot, VENUE_LABEL } from '@/lib/spots/types';

/** The quick-action sheet for a spot. After an action it closes and shows the itinerary on Home. */
export function SpotSheet({ spot, world, onClose }: { spot: LifestyleSpot; world: World; onClose: () => void }) {
  const router = useRouter();
  return (
    // The sheet sits outside the tab's Screen, so it sets the tab's colours itself.
    <View style={worldVars(world)} className="absolute inset-0" pointerEvents="box-none">
      <BottomSheet onDismiss={onClose} accessibilityLabel={`Actions for ${spot.name}`}>
        {(close) => (
          <>
            <T variant="label">
              {VENUE_LABEL[spot.category]} · {spot.city}
            </T>
            <T variant="display" className="mb-4 mt-1 font-display-italic">
              {spot.name}
            </T>
            <SpotQuickActions
              spot={spot}
              onDone={() =>
                close(() => {
                  onClose();
                  router.navigate('/home');
                })
              }
            />
          </>
        )}
      </BottomSheet>
    </View>
  );
}
