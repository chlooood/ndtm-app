import { addDays, stopDays } from '@/lib/dates';
import { emptySeason, type UserProfile } from '@/lib/profile/store';
import type { Trip } from '@/lib/trips/types';

const NIGHT_CATEGORIES = new Set(['club', 'bar']);

/**
 * The scrapbook numbers, counted from what actually happened: trips that have
 * ended, photos you've attached (scans and booking photos), and per-month
 * hikes, hut nights and nights out for this year. Distance stays at zero
 * until trails carry a length.
 */
export function computeStats(trips: Trip[], today: string): UserProfile['stats'] {
  const year = Number(today.slice(0, 4));
  const season = emptySeason(year);
  let completedTrips = 0;
  let photos = 0;

  for (const trip of trips) {
    if (!trip.stops.length) continue;
    const last = trip.stops[trip.stops.length - 1];
    if (addDays(last.startDate, last.nights) < today) completedTrips++;

    for (const stop of trip.stops) {
      if (stop.sourceImageUri) photos++;
      photos += (stop.bookings ?? []).filter((b) => b.imageUri).length;

      const month = Number(stop.startDate.slice(5, 7)) - 1;
      const inYear = stop.startDate.startsWith(String(year)) && stop.startDate <= today;
      if (stop.kind === 'alpine' && inYear) {
        season.hikes[month]++;
        if (stop.accommodation !== 'tent') {
          // Count only the hut nights that have already passed.
          season.hutNights[month] += stopDays(stop.startDate, stop.nights).slice(0, -1).filter((d) => d < today).length;
        }
      }
      for (const item of stop.timeline) {
        if (item.kind === 'venue' && NIGHT_CATEGORIES.has(item.category) && item.date <= today && item.date.startsWith(String(year))) {
          season.nightsOut[Number(item.date.slice(5, 7)) - 1]++;
        }
      }
    }
  }
  return { completedTrips, photos, season };
}
