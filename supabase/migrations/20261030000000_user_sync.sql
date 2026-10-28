-- Per-user sync: your trips, spots and photos follow you across devices.
-- Every row and file belongs to one signed-in user, and row-level security
-- lets only that user read or change it. Shared trip snapshots stay in
-- public.trips, which is separate.

create table public.user_trips (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);

create table public.user_spots (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);

alter table public.user_trips enable row level security;
alter table public.user_spots enable row level security;

create policy "owner reads trips" on public.user_trips for select to authenticated using (owner = auth.uid());
create policy "owner adds trips" on public.user_trips for insert to authenticated with check (owner = auth.uid());
create policy "owner edits trips" on public.user_trips for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "owner deletes trips" on public.user_trips for delete to authenticated using (owner = auth.uid());

create policy "owner reads spots" on public.user_spots for select to authenticated using (owner = auth.uid());
create policy "owner adds spots" on public.user_spots for insert to authenticated with check (owner = auth.uid());
create policy "owner edits spots" on public.user_spots for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "owner deletes spots" on public.user_spots for delete to authenticated using (owner = auth.uid());

-- Photos: booking pictures and scanned screenshots, private to their owner.
-- Files live under "<user id>/…", and every policy checks that first folder.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "owner reads photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner uploads photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner deletes photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
