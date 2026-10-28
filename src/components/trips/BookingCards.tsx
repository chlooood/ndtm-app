import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { T } from '@/components/ui/Text';
import { formatClock, formatDayLabel } from '@/lib/dates';
import type { Booking, TransportMode } from '@/lib/trips/types';

// Each kind of transport gets its own colour and pictogram, so a day's
// journeys read at a glance.
const MODE: Record<TransportMode, { tint: string; label: string; icon: string }> = {
  train: { tint: '#3F5A48', label: 'Train', icon: 'M7 4h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zm0 5h10M8 15h.01M16 15h.01M8 21l2-3m6 3-2-3' },
  flight: { tint: '#3E6C8C', label: 'Flight', icon: 'M2 16l20-6-3-2-6 1-5-6H6l2 7-4 1-2-2H1l1 4 1 3z' },
  bus: { tint: '#B4652A', label: 'Bus', icon: 'M6 3h12a2 2 0 0 1 2 2v11H4V5a2 2 0 0 1 2-2zm-2 8h16M7 19v2m10-2v2M7 15h.01M17 15h.01' },
  car: { tint: '#6D5A8C', label: 'Car', icon: 'M3 16v-4l2-5h14l2 5v4H3zm2-4h14M7 19v-3m10 3v-3' },
  ferry: { tint: '#2B7F8A', label: 'Ferry', icon: 'M3 17c3 2 6 2 9 0s6-2 9 0M5 14l1-5h12l1 5M9 9V5h6v4' },
};

const time = (iso?: string) => (iso ? formatClock(iso.slice(11, 16)) : '');

function open(url?: string) {
  if (!url) return;
  void Haptics.selectionAsync();
  void Linking.openURL(url);
}

function RefChip({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <View className="self-start rounded-md border border-dashed border-line bg-paper px-2 py-1">
      <Text selectable className="font-mono text-[12px] tracking-[1px] text-ink">
        REF {code}
      </Text>
    </View>
  );
}

/** A train, flight, bus, drive or ferry: a ticket stub with departure and arrival. */
export function TransportCard({ booking }: { booking: Booking }) {
  const m = MODE[booking.transportMode ?? 'train'];
  return (
    <Pressable onPress={() => open(booking.url)} disabled={!booking.url} className="flex-row overflow-hidden rounded-2xl border border-line bg-card active:opacity-80">
      <View style={{ backgroundColor: m.tint }} className="w-14 items-center justify-center">
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#FFF8EE" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <Path d={m.icon} />
        </Svg>
      </View>
      <View className="flex-1 gap-1.5 p-3">
        <T variant="label">{[m.label, booking.provider].filter(Boolean).join(' · ')}</T>
        <T variant="heading">{booking.title}</T>
        <View className="flex-row items-center gap-2">
          <Text className="font-mono text-[15px] text-ink">{time(booking.start)}</Text>
          {booking.end && (
            <>
              <View className="h-px flex-1 border-t border-dashed border-line" />
              <Text className="font-mono text-[15px] text-ink">{time(booking.end)}</Text>
            </>
          )}
        </View>
        <RefChip code={booking.confirmation} />
      </View>
      {booking.url && <Text className="self-center pr-3 font-sans text-[16px] text-accent">↗</Text>}
    </Pressable>
  );
}

/** A hostel, hotel or hut: photo (or a painted placeholder), dates, address and reference. */
export function StayCard({ booking, night }: { booking: Booking; night?: { index: number; total: number } }) {
  return (
    <Pressable onPress={() => open(booking.url)} disabled={!booking.url} className="overflow-hidden rounded-2xl border border-line bg-card active:opacity-90">
      <View style={{ height: 120 }}>
        {booking.imageUri ? (
          <Image source={{ uri: booking.imageUri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        ) : (
          <StayIllustration />
        )}
        {night && (
          <View className="absolute left-3 top-3 rounded-full bg-[#2F3B33cc] px-2.5 py-1">
            <Text className="font-sans-semibold text-[11px] tracking-[1px] text-[#F8F4EA]">
              NIGHT {night.index} OF {night.total}
            </Text>
          </View>
        )}
      </View>
      <View className="gap-1.5 p-3">
        <T variant="label">{['Stay', booking.provider].filter(Boolean).join(' · ')}</T>
        <T variant="heading">{booking.title}</T>
        <T variant="small">
          Check in {formatDayLabel(booking.start.slice(0, 10))} {time(booking.start)}
          {booking.end ? ` · out ${formatDayLabel(booking.end.slice(0, 10))} ${time(booking.end)}` : ''}
        </T>
        {booking.address && <T variant="small">⌖ {booking.address}</T>}
        <RefChip code={booking.confirmation} />
      </View>
    </Pressable>
  );
}

/** A tour, gig, museum slot or table booking. */
export function ActivityCard({ booking }: { booking: Booking }) {
  return (
    <Pressable onPress={() => open(booking.url)} disabled={!booking.url} className="flex-row items-center gap-3 rounded-2xl border border-line bg-card p-3 active:opacity-80">
      {booking.imageUri ? (
        <Image source={{ uri: booking.imageUri }} contentFit="cover" style={{ width: 52, height: 52, borderRadius: 12 }} />
      ) : (
        <View className="h-[52px] w-[52px] items-center justify-center rounded-xl bg-blush">
          <Text className="text-[22px]">🎟</Text>
        </View>
      )}
      <View className="flex-1 gap-1">
        <T variant="label">{['Booked', booking.provider].filter(Boolean).join(' · ')}</T>
        <T variant="heading">{booking.title}</T>
        <T variant="mono">
          {time(booking.start)}
          {booking.end ? ` – ${time(booking.end)}` : ''}
          {booking.confirmation ? `  ·  REF ${booking.confirmation}` : ''}
        </T>
      </View>
    </Pressable>
  );
}

/** Painted placeholder for a stay without a photo: a window onto hills at dusk. */
function StayIllustration() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="staySky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E9C9B5" />
          <Stop offset="1" stopColor="#F4E6D4" />
        </LinearGradient>
      </Defs>
      <Rect width={320} height={120} fill="url(#staySky)" />
      <Circle cx={250} cy={38} r={14} fill="#F7D79A" />
      <Path d="M0 90 Q60 60 120 82 T240 74 T320 80 V120 H0Z" fill="#B7C3A8" />
      <Path d="M0 104 Q80 84 170 100 T320 96 V120 H0Z" fill="#8FA387" />
      <Path d="M140 120V70l24-18 24 18v50" fill="#F8F4EA" stroke="#2F3B33" strokeWidth={2} />
      <Rect x={156} y={84} width={16} height={36} fill="#3F5A48" />
      <Rect x={150} y={70} width={10} height={9} fill="#F7D79A" />
      <Rect x={168} y={70} width={10} height={9} fill="#F7D79A" />
    </Svg>
  );
}
