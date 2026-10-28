import { ScrollView, View } from 'react-native';

import { AccountCard } from '@/components/auth/AccountCard';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Tag } from '@/components/ui/Tag';
import { T } from '@/components/ui/Text';
import { formatDayRange } from '@/lib/dates';
import { createTripShareUrl, shareTrip } from '@/lib/linking/shareTrip';
import { useTrips } from '@/lib/trips/store';

/** Opened from the friends button in the top-right corner. Share a trip's link, see trips friends sent you. */
export default function FriendsScreen() {
  const { trips } = useTrips();
  const planned = trips.filter((t) => t.stops.length > 0);

  return (
    <Screen world="home" eyebrow="Coordinate" title="Friends" corners={false}>
      <ScrollView contentContainerClassName="gap-3 px-5 pb-16">
        <AccountCard />
        <T variant="muted">
          Send a trip’s link and friends open the same itinerary in ndtm, ready to copy into their own trips.
        </T>
        {planned.length === 0 && (
          <View className="rounded-[26px] border border-dashed border-line px-6 py-8">
            <T variant="muted" className="text-center">
              Plan a trip first. Its share link shows up here.
            </T>
          </View>
        )}
        {planned.map((trip) => {
          const nights = trip.stops.reduce((n, s) => n + s.nights, 0);
          return (
            <View key={trip.id} className="gap-3 rounded-[26px] border border-line bg-card p-4">
              <View className="flex-row items-center justify-between">
                <T variant="mono">{formatDayRange(trip.stops[0].startDate, nights)}</T>
                {trip.mirroredFrom && <Tag label="Shared with you" tone="night" />}
              </View>
              <View>
                <T variant="title">{trip.title}</T>
                <T variant="small">{trip.stops.map((s) => s.place.name).join(' → ')}</T>
              </View>
              <T variant="mono" selectable className="rounded-xl bg-chip px-3 py-2 text-ink">
                {createTripShareUrl(trip.id)}
              </T>
              <Button label="Share link" kind="secondary" onPress={() => void shareTrip(trip)} />
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
