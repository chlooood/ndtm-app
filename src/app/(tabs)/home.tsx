import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AddMenu } from '@/components/home/AddMenu';
import { HubSwitch } from '@/components/home/HubSwitch';
import { ScatteredSpots } from '@/components/home/ScatteredSpots';
import { SeasonStats } from '@/components/home/SeasonStats';
import { TextIngestDrawer } from '@/components/scanner/TextIngestDrawer';
import { ScrapbookPage } from '@/components/scrapbook/ScrapbookPage';
import { SpotSheet } from '@/components/spots/SpotSheet';
import { AddBookingSheet } from '@/components/trips/AddBookingSheet';
import { CalendarButton } from '@/components/trips/CalendarButton';
import { StopCard } from '@/components/trips/StopCard';
import { isTripMode, TripModeCalendar } from '@/components/trips/TripModeCalendar';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/Text';
import { formatDayRange } from '@/lib/dates';
import { shareTrip } from '@/lib/linking/shareTrip';
import { useProfile } from '@/lib/profile/ProfileContext';
import type { LifestyleSpot } from '@/lib/spots/types';
import { useTrips } from '@/lib/trips/store';
import type { Trip } from '@/lib/trips/types';

const daysUntil = (iso: string) => Math.max(0, Math.ceil((Date.parse(`${iso}T00:00:00`) - Date.now()) / 86_400_000));

/** Home: the active trip as a scrapbook, one torn page per leg, with your other trips below. */
export default function HomeScreen() {
  const t = useTrips();
  const { activeTrip } = t;
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  const [bookingDay, setBookingDay] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [openSpot, setOpenSpot] = useState<LifestyleSpot | null>(null);
  const { profile } = useProfile();
  const { completedTrips, photos } = profile.stats;
  const scattered = t.spots.filter((s) => s.source.type === 'notes');
  const tripMode = isTripMode(activeTrip);
  const others = t.trips.filter((x) => x.id !== activeTrip.id && x.stops.length > 0);

  const share = async () => {
    setSharing(true);
    const { trip, publishError } = await t.publishActiveTrip();
    setSharing(false);
    if (publishError) {
      Alert.alert("Friends can't open this yet", publishError);
      return;
    }
    await shareTrip(trip);
  };

  return (
    <>
      <Screen
        world="home"
        eyebrow="Your scrapbook"
        title="My Journeys"
        aside={<AddMenu onScan={() => router.push('/scan')} onPaste={() => setPasting(true)} />}
      >
        <ScrollView contentContainerClassName="gap-6 px-5 pb-16" keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <Text className="font-display-italic text-[15px] text-muted">
              {completedTrips} trip{completedTrips === 1 ? '' : 's'} · {photos} photo{photos === 1 ? '' : 's'}
            </Text>
            <HubSwitch />
          </View>
          <TripTicket trip={activeTrip} onRename={t.renameActiveTrip} />
          {/* From three days before the trip until it ends, Home leads with the day-by-day calendar. */}
          {tripMode && <TripModeCalendar trip={activeTrip} onAddBooking={setBookingDay} />}

          {activeTrip.stops.length === 0 ? (
            <View className="items-center border border-dashed border-line px-6 py-10" style={{ transform: [{ rotate: '-0.6deg' }] }}>
              <Text className="font-display-italic text-[20px] text-ink">An empty page</Text>
              <T variant="muted" className="mt-1 text-center">
                Scan a trail or a city with the camera in the corner, or add a club, beach or restaurant from Night out.
              </T>
              <View className="mt-5 w-full gap-2">
                <Button label="Scan a screenshot" onPress={() => router.push('/scan')} />
                <Button label="Add a night out" kind="secondary" onPress={() => router.navigate('/night-out')} />
              </View>
            </View>
          ) : (
            <>
              {activeTrip.stops.map((stop, i) => (
                <ScrapbookPage key={stop.id} stop={stop} index={i}>
                  <StopCard
                    stop={stop}
                    index={i}
                    hideHeader
                    onChangeNights={(n) => t.setNights(stop.id, n)}
                    onRemove={() => t.removeStop(stop.id)}
                    onChangeAccommodation={(a) => t.setAccommodation(stop.id, a)}
                    onRemoveTimelineItem={(itemId) => t.removeTimelineItem(stop.id, itemId)}
                  />
                </ScrapbookPage>
              ))}
              <View className="gap-2">
                <Button label={sharing ? 'Publishing…' : 'Share with friends'} disabled={sharing} onPress={share} />
                {!tripMode && <CalendarButton trip={activeTrip} />}
              </View>
            </>
          )}

          {others.length > 0 && (
            <View className="gap-2">
              <T variant="label">Other trips</T>
              {others.map((trip) => (
                <Pressable
                  key={trip.id}
                  accessibilityRole="button"
                  accessibilityHint="Makes this the active trip"
                  onPress={() => t.setActiveTrip(trip.id)}
                  className="flex-row items-center justify-between rounded-md border border-line bg-[#F6EFDD] px-4 py-3 active:opacity-70"
                >
                  <View className="flex-1">
                    <T variant="heading">{trip.title}</T>
                    <T variant="small">
                      {trip.stops.map((s) => s.place.name).join(' → ')}
                      {trip.mirroredFrom ? ' · shared with you' : ''}
                    </T>
                  </View>
                  <T variant="label" className="text-accent">
                    Open
                  </T>
                </Pressable>
              ))}
            </View>
          )}
          {scattered.length > 0 && <ScatteredSpots spots={scattered} onOpen={setOpenSpot} />}
          <SeasonStats stats={profile.stats} />
        </ScrollView>
      </Screen>
      {bookingDay && <AddBookingSheet initialDay={bookingDay} onClose={() => setBookingDay(null)} />}
      {pasting && <TextIngestDrawer onClose={() => setPasting(false)} onDone={(message) => { setPasting(false); Alert.alert('Done', message); }} />}
      {openSpot && <SpotSheet spot={openSpot} world="home" onClose={() => setOpenSpot(null)} />}
    </>
  );
}

