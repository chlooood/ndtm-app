import { addDays } from '@/lib/dates';
import { createTripShareUrl } from '@/lib/linking/shareTrip';
import type { BookingLink, Trip, TripStop } from '@/lib/trips/types';

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
const COLOR_BY_TRIP_TYPE = { city: '9', alpine_backpacking: '10' } as const;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const linkHtml = (link: BookingLink) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`;

/**
 * Builds the event description. Google Calendar renders a small HTML subset,
 * so booking pages appear as tappable links. Payment always happens on the
 * external site.
 */
export function buildEventDescription(stop: TripStop, shareUrl: string): string {
  const { scan, logistics } = stop;
  const lines: string[] = [];

  if (scan.extractedContext) lines.push(escapeHtml(scan.extractedContext), '');

  if (!logistics.publicTransitFeasible) {
    lines.push(`<b>⚠ No public transit.</b> ${escapeHtml(logistics.reason)}`, '');
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

export function stopToCalendarEvent(trip: Trip, stop: TripStop): GoogleCalendarEvent {
  const { scan } = stop;
  return {
    summary: `${scan.tripType === 'alpine_backpacking' ? '🏔' : '🌆'} ${scan.destinationName}`,
    location: `${scan.destinationName}, ${scan.estimatedLocation.region}`,
    description: buildEventDescription(stop, createTripShareUrl(trip.id)),
    start: { date: stop.startDate },
    // All-day end is exclusive, so a 2-night stop starting Fri ends on Sun (date = Mon).
    end: { date: addDays(stop.startDate, stop.nights + 1) },
    colorId: COLOR_BY_TRIP_TYPE[scan.tripType],
    transparency: 'transparent',
    extendedProperties: { private: { ndtmTripId: trip.id, ndtmStopId: stop.id } },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 3 * 24 * 60 }] },
  };
}

export function tripToCalendarEvents(trip: Trip): GoogleCalendarEvent[] {
  return trip.stops.map((stop) => stopToCalendarEvent(trip, stop));
}

/**
 * Inserts every stop as an all-day event. `accessToken` is a Google OAuth
 * token with the https://www.googleapis.com/auth/calendar.events scope
 * (obtain it with expo-auth-session or @react-native-google-signin).
 */
export async function insertTripIntoGoogleCalendar(
  trip: Trip,
  accessToken: string,
  calendarId = 'primary',
): Promise<{ id: string; htmlLink: string }[]> {
  const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const created: { id: string; htmlLink: string }[] = [];
  for (const event of tripToCalendarEvents(trip)) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error(`Google Calendar rejected "${event.summary}" (${res.status}): ${await res.text()}`);
    created.push((await res.json()) as { id: string; htmlLink: string });
  }
  return created;
}
