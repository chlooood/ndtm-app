import type { TripScan } from '@/lib/scanner/schema';
import type { BookingLink, Logistics, Place } from '@/lib/trips/types';

export const LYON_PART_DIEU: Place = { name: 'Lyon Part-Dieu', lat: 45.7606, lng: 4.8593 };

const coords = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;
const q = encodeURIComponent;

/**
 * Picks how to get from `origin` to the scanned destination.
 * Alpine trips are routed straight to the road fallback; city trips get rail
 * and hostel links.
 */
export function planLogistics(scan: TripScan, origin: Place = LYON_PART_DIEU): Logistics {
  if (scan.tripType === 'alpine_backpacking') return flagTransitUnfeasible(scan, origin);

  const links: BookingLink[] = [
    {
      label: `Trains from ${origin.name}`,
      url: googleMapsDirectionsUrl(origin, scan.estimatedLocation, 'transit'),
      kind: 'transport',
    },
    { label: 'SNCF Connect', url: 'https://www.sncf-connect.com/', kind: 'transport' },
    {
      label: `Hostels in ${scan.destinationName}`,
      // ht_id=203 is Booking.com's "Hostels" property-type filter.
      url: `https://www.booking.com/searchresults.html?ss=${q(scan.destinationName)}&nflt=ht_id%3D203`,
      kind: 'lodging',
    },
  ];
  return { mode: 'rail', publicTransitFeasible: true, links };
}

/**
 * Trailheads and huts are rarely reachable by public transport, so mark
 * transit as unfeasible and hand off to Google Maps driving directions plus
 * carpool and hut-booking links.
 */
export function flagTransitUnfeasible(scan: TripScan, origin: Place = LYON_PART_DIEU): Logistics {
  const links: BookingLink[] = [
    {
      label: `Drive from ${origin.name}`,
      url: googleMapsDirectionsUrl(origin, scan.estimatedLocation, 'driving'),
      kind: 'transport',
    },
    {
      label: 'Find a carpool on BlaBlaCar',
      url: `https://www.blablacar.fr/search?fn=${q(origin.name)}&tn=${q(scan.estimatedLocation.region)}`,
      kind: 'transport',
    },
    { label: 'Book mountain huts', url: 'https://www.hut-reservation.org/', kind: 'lodging' },
    {
      label: 'Trailhead on the map',
      url: `https://www.google.com/maps/search/?api=1&query=${coords(scan.estimatedLocation)}`,
      kind: 'map',
    },
  ];
  return {
    mode: 'driving_carpool',
    publicTransitFeasible: false,
    reason: `${scan.destinationName} is backcountry terrain, so public transit is unlikely to reach the trailhead. Plan to drive or carpool.`,
    links,
  };
}

export function googleMapsDirectionsUrl(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  travelmode: 'driving' | 'transit',
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${coords(origin)}&destination=${coords(destination)}&travelmode=${travelmode}`;
}
