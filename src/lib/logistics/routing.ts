import { railBookingLinks, resolveBase } from '@/lib/logistics/passes';
import type { TransitPass } from '@/lib/profile/ProfileContext';
import type { AccommodationType, BookingLink, Logistics, PlaceRef, StopKind } from '@/lib/trips/types';

/** Where the user travels from and which rail cards they hold, taken from their profile. */
export type RoutingContext = { origin: PlaceRef; passes: readonly TransitPass[] };

export const DEFAULT_ROUTING: RoutingContext = { origin: resolveBase('Lyon, France'), passes: ['NONE'] };

const q = encodeURIComponent;

/** Coordinates when known, otherwise the place's name, so Maps can still search for it. */
const mapsTarget = (p: PlaceRef) =>
  p.lat !== undefined && p.lng !== undefined ? `${p.lat},${p.lng}` : q(`${p.name}, ${p.region}`);

type LegInput = { kind: StopKind; place: PlaceRef; accommodation?: AccommodationType };

/**
 * Backcountry transit depends on where you are. In Europe, trains and valley
 * buses often reach trailheads; in North America (e.g. trips from Vancouver)
 * they rarely do, so backcountry legs there start on the road. Decided from
 * longitude: anything west of the mid-Atlantic counts as the Americas.
 */
export const isAmericas = (p: PlaceRef) => p.lng !== undefined && p.lng < -30;

/**
 * Picks how to get from `origin` to a leg.
 * - city: rail and hostels
 * - alpine + hut: road, because transit rarely reaches hut trailheads
 * - alpine + tent in Europe: transit to the nearest reachable trailhead first, driving as fallback, no lodging
 * - alpine + tent in North America: driving first, no lodging
 */
export function planLogistics(leg: LegInput, ctx: RoutingContext = DEFAULT_ROUTING): Logistics {
  const { origin } = ctx;
  if (leg.kind === 'alpine') {
    if (leg.accommodation !== 'tent') return flagTransitUnfeasible(leg.place, origin);
    return isAmericas(leg.place) ? planBackcountryDrive(leg.place, origin) : planTentLogistics(leg.place, origin);
  }
  const links: BookingLink[] = [
    { label: `Trains from ${origin.name}`, url: googleMapsDirectionsUrl(origin, leg.place, 'transit'), kind: 'transport' },
    ...railBookingLinks(ctx.passes),
    {
      label: `Hostels in ${leg.place.name}`,
      // ht_id=203 is Booking.com's "Hostels" property-type filter.
      url: `https://www.booking.com/searchresults.html?ss=${q(leg.place.name)}&nflt=ht_id%3D203`,
      kind: 'lodging',
    },
  ];
  return { mode: 'rail', links };
}

/**
 * Hut trips: trailheads and huts are rarely reachable by public transport,
 * so mark transit as unfeasible and hand off to driving, carpool and hut booking.
 */
export function flagTransitUnfeasible(place: PlaceRef, origin: PlaceRef = DEFAULT_ROUTING.origin): Logistics {
  const americas = isAmericas(place);
  return {
    mode: 'road',
    reason: `${place.name} is backcountry terrain, so public transit is unlikely to reach the trailhead. Plan to drive or carpool.`,
    links: [
      { label: americas ? `Google Maps: drive from ${origin.name}` : `Drive from ${origin.name}`, url: googleMapsDirectionsUrl(origin, place, 'driving'), kind: 'transport' },
      carpoolLink(place, origin),
      americas
        ? { label: 'Book Alpine Club of Canada huts', url: 'https://www.alpineclubofcanada.ca/', kind: 'lodging' }
        : { label: 'Book mountain huts', url: 'https://www.hut-reservation.org/', kind: 'lodging' },
      trailheadMapLink(place),
    ],
  };
}

/**
 * Tent trips in North America: trailheads there are rarely served by transit,
 * so the plan is Google Maps driving directions first. Still no lodging links.
 */
export function planBackcountryDrive(place: PlaceRef, origin: PlaceRef = DEFAULT_ROUTING.origin): Logistics {
  return {
    mode: 'road',
    reason: `Trailheads around ${place.name} are rarely served by transit, so plan to drive or share a ride. Check road and parking conditions before you go.`,
    links: [
      { label: `Google Maps: drive from ${origin.name}`, url: googleMapsDirectionsUrl(origin, place, 'driving'), kind: 'transport' },
      carpoolLink(place, origin),
      trailheadMapLink(place),
    ],
  };
}

/** BlaBlaCar in Europe; Poparide, the Canadian rideshare, in North America. */
function carpoolLink(place: PlaceRef, origin: PlaceRef): BookingLink {
  return isAmericas(place)
    ? { label: 'Find a ride on Poparide', url: 'https://www.poparide.com/', kind: 'transport' }
    : { label: 'Find a carpool on BlaBlaCar', url: `https://www.blablacar.fr/search?fn=${q(origin.name)}&tn=${q(place.region)}`, kind: 'transport' };
}

/**
 * Tent / wild camping: no huts or hostels to book. Wild campers usually
 * travel light and flexible, so try public transit to the closest
 * reachable trailhead first and only then fall back to driving.
 */
export function planTentLogistics(place: PlaceRef, origin: PlaceRef = DEFAULT_ROUTING.origin): Logistics {
  return {
    mode: 'trailhead_transit',
    reason: `Try public transit to the closest trailhead to ${place.name} first. If the last bus doesn't line up, drive or carpool.`,
    links: [
      {
        label: 'Public transit to the nearest trailhead',
        url: googleMapsDirectionsUrl(origin, place, 'transit'),
        kind: 'transport',
      },
      {
        label: 'Trailheads and bus stops nearby',
        url: `https://www.google.com/maps/search/?api=1&query=${q(`trailhead bus stop near ${place.name}`)}`,
        kind: 'map',
      },
      { label: `Fallback: drive from ${origin.name}`, url: googleMapsDirectionsUrl(origin, place, 'driving'), kind: 'transport' },
      {
        label: 'Fallback: carpool on BlaBlaCar',
        url: `https://www.blablacar.fr/search?fn=${q(origin.name)}&tn=${q(place.region)}`,
        kind: 'transport',
      },
    ],
  };
}

function trailheadMapLink(place: PlaceRef): BookingLink {
  return { label: 'Trailhead on the map', url: `https://www.google.com/maps/search/?api=1&query=${mapsTarget(place)}`, kind: 'map' };
}

export function googleMapsDirectionsUrl(
  origin: PlaceRef,
  destination: PlaceRef,
  travelmode: 'driving' | 'transit',
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${mapsTarget(origin)}&destination=${mapsTarget(destination)}&travelmode=${travelmode}`;
}

/** True when the plan starts on public transport (all the way, or to the trailhead). */
export const startsOnTransit = (l: Logistics) => l.mode !== 'road';
