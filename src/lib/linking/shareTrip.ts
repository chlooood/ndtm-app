import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import type { Trip } from '@/lib/trips/types';

/**
 * Builds the link that opens a shared trip, served by src/app/trip/[id].tsx.
 * Production and dev builds produce `ndtm://trip/<id>` (scheme from app.json);
 * Expo Go produces `exp://<host>/--/trip/<id>` so the link still works while developing.
 */
export function createTripShareUrl(tripId: string): string {
  return Linking.createURL(`trip/${encodeURIComponent(tripId)}`);
}

/** Pulls the trip id out of any ndtm trip link, or returns null. */
export function parseTripIdFromUrl(url: string): string | null {
  const { hostname, path } = Linking.parse(url);
  // `ndtm://trip/abc` parses as hostname "trip", path "abc";
  // `exp://host/--/trip/abc` parses as path "trip/abc".
  const segments = [hostname, ...(path ?? '').split('/')].filter(Boolean) as string[];
  const index = segments.indexOf('trip');
  const id = index >= 0 ? segments[index + 1] : undefined;
  return id ? decodeURIComponent(id) : null;
}

/** Opens the OS share sheet with the trip link. */
export async function shareTrip(trip: Trip): Promise<void> {
  const url = createTripShareUrl(trip.id);
  const places = trip.stops.map((s) => s.place.name).join(' → ');
  await Share.share({
    title: trip.title,
    // Android ignores `url`, so the link is also in the message.
    message: `${trip.title}${places ? `: ${places}` : ''}\nOpen it in ndtm: ${url}`,
    url,
  });
}
