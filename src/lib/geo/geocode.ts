// City-level coordinates for places that came without any (typed-in spots,
// pasted notes). Uses Open-Meteo's free geocoding API, which needs no key,
// and remembers every answer on the device so each name is looked up once.

import { readJSON, writeJSON } from '@/lib/storage';

type LatLng = { lat: number; lng: number };
const CACHE_KEY = 'ndtm.geocode.v1';
const cache: Record<string, LatLng | null> = readJSON(CACHE_KEY) ?? {};

export async function geocodeCity(name: string): Promise<LatLng | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (key in cache) return cache[key];
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(name.trim())}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { results?: { latitude: number; longitude: number }[] };
    const hit = body.results?.[0];
    cache[key] = hit ? { lat: hit.latitude, lng: hit.longitude } : null;
    writeJSON(CACHE_KEY, cache);
    return cache[key];
  } catch {
    return null; // offline: try again next time
  }
}
