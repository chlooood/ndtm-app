import { assertSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Trip, TripStop } from '@/lib/trips/types';

type TripRow = { id: string; title: string; stops: TripStop[]; created_at: string };

/** Publishes an immutable snapshot of the trip so its share link can load it. */
export async function publishTrip(trip: Trip): Promise<void> {
  assertSupabaseConfigured();
  const row: TripRow = { id: trip.id, title: trip.title, stops: trip.stops, created_at: trip.createdAt };
  const { error } = await supabase.from('trips').insert(row);
  // 23505 = unique violation: this snapshot is already published.
  if (error && error.code !== '23505') throw new Error(`Could not publish trip: ${error.message}`);
}

/** Loads a trip a friend shared. Returns null when the id is unknown. */
export async function fetchSharedTrip(id: string): Promise<Trip | null> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc('get_shared_trip', { trip_id: id });
  if (error) throw new Error(`Could not load trip: ${error.message}`);
  const row = (data as TripRow[] | null)?.[0];
  return row ? { id: row.id, title: row.title, stops: row.stops, createdAt: row.created_at } : null;
}
