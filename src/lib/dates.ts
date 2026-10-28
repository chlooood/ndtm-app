// Trip dates are plain calendar days (YYYY-MM-DD) handled in UTC so they
// never shift with the phone's timezone.

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The next Friday on or after `from`, the default start of a weekend trip. */
export function nextFriday(from: Date = new Date()): string {
  const today = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  const offset = (5 - today.getUTCDay() + 7) % 7;
  today.setUTCDate(today.getUTCDate() + offset);
  return today.toISOString().slice(0, 10);
}

export function formatDayRange(startDate: string, nights: number): string {
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${addDays(startDate, nights)}T00:00:00Z`);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** Every calendar day a stop covers, from arrival through departure. */
export function stopDays(startDate: string, nights: number): string[] {
  return Array.from({ length: nights + 1 }, (_, i) => addDays(startDate, i));
}

/** "Sat 22 May" */
export function formatDayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

/** "23:00" -> "11:00 PM" */
export function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Adds minutes to an "HH:MM" time, wrapping past midnight. */
export function shiftClock(time: string, minutes: number): `${number}:${number}` {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` as `${number}:${number}`;
}
