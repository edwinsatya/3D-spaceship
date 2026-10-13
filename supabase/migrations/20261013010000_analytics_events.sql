-- Anonymous gameplay analytics (no personal data: a random per-tab session id).
-- The game may only INSERT; nothing can be read back through the API.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null check (char_length(session_id) <= 64),
  event text not null check (event in ('game_start', 'tutorial_complete', 'mission_complete', 'session_end')),
  props jsonb not null default '{}'::jsonb,
  constraint analytics_events_props_size check (pg_column_size(props) < 2048)
);

alter table public.analytics_events enable row level security;

create policy "Anyone can send gameplay events"
  on public.analytics_events for insert
  to anon, authenticated
  with check (true);

-- Handy for the dashboard: events per day and type.
create index if not exists analytics_events_created_idx on public.analytics_events (created_at);
