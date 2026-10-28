import { useState } from 'react';
import { ScrollView } from 'react-native';

import { NightGlow } from '@/components/nav/NightGlow';
import { FilterChips } from '@/components/spots/FilterChips';
import { SpotEntryForm } from '@/components/spots/SpotEntryForm';
import { SpotList } from '@/components/spots/SpotList';
import { SpotSheet } from '@/components/spots/SpotSheet';
import { Screen } from '@/components/ui/Screen';
import { type LifestyleSpot, NIGHT_CATEGORIES, NIGHT_GROUPS, type NightGroup } from '@/lib/spots/types';
import { spotFromManual } from '@/lib/trips/itinerary';
import { useTrips } from '@/lib/trips/store';

const FILTERS: { key: NightGroup | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'clubs', label: 'Clubs' },
  { key: 'beaches', label: 'Beaches' },
  { key: 'restaurants', label: 'Restaurants' },
];

/** Night out: clubs, beaches and restaurants. Every spot opens the three quick actions. */
export default function NightOutScreen() {
  const { spots, saveSpot } = useTrips();
  const [filter, setFilter] = useState<NightGroup | 'all'>('all');
  const [open, setOpen] = useState<LifestyleSpot | null>(null);

  const nightSpots = spots.filter((s) => (NIGHT_CATEGORIES as readonly string[]).includes(s.category));
  const shown = filter === 'all' ? nightSpots : nightSpots.filter((s) => (NIGHT_GROUPS[filter] as readonly string[]).includes(s.category));

  return (
    <>
      <Screen world="night" eyebrow="Clubs, beaches & restaurants" title="Night out" backdrop={<NightGlow mood={filter} />}>
        <ScrollView contentContainerClassName="gap-4 px-5 pb-16" keyboardShouldPersistTaps="handled">
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
          <SpotEntryForm
            categories={NIGHT_CATEGORIES}
            example={{ name: 'Razzmatazz', city: 'Barcelona' }}
            world="night"
            onSubmit={(input) => {
              const spot = spotFromManual(input);
              saveSpot(spot);
              setOpen(spot);
            }}
          />
          <SpotList spots={shown} emptyHint="Type one in above, or scan a flyer or Reel with the camera in the corner." onOpen={setOpen} />
        </ScrollView>
      </Screen>
      {open && <SpotSheet spot={open} world="night" onClose={() => setOpen(null)} />}
    </>
  );
}
