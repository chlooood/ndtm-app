import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Stepper } from '@/components/trips/StopCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/Text';
import { PALETTES, worldVars } from '@/components/ui/theme';
import { addDays, formatClock, formatDayLabel, shiftClock } from '@/lib/dates';
import { stopForDate, tripDays } from '@/lib/trips/itinerary';
import { useTrips } from '@/lib/trips/store';
import type { BookingKind, ClockTime, TransportMode } from '@/lib/trips/types';

const KINDS: { key: BookingKind; label: string }[] = [
  { key: 'stay', label: 'Stay' },
  { key: 'transport', label: 'Transport' },
  { key: 'activity', label: 'Activity' },
];
const MODES: TransportMode[] = ['train', 'flight', 'bus', 'car', 'ferry'];
const DEFAULT_TIME: Record<BookingKind, ClockTime> = { stay: '15:00', transport: '09:00', activity: '11:00' };

/** Add something you've booked elsewhere. ndtm keeps the details; payment stays on the booking site. */
export function AddBookingSheet({ initialDay, onClose }: { initialDay: string; onClose: () => void }) {
  const { activeTrip, addBooking } = useTrips();
  const days = tripDays(activeTrip).map((d) => d.date);
  const [kind, setKind] = useState<BookingKind>('stay');
  const [mode, setMode] = useState<TransportMode>('train');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [url, setUrl] = useState('');
  const [day, setDay] = useState(days.includes(initialDay) ? initialDay : days[0]);
  const [start, setStart] = useState<ClockTime>(DEFAULT_TIME.stay);
  const [end, setEnd] = useState<ClockTime>('11:00');
  const [endDay, setEndDay] = useState(addDays(day, 1));
  const [imageUri, setImageUri] = useState<string | undefined>();
  const placeholder = PALETTES.home.muted;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const save = (close: (then: () => void) => void) => {
    const stop = stopForDate(activeTrip, day);
    if (!stop || title.trim().length < 2) return;
    addBooking(stop.id, {
      kind,
      transportMode: kind === 'transport' ? mode : undefined,
      title: title.trim(),
      provider: provider.trim() || undefined,
      confirmation: confirmation.trim() || undefined,
      url: url.trim() || undefined,
      start: `${day}T${start}`,
      end: kind === 'stay' ? `${endDay}T${end}` : kind === 'transport' ? `${day}T${end}` : undefined,
      imageUri,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    close(onClose);
  };

  const field = 'rounded-xl border border-line bg-paper px-3 py-2.5 font-sans text-[15px] text-ink';

  return (
    <View style={worldVars('home')} className="absolute inset-0" pointerEvents="box-none">
      <BottomSheet onDismiss={onClose} accessibilityLabel="Add a booking">
        {(close) => (
          <View className="gap-3">
            <T variant="label">Add a booking</T>
            <T variant="title">What did you book?</T>
            <Chips options={KINDS} value={kind} onChange={(k) => { setKind(k); setStart(DEFAULT_TIME[k]); setEnd(k === 'stay' ? '11:00' : shiftClock(DEFAULT_TIME[k], 120)); }} />
            {kind === 'transport' && <Chips options={MODES.map((m) => ({ key: m, label: m[0].toUpperCase() + m.slice(1) }))} value={mode} onChange={setMode} />}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={kind === 'stay' ? 'Generator Barcelona' : kind === 'transport' ? 'TGV 6201 Lyon → Paris' : 'Sagrada Família, 10:30 slot'}
              placeholderTextColor={placeholder}
              accessibilityLabel="What you booked"
              className={field}
            />
            <View className="flex-row gap-2">
              <TextInput value={provider} onChangeText={setProvider} placeholder={kind === 'stay' ? 'Hostelworld' : kind === 'transport' ? 'SNCF Connect' : 'GetYourGuide'} placeholderTextColor={placeholder} accessibilityLabel="Booked through" className={`min-w-0 flex-1 ${field}`} />
              <TextInput value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" placeholder="Reference" placeholderTextColor={placeholder} accessibilityLabel="Booking reference" className={`min-w-0 flex-1 ${field}`} />
            </View>
            <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" placeholder="Link to the booking (optional)" placeholderTextColor={placeholder} accessibilityLabel="Booking link" className={field} />

            <T variant="label">{kind === 'stay' ? 'Check in' : kind === 'transport' ? 'Departs' : 'Day'}</T>
            <DayChips days={days} value={day} onChange={(d) => { setDay(d); if (endDay <= d) setEndDay(addDays(d, 1)); }} />
            <TimeRow label={kind === 'stay' ? 'Check-in time' : kind === 'transport' ? 'Departs at' : 'Starts at'} time={start} onChange={setStart} />
            {kind === 'stay' && (
              <>
                <T variant="label">Check out</T>
                <DayChips days={[...days, addDays(days[days.length - 1], 1)].filter((d) => d > day)} value={endDay} onChange={setEndDay} />
              </>
            )}
            {kind !== 'activity' && <TimeRow label={kind === 'stay' ? 'Check-out time' : 'Arrives at'} time={end} onChange={setEnd} />}

            {kind !== 'transport' && (
              <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} className="flex-row items-center gap-3 rounded-xl border border-dashed border-line p-2.5 active:opacity-70">
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: 48, height: 48, borderRadius: 10 }} />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-[10px] bg-sage">
                    <Text className="text-[18px]">＋</Text>
                  </View>
                )}
                <T variant="muted">{imageUri ? 'Change photo' : 'Add a photo of the place (optional)'}</T>
              </Pressable>
            )}

            <Button label="Save booking" disabled={title.trim().length < 2} onPress={() => save(close)} />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

function Chips<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(o.key);
            }}
            className={`rounded-full border px-3.5 py-2 ${on ? 'border-ink bg-ink' : 'border-line bg-paper'}`}
          >
            <Text className={`font-sans-medium text-[13px] ${on ? 'text-paper' : 'text-ink'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayChips({ days, value, onChange }: { days: string[]; value: string; onChange: (d: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {days.map((d) => {
        const on = d === value;
        return (
          <Pressable key={d} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(d)} className={`rounded-full border px-3.5 py-2 ${on ? 'border-ink bg-ink' : 'border-line bg-paper'}`}>
            <Text className={`font-sans-medium text-[13px] ${on ? 'text-paper' : 'text-ink'}`}>{formatDayLabel(d)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TimeRow({ label, time, onChange }: { label: string; time: ClockTime; onChange: (t: ClockTime) => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <T variant="label">{label}</T>
      <View className="flex-row items-center gap-3">
        <Stepper label="−" accessibilityLabel="30 minutes earlier" onPress={() => onChange(shiftClock(time, -30))} />
        <T variant="mono" className="w-[72px] text-center text-[14px] text-ink">
          {formatClock(time)}
        </T>
        <Stepper label="+" accessibilityLabel="30 minutes later" onPress={() => onChange(shiftClock(time, 30))} />
      </View>
    </View>
  );
}
