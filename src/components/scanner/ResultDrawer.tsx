import { useState } from 'react';
import { Text, View } from 'react-native';

import { SpotQuickActions } from '@/components/spots/SpotQuickActions';
import { AccommodationSelector } from '@/components/trips/AccommodationSelector';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { T } from '@/components/ui/Text';
import { accommodationFor } from '@/lib/logistics/tailoredEngine';
import { useProfile } from '@/lib/profile/ProfileContext';
import type { ScanResponse } from '@/lib/scanner/schema';
import type { SpotActionResult } from '@/lib/spots/types';
import { spotFromScan } from '@/lib/trips/itinerary';
import type { AccommodationType } from '@/lib/trips/types';

type Props = {
  response: ScanResponse;
  /** A destination: add it as a new leg of the active trip. */
  onAssemble: (accommodation: AccommodationType) => void;
  /** A venue: one of the three quick actions ran. */
  onSpotAction: (result: Extract<SpotActionResult, { ok: true }>) => void;
  onDismiss: () => void;
};

const PLATFORM_LABEL = { instagram: 'Instagram', tiktok: 'TikTok', reddit: 'Reddit', youtube: 'YouTube', unknown: 'the web' } as const;

/** Bottom sheet that springs up the moment a scan lands. */
export function ResultDrawer({ response, onAssemble, onSpotAction, onDismiss }: Props) {
  const { scan, meta } = response;
  const { lat, lng, region } = scan.estimatedLocation;
  const alpine = scan.tripType === 'alpine_backpacking';
  // Venues get the Night out quick actions; destinations get "Assemble itinerary".
  const [spot] = useState(() => spotFromScan(response));
  // Starts on the profile's hiking style; the user can still switch for this trip.
  const { profile } = useProfile();
  const [accommodation, setAccommodation] = useState<AccommodationType>(() => accommodationFor(profile.hikingStyle));

  return (
    <BottomSheet onDismiss={onDismiss} accessibilityLabel={`Scan result: ${scan.destinationName}`}>
      {(close) => (
        <>
          <T variant="label">Found via {PLATFORM_LABEL[scan.sourcePlatform]}</T>
          <T variant="display" accessibilityRole="header" className="mt-1">
            {scan.destinationName}
          </T>
          <T variant="muted">{spot ? spot.city : region}</T>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Tag label={spot ? spot.category : alpine ? 'Alpine backpacking' : 'City trip'} tone={alpine ? 'hike' : 'night'} />
            <Tag label={`${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`} mono />
            <Tag label={`${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`} mono />
            {!meta.geocoded && <Tag label="Approximate" tone="alert" />}
          </View>

          {scan.extractedContext ? (
            <Text className="mt-4 font-display-italic text-[17px] leading-[24px] text-ink">“{scan.extractedContext}”</Text>
          ) : null}

          {spot ? (
            <View className="mt-5">
              <SpotQuickActions spot={spot} onDone={(result) => close(() => onSpotAction(result))} />
            </View>
          ) : (
            <View className="mt-5 gap-3">
              {alpine && (
                <>
                  <T variant="label">Where will you sleep?</T>
                  <AccommodationSelector value={accommodation} onChange={setAccommodation} />
                  <T variant="small">
                    {accommodation === 'tent'
                      ? 'We’ll look for public transit to the nearest trailhead first and skip hotels entirely.'
                      : 'Huts are rarely reachable by bus, so we’ll plan the drive or a carpool.'}
                  </T>
                </>
              )}
              <Button label="Assemble itinerary" onPress={() => close(() => onAssemble(accommodation))} />
              <Button label="Scan something else" kind="quiet" onPress={() => close(onDismiss)} />
            </View>
          )}
        </>
      )}
    </BottomSheet>
  );
}
