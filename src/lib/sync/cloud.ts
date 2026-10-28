// Cloud sync for one signed-in user: trips and spots in Supabase tables
// (user_trips, user_spots) and photos in the private "photos" bucket. Row
// level security limits every read and write to the owner. The device stays
// the source of truth while you edit; the cloud copy is how a second device,
// or the web app after a reload, catches up.

import * as Crypto from 'expo-crypto';

import type { LifestyleSpot } from '@/lib/spots/types';
import { supabase } from '@/lib/supabase';
import type { Trip } from '@/lib/trips/types';

const PHOTOS = 'photos';

export type CloudSnapshot = { trips: Trip[]; spots: LifestyleSpot[] };

/** Everything this user has in the cloud. */
export async function pullAll(): Promise<CloudSnapshot> {
  const [trips, spots] = await Promise.all([
    supabase.from('user_trips').select('data'),
    supabase.from('user_spots').select('data'),
  ]);
  if (trips.error) throw new Error(`Couldn't load your trips: ${trips.error.message}`);
  if (spots.error) throw new Error(`Couldn't load your spots: ${spots.error.message}`);
  return {
    trips: (trips.data ?? []).map((r) => r.data as Trip),
    spots: (spots.data ?? []).map((r) => r.data as LifestyleSpot),
  };
}

/** Newest copy wins, item by item. Items only one side has are kept. */
export function mergeById<T extends { id: string; updatedAt?: string }>(local: T[], remote: T[]): T[] {
  const out = new Map(local.map((x) => [x.id, x]));
  for (const r of remote) {
    const l = out.get(r.id);
    if (!l || (r.updatedAt ?? '') > (l.updatedAt ?? '')) out.set(r.id, r);
  }
  // Keep local order first, then anything new from the cloud.
  const seen = new Set<string>();
  return [...local, ...remote].flatMap((x) => (seen.has(x.id) ? [] : (seen.add(x.id), [out.get(x.id)!])));
}

export async function pushTrip(owner: string, trip: Trip): Promise<void> {
  const { error } = await supabase
    .from('user_trips')
    .upsert({ owner, id: trip.id, data: trip, updated_at: trip.updatedAt ?? new Date().toISOString() });
  if (error) throw new Error(`Couldn't save ${trip.title}: ${error.message}`);
}

export async function pushSpot(owner: string, spot: LifestyleSpot): Promise<void> {
  const { error } = await supabase
    .from('user_spots')
    .upsert({ owner, id: spot.id, data: spot, updated_at: spot.updatedAt ?? spot.createdAt });
  if (error) throw new Error(`Couldn't save ${spot.name}: ${error.message}`);
}

/** Uploads a local photo to "<owner>/<random>.<ext>" and returns that path. */
export async function uploadPhoto(owner: string, localUri: string): Promise<string> {
  const res = await fetch(localUri);
  if (!res.ok && res.status !== 0) throw new Error('Photo is no longer on this device');
  const blob = await res.blob();
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${owner}/${Crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTOS).upload(path, await blob.arrayBuffer(), { contentType });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

/**
 * Uploads any photos in the trip that only exist on this device and returns
 * the trip with their storage paths filled in (or the same object if none).
 * A photo that can't be read any more is skipped, not fatal.
 */
export async function uploadTripPhotos(owner: string, trip: Trip): Promise<Trip> {
  let changed = false;
  const stops = await Promise.all(
    trip.stops.map(async (stop) => {
      let next = stop;
      if (stop.sourceImageUri && !stop.sourceImagePath) {
        const path = await uploadPhoto(owner, stop.sourceImageUri).catch(() => undefined);
        if (path) {
          next = { ...next, sourceImagePath: path };
          changed = true;
        }
      }
      if (stop.bookings?.some((b) => b.imageUri && !b.imagePath)) {
        const bookings = await Promise.all(
          stop.bookings.map(async (b) => {
            if (!b.imageUri || b.imagePath) return b;
            const path = await uploadPhoto(owner, b.imageUri).catch(() => undefined);
            if (!path) return b;
            changed = true;
            return { ...b, imagePath: path };
          }),
        );
        next = { ...next, bookings };
      }
      return next;
    }),
  );
  return changed ? { ...trip, stops } : trip;
}

// Signed links last a week and are reused until a day before they expire.
const LINK_SECONDS = 7 * 24 * 3600;
const links = new Map<string, { url: string; expires: number }>();

/** A temporary link to show a private photo. */
export async function photoUrl(path: string): Promise<string | null> {
  const cached = links.get(path);
  if (cached && cached.expires - Date.now() > 24 * 3600 * 1000) return cached.url;
  const { data, error } = await supabase.storage.from(PHOTOS).createSignedUrl(path, LINK_SECONDS);
  if (error || !data) return null;
  links.set(path, { url: data.signedUrl, expires: Date.now() + LINK_SECONDS * 1000 });
  return data.signedUrl;
}
