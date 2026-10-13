-- Jelajah Angkasa 3D: players can type their own leaderboard name.
--
-- Without one, the word-list call sign is shown as before. A typed name is
-- checked here as well as in the game (game/systems/leaderboard/nickname.ts;
-- a unit test keeps the rules and word lists in step), so the console can't
-- get around it: 3–16 characters, letters, numbers, spaces and _ . - only,
-- no phone numbers or web addresses, and no rude words in English or
-- Indonesian (look-alike digits and stretched letters included).
-- To hide a name, set leaderboard_profiles.nickname to null in the dashboard.

alter table public.leaderboard_profiles add column if not exists nickname text;

-- Matched inside the name (after look-alike digits and repeated letters are squashed).
create or replace function public.leaderboard_blocked_anywhere()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard',
    'porn', 'penis', 'vagina', 'pussy', 'dildo', 'twat', 'milf', 'horny', 'hitler', 'piss',
    'anjing', 'bangsat', 'bajingan', 'keparat', 'brengsek', 'kontol', 'ngentot', 'entot', 'memek', 'pepek', 'peler',
    'titit', 'jembut', 'pelacur', 'lonte', 'bokep', 'ngewe', 'ngaceng', 'jancok', 'jancuk', 'goblok', 'tolol',
    'kampret', 'bencong', 'tetek',
    'fck', 'fvck', 'phuck', 'kntl', 'ngntd', 'bgst', 'gblk', 'anjg', 'memk'
  ]
$$;

-- Matched as whole words only (they hide inside harmless words: pantai, masuk, cockpit, grape…).
create or replace function public.leaderboard_blocked_words()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'ass', 'dick', 'cock', 'cum', 'tits', 'boob', 'boobs', 'sex', 'sexy', 'rape', 'nazi', 'fag', 'wank', 'prick',
    'nude', 'naked', 'babi', 'asu', 'tai', 'tahi', 'bego', 'monyet', 'perek', 'coli', 'sange', 'cok', 'banci',
    'fuk', 'fack', 'mmk', 'asw', 'njing', 'jnck'
  ]
$$;

-- Null when the name is fine, otherwise why not: length, characters, contact or blocked.
create or replace function public.leaderboard_nickname_problem(p_nickname text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_lower text;
  v_plain text;
  v_word text;
begin
  if p_nickname is null then
    return null;
  end if;
  if char_length(p_nickname) < 3 or char_length(p_nickname) > 16 then
    return 'length';
  end if;
  if p_nickname !~ '^[A-Za-z0-9]([A-Za-z0-9 _.-]*[A-Za-z0-9])?$' or position('  ' in p_nickname) > 0 then
    return 'characters';
  end if;
  v_lower := lower(p_nickname);
  if char_length(regexp_replace(p_nickname, '[^0-9]', '', 'g')) > 4 or v_lower ~ '(www|http)' then
    return 'contact';
  end if;
  -- Look-alike digits read as letters (4nj1ng → anjing).
  v_plain := translate(v_lower, '0134578', 'oieastb');
  if exists (
    select 1 from unnest(public.leaderboard_blocked_anywhere()) as blocked
    where position(
      regexp_replace(blocked, '([a-z])\1+', '\1', 'g')
      in regexp_replace(regexp_replace(v_plain, '[^a-z]', '', 'g'), '([a-z])\1+', '\1', 'g')
    ) > 0
  ) then
    return 'blocked';
  end if;
  for v_word in
    select token from regexp_split_to_table(v_lower, '[^a-z]+') as token
    union
    select token from regexp_split_to_table(v_plain, '[^a-z]+') as token
  loop
    if v_word = any (public.leaderboard_blocked_words())
      or regexp_replace(v_word, '([a-z])\1+', '\1', 'g') = any (public.leaderboard_blocked_words()) then
      return 'blocked';
    end if;
  end loop;
  return null;
end;
$$;

alter table public.leaderboard_profiles drop constraint if exists leaderboard_profiles_nickname_check;
alter table public.leaderboard_profiles
  add constraint leaderboard_profiles_nickname_check check (public.leaderboard_nickname_problem(nickname) is null);

-- Sets (or, with an empty name, clears) the caller's name and returns what was stored.
-- Refusals come back as nickname_length / nickname_characters / nickname_contact / nickname_blocked.
create or replace function public.leaderboard_set_nickname(p_nickname text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := nullif(btrim(regexp_replace(coalesce(p_nickname, ''), '\s+', ' ', 'g')), '');
  v_problem text := public.leaderboard_nickname_problem(v_name);
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if v_problem is not null then
    raise exception 'nickname_%', v_problem using errcode = '22023';
  end if;
  insert into public.leaderboard_profiles (user_id, adjective, noun, tag, nickname)
  values (v_user, floor(random() * 16)::smallint, floor(random() * 16)::smallint, (10 + floor(random() * 90))::smallint, v_name)
  on conflict (user_id) do update set nickname = excluded.nickname, updated_at = now();
  return v_name;
end;
$$;

-- The board now carries the typed name too (null = show the call sign).
drop function if exists public.leaderboard_top(text, integer);
create function public.leaderboard_top(p_mission text, p_limit integer default 10)
returns table (
  rank bigint, adjective smallint, noun smallint, tag smallint, nickname text, time_ms integer, is_me boolean, players bigint
)
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
  select r.rank, p.adjective, p.noun, p.tag, p.nickname, r.time_ms, coalesce(r.user_id = auth.uid(), false), r.players
  from ranked r
  join public.leaderboard_profiles p on p.user_id = r.user_id
  where r.rank <= least(greatest(coalesce(p_limit, 10), 1), 50) or r.user_id = auth.uid()
  order by r.rank;
$$;

revoke all on function public.leaderboard_set_nickname(text) from public, anon;
grant execute on function public.leaderboard_set_nickname(text) to authenticated;
revoke all on function public.leaderboard_top(text, integer) from public;
grant execute on function public.leaderboard_top(text, integer) to anon, authenticated;
