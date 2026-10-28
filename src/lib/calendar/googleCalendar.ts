import { addDays, formatClock, formatDayLabel, stopDays } from '@/lib/dates';
import { createTripShareUrl } from '@/lib/linking/shareTrip';
import type { BookingLink, CalendarNote, Trip, TripStop } from '@/lib/trips/types';

/**
 * The subset of the Google Calendar v3 Event resource that ndtm writes.
 * https://developers.google.com/calendar/api/v3/reference/events
 */
export type GoogleCalendarEvent = {
  summary: string;
  location: string;
  description: string;
  /** All-day events: `end.date` is exclusive. */
  start: { date: string };
  end: { date: string };
  colorId?: string;
  transparency: 'opaque' | 'transparent';
  extendedProperties: { private: Record<string, string> };
  reminders: { useDefault: false; overrides: { method: 'popup' | 'email'; minutes: number }[] };
};

// Google Calendar's event palette: 9 = blueberry (cities), 10 = basil (mountains).
const COLOR_BY_KIND = { city: '9', alpine: '10' } as const;

const TIMELINE_HEADING = '<b>Timeline</b>';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const linkHtml = (link: BookingLink) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`;

/** The heading a day gets inside the description, e.g. "<u>Sat 22 May</u>". */
export const dayHeading = (isoDate: string) => `<u>${formatDayLabel(isoDate)}</u>`;

/** "11:00 PM: Go to Razzmatazz" for a note; "11:00 PM · Razzmatazz (club)" for a stacked venue. */
function timelineLine(item: TripStop['timeline'][number]): string {
  return item.kind === 'note'
    ? escapeHtml(item.text)
    : `${formatClock(item.time)} · ${escapeHtml(item.name)} (${item.category})`;
}

/**
 * Builds the event description. Google Calendar renders a small HTML subset,
 * so booking pages appear as tappable links. Payment always happens on the
 * external site. Venues and notes appear under a per-day Timeline.
 */
export function buildEventDescription(stop: TripStop, shareUrl: string): string {
  const { logistics } = stop;
  const lines: string[] = [];

  if (stop.scan?.extractedContext) lines.push(escapeHtml(stop.scan.extractedContext), '');

  if (logistics.mode === 'road') lines.push(`<b>⚠ No public transit.</b> ${escapeHtml(logistics.reason)}`, '');
  if (logistics.mode === 'trailhead_transit') lines.push(`<b>⛺ Wild camping.</b> ${escapeHtml(logistics.reason)}`, '');

  const days = stopDays(stop.startDate, stop.nights).filter((d) => stop.timeline.some((i) => i.date === d));
  if (days.length) {
    lines.push(TIMELINE_HEADING);
    for (const day of days) {
      lines.push(dayHeading(day), ...stop.timeline.filter((i) => i.date === day).map((i) => `• ${timelineLine(i)}`));
    }
    lines.push('');
  }

  const sections: [string, BookingLink['kind'][]][] = [
    ['Getting there', ['transport', 'map']],
    ['Where to stay', ['lodging']],
    ['Things to book', ['activity']],
  ];
  for (const [heading, kinds] of sections) {
    const links = logistics.links.filter((l) => kinds.includes(l.kind));
    if (links.length === 0) continue;
    lines.push(`<b>${heading}</b>`, ...links.map((l) => `• ${linkHtml(l)}`), '');
  }

  lines.push(`Open the shared itinerary in ndtm: <a href="${escapeHtml(shareUrl)}">${escapeHtml(shareUrl)}</a>`);
  return lines.join('<br>');
}

/**
 * Appends one line under a day in an existing description string, creating
 * the Timeline section and the day heading if they are missing. Lines under a
 * day stay in the order they were added. Used for events already in Google
 * Calendar, where ndtm only has the description text to work with.
 */
export function appendLineToDescription(description: string, isoDate: string, line: string): string {
  const bullet = `• ${escapeHtml(line)}`;
  const heading = dayHeading(isoDate);
  const parts = description ? description.split('<br>') : [];

  const timelineAt = parts.indexOf(TIMELINE_HEADING);
  if (timelineAt === -1) {
    parts.unshift(TIMELINE_HEADING, heading, bullet, '');
    return parts.join('<br>');
  }

  const dayAt = parts.indexOf(heading, timelineAt);
  if (dayAt === -1) {
    // New day: add it at the end of the Timeline section (the first blank line after the heading).
    let end = parts.indexOf('', timelineAt);
    if (end === -1) end = parts.length;
    parts.splice(end, 0, heading, bullet);
    return parts.join('<br>');
  }

  // Existing day: insert after its last bullet.
  let insertAt = dayAt + 1;
  while (insertAt < parts.length && parts[insertAt].startsWith('• ')) insertAt++;
  parts.splice(insertAt, 0, bullet);
  return parts.join('<br>');
}

export function stopToCalendarEvent(trip: Trip, stop: TripStop): GoogleCalendarEvent {
  return {
    summary: `${stop.kind === 'alpine' ? (stop.accommodation === 'tent' ? '⛺' : '🏔') : '🌆'} ${stop.place.name}`,
    location: `${stop.place.name}, ${stop.place.region}`,
    description: buildEventDescription(stop, createTripShareUrl(trip.id)),
    start: { date: stop.startDate },
    // All-day end is exclusive, so a 2-night stop starting Fri ends on Sun (date = Mon).
    end: { date: addDays(stop.startDate, stop.nights + 1) },
    colorId: COLOR_BY_KIND[stop.kind],
    transparency: 'transparent',
    extendedProperties: { private: { ndtmTripId: trip.id, ndtmStopId: stop.id } },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 3 * 24 * 60 }] },
  };
}

export function tripToCalendarEvents(trip: Trip): GoogleCalendarEvent[] {
  return trip.stops.map((stop) => stopToCalendarEvent(trip, stop));
}

const eventsEndpoint = (calendarId: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

/**
 * Inserts every stop as an all-day event. `accessToken` is a Google OAuth
 * token with the https://www.googleapis.com/auth/calendar.events scope
 * (obtain it with expo-auth-session or @react-native-google-signin).
 * Returns the created ids in stop order; store them as stop.googleEventId.
 */
export async function insertTripIntoGoogleCalendar(
  trip: Trip,
  accessToken: string,
  calendarId = 'primary',
): Promise<{ id: string; htmlLink: string }[]> {
  const created: { id: string; htmlLink: string }[] = [];
  for (const event of tripToCalendarEvents(trip)) {
    const res = await fetch(eventsEndpoint(calendarId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error(`Google Calendar rejected "${event.summary}" (${res.status}): ${await res.text()}`);
    created.push((await res.json()) as { id: string; htmlLink: string });
  }
  return created;
}

/**
 * [ + Save as Note ] for a stop that is already in Google Calendar: reads the
 * event's current description, appends the note under its day, and patches
 * only the description so edits made in Google Calendar are kept.
 */
export async function appendNoteToGoogleEvent(
  accessToken: string,
  eventId: string,
  note: Pick<CalendarNote, 'date' | 'text'>,
  calendarId = 'primary',
): Promise<void> {
  const url = `${eventsEndpoint(calendarId)}/${encodeURIComponent(eventId)}`;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const current = await fetch(`${url}?fields=description`, { headers });
  if (!current.ok) throw new Error(`Could not read the calendar event (${current.status})`);
  const { description = '' } = (await current.json()) as { description?: string };

  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ description: appendLineToDescription(description, note.date, note.text) }),
  });
  if (!res.ok) throw new Error(`Could not update the calendar event (${res.status}): ${await res.text()}`);
}
