-- 0003_profile_game_card.sql
--
-- Adds the gamified "player card" columns to public.profiles and the friend-code
-- system needed by the mobile profile screen (apps/mobile/app/(tabs)/profile.tsx).
--
-- profiles RLS is self-only (auth.uid() = id), so a user cannot SELECT another
-- user's row directly. Friend discovery + friend-card listing therefore go through
-- SECURITY DEFINER functions that expose ONLY public card columns.
--
-- Every statement is guarded (IF NOT EXISTS / CREATE OR REPLACE) so this migration
-- is a no-op when re-applied and safe against the live DB (project YOUR_PROJECT_REF).
-- Run `supabase db pull` first to confirm none of these columns pre-exist with a
-- different type.

set check_function_bodies = off;

-- 1. Player-card columns -----------------------------------------------------
alter table public.profiles add column if not exists player_id   text;
alter table public.profiles add column if not exists class       text not null default 'warrior';
alter table public.profiles add column if not exists title       text not null default 'First Step';
alter table public.profiles add column if not exists frame       text not null default 'Default';
alter table public.profiles add column if not exists level       int  not null default 1;
alter table public.profiles add column if not exists xp          int  not null default 0;
alter table public.profiles add column if not exists streak_days int  not null default 0;
alter table public.profiles add column if not exists power       int  not null default 0;

-- 2. Friend-code generator ---------------------------------------------------
-- 'CORE-XXXX-XXXX' using a Crockford-style alphabet (no ambiguous 0/O/1/I).
-- Mirrors ensurePlayerId() in previews/23-profile.html. Collision-checked.
create or replace function public.gen_player_id()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := 'CORE-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := candidate || '-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where player_id = candidate);
  end loop;
  return candidate;
end;
$$;

-- 3. Unique index + backfill + default-on-insert trigger ---------------------
update public.profiles set player_id = public.gen_player_id() where player_id is null;

create unique index if not exists profiles_player_id_key
  on public.profiles (player_id) where player_id is not null;

create or replace function public.set_player_id()
returns trigger
language plpgsql
as $$
begin
  if new.player_id is null then
    new.player_id := public.gen_player_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_player_id on public.profiles;
create trigger trg_set_player_id
  before insert on public.profiles
  for each row execute function public.set_player_id();

-- 4. Public lookup by friend code (SECURITY DEFINER) -------------------------
-- Returns ONLY public card fields. Never exposes trial_state, last_seen_at, etc.
create or replace function public.lookup_player_by_code(p_code text)
returns table (
  id uuid, player_id text, display_name text, class text, title text,
  frame text, level int, xp int, streak_days int, power int
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.player_id, p.display_name, p.class, p.title, p.frame,
         p.level, p.xp, p.streak_days, p.power
  from public.profiles p
  where p.player_id = upper(trim(p_code))
  limit 1;
$$;
revoke all on function public.lookup_player_by_code(text) from public;
grant execute on function public.lookup_player_by_code(text) to authenticated;

-- 5. List the caller's friends' public cards (SECURITY DEFINER) --------------
-- Joins friends -> profiles for the caller's rows. Direct cross-user SELECT on
-- profiles is RLS-blocked, so this definer function is the only safe path.
create or replace function public.list_friend_cards()
returns table (
  id uuid, player_id text, display_name text, class text, title text,
  frame text, level int, xp int, streak_days int, power int,
  status text, initiated_by_me boolean
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.player_id, p.display_name, p.class, p.title, p.frame,
         p.level, p.xp, p.streak_days, p.power,
         f.status::text,
         (f.initiated_by = auth.uid()) as initiated_by_me
  from public.friends f
  join public.profiles p
    on p.id = case when f.user_id = auth.uid() then f.friend_id else f.user_id end
  where f.user_id = auth.uid() or f.friend_id = auth.uid();
$$;
revoke all on function public.list_friend_cards() from public;
grant execute on function public.list_friend_cards() to authenticated;
