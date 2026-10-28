import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ActivityCard, StayCard, TransportCard } from '@/components/trips/BookingCards';
import { CalendarButton } from '@/components/trips/CalendarButton';
import { DayTimeline } from '@/components/trips/DayTimeline';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth/AuthContext';
import { addDays, daysBetween, localToday, stopDays } from '@/lib/dates';
import { tripDays } from '@/lib/trips/itinerary';
import type { Booking, Trip, TripStop } from '@/lib/trips/types';


/** The trip's first and last calendar day, or null for an empty trip. */
export function tripRange(trip: Trip): { start: string; end: string } | null {
  if (!trip.stops.length) return null;
  const last = trip.stops[trip.stops.length - 1];
  return { start: trip.stops[0].startDate, end: addDays(last.startDate, last.nights) };
}

/** Trip mode turns on three days before the first leg and stays on until the last day. */
export function isTripMode(trip: Trip, today = localToday()): boolean {
  const range = tripRange(trip);
  return !!range && today >= addDays(range.start, -3) && today <= range.end;
}

const W = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });
const D = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'UTC' });
const M = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * Home's calendar while a trip is close or under way: a strip of the trip's
 * days, and for the chosen day the train or flight, where you sleep (with a
 * photo), anything booked, and the spots stacked into that day.
 */
export function TripModeCalendar({ trip, onAddBooking }: { trip: Trip; onAddBooking: (day: string) => void }) {
  const today = localToday();
  const days = tripDays(trip);
  const range = tripRange(trip)!;
  const [selected, setSelected] = useState(() => (today >= range.start && today <= range.end ? today : range.start));
  const { account } = useAuth();

  const before = daysBetween(today, range.start);
  const status = before > 0 ? `T-minus ${before} day${before === 1 ? '' : 's'}` : `Day ${daysBetween(range.start, today) + 1} of ${days.length}`;

  const stopOf = (date: string) => days.find((d) => d.date === date)?.stop;
  const all: { stop: TripStop; b: Booking }[] = trip.stops.flatMap((stop) => (stop.bookings ?? []).map((b) => ({ stop, b })));
  const onDay = (date: string) => all.filter(({ b }) => b.start.slice(0, 10) === date);
  // A stay covers every night from check-in up to (not including) check-out.
  const staysFor = (date: string) =>
    all.filter(({ b }) => b.kind === 'stay' && b.start.slice(0, 10) <= date && (b.end ? b.end.slice(0, 10) > date : b.start.slice(0, 10) === date));

  const stop = stopOf(selected);
  const transport = onDay(selected).filter(({ b }) => b.kind === 'transport');
  const activities = onDay(selected).filter(({ b }) => b.kind === 'activity');
  const stays = staysFor(selected);
  const timeline = trip.stops.flatMap((s) => s.timeline).filter((i) => i.date === selected);
  const arriving = stop && stop.startDate === selected;

  return (
    <View className="gap-4 rounded-[26px] border border-line bg-[#F6EFDD] p-4">
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="font-sans-semibold text-[11px] uppercase tracking-[1.8px] text-[#8C2F2B]">{status}</Text>
          <T variant="title">{trip.title}</T>
        </View>
        <T variant="small">{account ? '● Calendar synced' : '○ Calendar not connected'}</T>
      </View>

      {/* Day strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {days.map(({ date, stop: s }) => {
          const on = date === selected;
          const busy = onDay(date).length + s.timeline.filter((i) => i.date === date).length;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${M.format(new Date(`${date}T00:00:00Z`))}${busy ? `, ${busy} plans` : ''}`}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelected(date);
              }}
              className={`w-[52px] items-center rounded-2xl border py-2 ${on ? 'border-forest bg-forest' : date === today ? 'border-forest/50 bg-card' : 'border-line bg-card'}`}
            >
              <Text className={`font-sans-medium text-[11px] uppercase ${on ? 'text-sage' : 'text-muted'}`}>{W.format(new Date(`${date}T00:00:00Z`))}</Text>
              <Text className={`font-display text-[20px] ${on ? 'text-[#F8F4EA]' : 'text-ink'}`}>{D.format(new Date(`${date}T00:00:00Z`))}</Text>
              <View className="mt-0.5 h-1.5 flex-row gap-0.5">
                {Array.from({ length: Math.min(3, busy) }, (_, i) => (
                  <View key={i} className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-sage' : s.kind === 'alpine' ? 'bg-ember' : 'bg-rose'}`} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="gap-3">
        <View className="flex-row items-baseline justify-between">
          <T variant="heading">{M.format(new Date(`${selected}T00:00:00Z`))}</T>
          {stop && <T variant="small">{stop.place.name}</T>}
        </View>

        {transport.map(({ b }) => (
          <TransportCard key={b.id} booking={b} />
        ))}
        {arriving && transport.length === 0 && stop && <GettingThere stop={stop} />}

        {stays.map(({ b }) => {
          const nights = b.end ? daysBetween(b.start.slice(0, 10), b.end.slice(0, 10)) : 1;
          return <StayCard key={b.id} booking={b} night={{ index: daysBetween(b.start.slice(0, 10), selected) + 1, total: nights }} />;
        })}
        {stays.length === 0 && stop && stopDays(stop.startDate, stop.nights).slice(0, -1).includes(selected) && (
          <View className="rounded-2xl border border-dashed border-alert/50 p-3">
            <T variant="small" className="text-alert">
              {stop.kind === 'alpine' && stop.accommodation === 'tent'
                ? 'Wild camping tonight: check where a tent is allowed.'
                : 'No stay booked for tonight yet.'}
            </T>
          </View>
        )}

        {activities.map(({ b }) => (
          <ActivityCard key={b.id} booking={b} />
        ))}
        {timeline.length > 0 && <DayTimeline items={timeline} />}

        <View className="gap-2">
          <Button label="Add a booking" kind="secondary" onPress={() => onAddBooking(selected)} />
          <CalendarButton trip={trip} kind="primary" />
        </View>
      </View>
    </View>
  );
}

/** When nothing's booked yet for an arrival day, show the planned route instead. */
function GettingThere({ stop }: { stop: TripStop }) {
  const link = stop.logistics.links.find((l) => l.kind === 'transport');
  if (!link) return null;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL(link.url)}
      className="flex-row items-center gap-3 rounded-2xl border border-dashed border-line bg-card p-3 active:opacity-70"
    >
      <Text className="text-[20px]">{stop.logistics.mode === 'rail' ? '🚆' : stop.logistics.mode === 'road' ? '🚗' : '🚌'}</Text>
      <View className="flex-1">
        <T variant="label">Not booked yet · getting there</T>
        <T variant="heading">{link.label}</T>
      </View>
      <Text className="font-sans text-[16px] text-accent">↗</Text>
    </Pressable>
  );
}
