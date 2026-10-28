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