/** The active trip as a train ticket: name, legs, and a stub counting down the days. */
function TripTicket({ trip, onRename }: { trip: Trip; onRename: (title: string) => void }) {
  const first = trip.stops[0];
  const nights = trip.stops.reduce((n, s) => n + s.nights, 0);
  return (
    <View
      className="flex-row rounded-md bg-[#F6EFDD]"
      style={{ transform: [{ rotate: '-1deg' }], shadowColor: '#4B3D26', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}
    >
      <View className="flex-1 px-4 py-3.5">
        <Text className="font-sans-semibold text-[11px] uppercase tracking-[1.8px] text-[#8C2F2B]">
          {first ? `Next up · ${formatDayRange(first.startDate, nights)}` : 'Active trip'}
        </Text>
        <TextInput
          value={trip.title}
          onChangeText={onRename}
          accessibilityLabel="Trip name"
          placeholder="Name this trip"
          className="mt-0.5 font-display text-[22px] text-[#2F3B33]"
        />
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {trip.stops.length === 0 && <Text className="font-sans text-[13px] text-[#736D5E]">No legs yet</Text>}
          {trip.stops.map((s) => (
            <View key={s.id} className={`rounded-full px-2.5 py-1 ${s.kind === 'alpine' ? 'bg-sage' : 'bg-blush'}`}>
              <Text className={`font-sans-semibold text-[11px] tracking-[1px] ${s.kind === 'alpine' ? 'text-forest' : 'text-wine'}`}>
                {s.kind === 'alpine' ? '▲' : '✦'} {s.place.name.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {/* Perforation between ticket and stub */}
      <View style={{ width: 0, marginVertical: 10, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#CBBD9E' }} />
      <View className="w-[88px] items-center justify-center px-2 py-3">
        <Text className="font-display text-[30px] leading-[32px] text-forest">{first ? daysUntil(first.startDate) : '—'}</Text>
        <Text className="font-sans-semibold text-[10px] uppercase tracking-[1.4px] text-[#736D5E]">days to go</Text>
      </View>
    </View>
  );
}
