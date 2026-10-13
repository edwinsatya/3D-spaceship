-- Jelajah Angkasa 3D: best-time leaderboards for the timed missions.
--
-- Players never write scores directly. A run asks the server for a ticket
-- when it starts (leaderboard_start_run) and hands it back with its time when
-- it finishes (leaderboard_submit_run). The server checks the time against
-- its own clock and a plausible minimum per mission, so a time typed into the
-- console is refused. Names on the board are call signs built from word lists
-- (indices only, rendered by the game in the player's language): no free text,
-- no emails, nothing to moderate.
--
-- Keep the numbers below in step with game/config/leaderboard.ts (a unit test
-- compares them).

-- One call sign per player: <adjective> <noun> <tag>, e.g. "Swift Comet 42".
create table if not exists public.leaderboard_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  adjective smallint not null check (adjective between 0 and 15),
  noun smallint not null check (noun between 0 and 15),
  tag smallint not null check (tag between 10 and 99),
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_profiles enable row level security;

create policy "Players read their own call sign"
  on public.leaderboard_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players create their own call sign"
  on public.leaderboard_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players change their own call sign"
  on public.leaderboard_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Run tickets. No policies: only the functions below touch this table.
create table if not exists public.leaderboard_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  time_ms integer
);

alter table public.leaderboard_runs enable row level security;

create index if not exists leaderboard_runs_user_started_idx on public.leaderboard_runs (user_id, started_at desc);

-- Each player's best time per mission. No policies: read through leaderboard_top.
create table if not exists public.leaderboard_scores (
  mission text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  time_ms integer not null check (time_ms > 0),
  achieved_at timestamptz not null default now(),
  primary key (mission, user_id)
);

alter table public.leaderboard_scores enable row level security;

create index if not exists leaderboard_scores_rank_idx on public.leaderboard_scores (mission, time_ms, achieved_at);

-- Fastest believable time per mission (ms); null = no leaderboard.
-- About 55% of the best autopilot time with full boost on the fastest ship.
create or replace function public.leaderboard_min_ms(p_mission text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_mission
    when 'orbit-rings' then 12000
    when 'station-delivery' then 30000
    when 'belt-slalom' then 17000
    when 'crystal-hunt' then 25000
    when 'saturn-ring-run' then 16000
  end
$$;

-- Called when a run starts (before the countdown). Returns the run's ticket.
create or replace function public.leaderboard_start_run(p_mission text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_run uuid;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if public.leaderboard_min_ms(p_mission) is null then
    raise exception 'unknown_mission' using errcode = '22023';
  end if;
  -- Restarting is normal; hundreds of tickets a minute is not.
  if (
    select count(*) from public.leaderboard_runs
    where user_id = v_user and started_at > now() - interval '5 minutes'
  ) >= 40 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  -- Old tickets can't be used any more; keep the table small.
  delete from public.leaderboard_runs where user_id = v_user and started_at < now() - interval '1 day';
  -- Everyone on the board has a call sign; start with a random one.
  insert into public.leaderboard_profiles (user_id, adjective, noun, tag)
  values (v_user, floor(random() * 16)::smallint, floor(random() * 16)::smallint, (10 + floor(random() * 90))::smallint)
  on conflict (user_id) do nothing;
  insert into public.leaderboard_runs (user_id, mission) values (v_user, p_mission) returning id into v_run;
  return v_run;
end;
$$;

-- Called when a run finishes. Validates the time, keeps the player's best and
-- returns it with its rank (1 = fastest) and the number of players.
create or replace function public.leaderboard_submit_run(p_run uuid, p_time_ms integer)
returns table (best_ms integer, rank bigint, players bigint, improved boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_ticket public.leaderboard_runs%rowtype;
  v_elapsed_ms double precision;
  v_previous integer;
  v_improved boolean;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  select * into v_ticket from public.leaderboard_runs where id = p_run and user_id = v_user for update;
  if not found then
    raise exception 'unknown_run' using errcode = '22023';
  end if;
  if v_ticket.submitted_at is not null then
    raise exception 'already_submitted' using errcode = '22023';
  end if;
  v_elapsed_ms := extract(epoch from (now() - v_ticket.started_at)) * 1000;
  if v_elapsed_ms > 3600000 then
    raise exception 'run_expired' using errcode = '22023';
  end if;
  -- Faster than the course allows, or longer than the server has been waiting
  -- (1.5 s of slack for a slow connection when the ticket was requested).
  if p_time_ms is null
    or p_time_ms < public.leaderboard_min_ms(v_ticket.mission)
    or p_time_ms > v_elapsed_ms + 1500 then
    raise exception 'implausible_time' using errcode = '22023';
  end if;

  update public.leaderboard_runs set submitted_at = now(), time_ms = p_time_ms where id = p_run;

  select s.time_ms into v_previous
  from public.leaderboard_scores s
  where s.mission = v_ticket.mission and s.user_id = v_user;
  v_improved := v_previous is null or p_time_ms < v_previous;
  if v_improved then
    insert into public.leaderboard_scores (mission, user_id, time_ms, achieved_at)
    values (v_ticket.mission, v_user, p_time_ms, now())
    on conflict (mission, user_id) do update set time_ms = excluded.time_ms, achieved_at = excluded.achieved_at;
  end if;

  return query
  select
    s.time_ms,
    (
      select count(*) + 1 from public.leaderboard_scores o
      where o.mission = s.mission
        and (o.time_ms < s.time_ms or (o.time_ms = s.time_ms and o.achieved_at < s.achieved_at))
    ),
    (select count(*) from public.leaderboard_scores o where o.mission = s.mission),
    v_improved
  from public.leaderboard_scores s
  where s.mission = v_ticket.mission and s.user_id = v_user;
end;
$$;

-- The fastest players of a mission (and the caller's own row when signed in),
-- without user ids. Ties go to whoever set the time first.
create or replace function public.leaderboard_top(p_mission text, p_limit integer default 10)
returns table (rank bigint, adjective smallint, noun smallint, tag smallint, time_ms integer, is_me boolean, players bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      s.user_id,
      s.time_ms,
      row_number() over (order by s.time_ms, s.achieved_at) as rank,
      count(*) over () as players
    from public.leaderboard_scores s
    where s.mission = p_mission
  )
  select r.rank, p.adjective, p.noun, p.tag, r.time_ms, coalesce(r.user_id = auth.uid(), false), r.players
  from ranked r
  join public.leaderboard_profiles p on p.user_id = r.user_id
  where r.rank <= least(greatest(coalesce(p_limit, 10), 1), 50) or r.user_id = auth.uid()
  order by r.rank;
$$;

revoke all on function public.leaderboard_start_run(text) from public, anon;
revoke all on function public.leaderboard_submit_run(uuid, integer) from public, anon;
revoke all on function public.leaderboard_top(text, integer) from public;
grant execute on function public.leaderboard_start_run(text) to authenticated;
grant execute on function public.leaderboard_submit_run(uuid, integer) to authenticated;
-- Guests can look at the boards too.
grant execute on function public.leaderboard_top(text, integer) to anon, authenticated;
