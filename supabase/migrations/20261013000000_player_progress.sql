-- Jelajah Angkasa 3D: one progress document per player (guest progress is
-- merged into it on first sign-in). Row Level Security keeps every row
-- readable and writable by its owner only.

create table if not exists public.player_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- The game's ProgressData (missions, discoveries, badges, ship loadout…).
  data jsonb not null,
  -- PROGRESS_VERSION of the game that wrote it (older saves are migrated client-side).
  version integer not null check (version > 0),
  updated_at timestamptz not null default now(),
  -- A save is a few KB; refuse anything absurd.
  constraint player_progress_size check (pg_column_size(data) < 262144)
);

alter table public.player_progress enable row level security;

create policy "Players read their own progress"
  on public.player_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players create their own progress"
  on public.player_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players update their own progress"
  on public.player_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
