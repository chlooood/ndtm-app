-- Screenshots uploaded by the scanner. Private: only the edge function
-- (service role) reads them back.
insert into storage.buckets (id, name, public)
values ('scans', 'scans', false)
on conflict (id) do nothing;

create policy "anyone can upload scans"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'scans');

-- Shared itineraries, stored as immutable snapshots: sharing again publishes
-- a new row. A trip's id is its share secret: anyone holding the
-- ndtm://trip/<id> link can load it, but trips cannot be listed.
-- TODO: add Supabase Auth and owner-scoped policies before a public launch.
create table public.trips (
  id uuid primary key,
  title text not null,
  stops jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create policy "anyone can publish trips"
  on public.trips for insert
  to anon, authenticated
  with check (true);

-- Reads go through this function so a client must already know the id.
create function public.get_shared_trip(trip_id uuid)
returns setof public.trips
language sql
security definer
set search_path = public
stable
as $$
  select * from public.trips where id = trip_id;
$$;

grant execute on function public.get_shared_trip(uuid) to anon, authenticated;
