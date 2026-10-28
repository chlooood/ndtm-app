-- The sharer's imprint pattern travels with a shared trip, so friends see
-- the trip drawn the sharer's way. One of: silk, rings, cells, canopy.
alter table public.trips add column imprint_pattern text
  check (imprint_pattern in ('silk', 'rings', 'cells', 'canopy'));
