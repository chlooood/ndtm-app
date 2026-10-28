import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Stepper } from '@/components/trips/StopCard';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/Text';
import { addDays, formatClock, formatDayLabel, nextFriday, shiftClock } from '@/lib/dates';
import type { LifestyleSpot, SpotAction, SpotActionResult, SpotActionType } from '@/lib/spots/types';
import { defaultNoteText, defaultTimeFor, tripDays } from '@/lib/trips/itinerary';
import { useAuth } from '@/lib/auth/AuthContext';
import { appendNoteToGoogleEvent } from '@/lib/calendar/googleCalendar';
import { useTrips } from '@/lib/trips/store';
import type { ClockTime } from '@/lib/trips/types';

const OPTIONS: { type: SpotActionType; label: string; hint: string }[] = [
  { type: 'start_new_trip', label: '+ Start new trip', hint: 'A fresh weekend built around this spot' },
  { type: 'add_to_active_trip', label: '+ Add to active trip', hint: 'Stack it into your itinerary at a set time' },
  { type: 'append_note', label: '+ Save as note', hint: 'Add one line to that day in Google Calendar' },
];

type Props = {
  spot: LifestyleSpot;
  /** Called after a successful action, with what happened. */
  onDone: (result: Extract<SpotActionResult, { ok: true }>) => void;
};

/** The three quick actions for a scanned or typed-in venue. Picking one reveals only the inputs it needs. */
export function SpotQuickActions({ spot, onDone }: Props) {
  const { activeTrip, runSpotAction } = useTrips();
  const auth = useAuth();
  const days = tripDays(activeTrip);
  const hasTrip = days.length > 0;

  const [choice, setChoice] = useState<SpotActionType | null>(null);
  const [time, setTime] = useState<ClockTime>(defaultTimeFor(spot.category));
  // Clubs default to the first Saturday of the trip, everything else to the first day.
  const firstSaturday = days.find((d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === 6)?.date;
  const [date, setDate] = useState(spot.category === 'club' ? (firstSaturday ?? days[0]?.date) : days[0]?.date);
  const [note, setNote] = useState<string | null>(null); // null = follow the default text
  const [newStart, setNewStart] = useState(nextFriday());
  const [nights, setNights] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const noteText = note ?? defaultNoteText(spot, time);

  const confirm = () => {
    let action: SpotAction;
    if (choice === 'start_new_trip') {
      const slotDay = spot.category === 'club' ? addDays(newStart, 1) : newStart;
      action = { type: choice, spot, startDate: newStart, nights, firstSlot: { date: slotDay, time } };
    } else if (choice === 'add_to_active_trip' && date) {
      action = { type: choice, spot, tripId: activeTrip.id, date, time };
    } else if (choice === 'append_note' && date) {
      action = { type: choice, spot, tripId: activeTrip.id, date, time, text: noteText };
    } else {
      return;
    }
    const result = runSpotAction(action);
    if (!result.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.reason === 'no_active_trip' ? 'Your active trip has no days yet. Start a new trip instead.' : 'That day is outside your trip.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // If this leg is already in Google Calendar, append the note there too.
    const stop = result.trip.stops.find((s) => s.id === result.stopId);
    if (action.type === 'append_note' && stop?.googleEventId && auth.account) {
      void auth
        .calendarToken()
        .then((token) => (token ? appendNoteToGoogleEvent(token, stop.googleEventId!, { date: action.date, text: action.text }) : undefined))
        .catch((e: Error) => console.warn('Note saved in ndtm but not in Google Calendar:', e.message));
    }
    onDone(result);
  };

  return (
    <View className="gap-2.5">
      {OPTIONS.map((o) => {
        const disabled = o.type !== 'start_new_trip' && !hasTrip;
        const selected = choice === o.type;
        return (
          <Pressable
            key={o.type}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              void Haptics.selectionAsync();
              setChoice(o.type);
              setError(null);
            }}
            className={`rounded-2xl border px-4 py-3 ${selected ? 'border-accent bg-accent/10' : 'border-line bg-paper'} ${disabled ? 'opacity-40' : ''}`}
          >
            <Text className={`font-sans-semibold text-[15px] ${selected ? 'text-accent' : 'text-ink'}`}>{o.label}</Text>
            <T variant="small">{disabled ? `Needs an active trip with dates (${activeTrip.title} is empty)` : o.hint}</T>
          </Pressable>
        );
      })}

      {choice === 'start_new_trip' && (
        <View className="mt-2 gap-3">
          <T variant="label">Arrive</T>
          <DayChips days={[0, 7, 14, 21].map((n) => addDays(nextFriday(), n))} value={newStart} onChange={setNewStart} />
          <View className="flex-row items-center justify-between">
            <T variant="label">Nights in {spot.city}</T>
            <View className="flex-row items-center gap-3">
              <Stepper label="−" accessibilityLabel="One night fewer" onPress={() => setNights((n) => Math.max(1, n - 1))} />
              <T variant="mono" className="text-ink">
                {nights}
              </T>
              <Stepper label="+" accessibilityLabel="One more night" onPress={() => setNights((n) => Math.min(14, n + 1))} />
            </View>
          </View>
          <TimeRow time={time} onChange={setTime} label={`${spot.name} at`} />
        </View>
      )}

      {(choice === 'add_to_active_trip' || choice === 'append_note') && date && (
        <View className="mt-2 gap-3">
          <T variant="label">Day in {activeTrip.title}</T>
          <DayChips days={days.map((d) => d.date)} value={date} onChange={setDate} />
          <TimeRow time={time} onChange={setTime} label="Time" />
          {choice === 'append_note' && (
            <View>
              <T variant="label">Line added to the calendar</T>
              <TextInput
                value={noteText}
                onChangeText={setNote}
                accessibilityLabel="Note text"
                className="mt-1.5 rounded-xl border border-line bg-paper px-3 py-2.5 font-sans text-[15px] text-ink"
              />
            </View>
          )}
        </View>
      )}

      {error && <T variant="small" className="text-alert">{error}</T>}
      {choice && (
        <View className="mt-2">
          <Button label={OPTIONS.find((o) => o.type === choice)!.label.replace('+ ', '')} onPress={confirm} />
        </View>
      )}
    </View>
  );
}

function DayChips({ days, value, onChange }: { days: string[]; value: string; onChange: (d: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {days.map((d) => {
        const on = d === value;
        return (
          <Pressable
            key={d}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(d);
            }}
            className={`rounded-full border px-3.5 py-2 ${on ? 'border-ink bg-ink' : 'border-line bg-paper'}`}
          >
            <Text className={`font-sans-medium text-[13px] ${on ? 'text-paper' : 'text-ink'}`}>{formatDayLabel(d)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TimeRow({ time, onChange, label }: { time: ClockTime; onChange: (t: ClockTime) => void; label: string }) {
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
