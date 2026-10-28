import { useEffect, useMemo, useState } from 'react';

import type { ImprintPlace } from '@/components/imprint/ImprintMap';
import { localToday } from '@/lib/dates';
import { geocodeCity } from '@/lib/geo/geocode';
import type { Trip } from '@/lib/trips/types';

/**
 * Every leg of every trip as a place on the imprint map, merged by name.
 * Legs without coordinates (typed-in or pasted) are geocoded in the background.
 */
export function useImprintPlaces(trips: Trip[]): ImprintPlace[] {
  const today = localToday();
  const legs = useMemo(() => {
    const byName = new Map<string, { name: string; lat?: number; lng?: number; nights: number; been: boolean; order: string }>();
    for (const trip of trips) {
      for (const stop of trip.stops) {
        const key = stop.place.name.trim().toLowerCase();
        const prev = byName.get(key);
        const been = stop.startDate <= today;
        byName.set(key, {
          name: stop.place.name,
          lat: prev?.lat ?? stop.place.lat,
          lng: prev?.lng ?? stop.place.lng,
          nights: (prev?.nights ?? 0) + stop.nights,
          been: (prev?.been ?? false) || been,
          order: prev && prev.order < stop.startDate ? prev.order : stop.startDate,
        });
      }
    }
    return [...byName.values()].sort((a, b) => a.order.localeCompare(b.order));
  }, [trips, today]);

  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  useEffect(() => {
    let active = true;
    for (const leg of legs) {
      if (leg.lat !== undefined || coords[leg.name]) continue;
      void geocodeCity(leg.name).then((c) => {
        if (active && c) setCoords((prev) => ({ ...prev, [leg.name]: c }));
      });
    }
    return () => {
      active = false;
    };
  }, [legs, coords]);

  return legs.flatMap((leg, order) => {
    const c = leg.lat !== undefined && leg.lng !== undefined ? { lat: leg.lat, lng: leg.lng } : coords[leg.name];
    return c ? [{ name: leg.name, lat: c.lat, lng: c.lng, nights: leg.nights, been: leg.been, order }] : [];
  });
}
