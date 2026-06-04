-- 0006_friend_card_stats.sql
--
-- Extends the friend-card RPCs (0003) to also return the six Core Stat values,
-- pivoted from public.user_stats, so friend cards can show stats — not just
-- level/xp/streak/power. Display names map to slugs:
--   strength<-body  focus<-brain  wealth<-wallet
--   health<-lungs   social<-social  purpose<-willpower
--
-- Return type changes, so each function is dropped + recreated. Depends on the
-- 'social' slug from 0004/0005. Stats are clamped 0-100 in user_stats; missing
-- rows default to 0.

set check_function_bodies = off;

-- shared pivot: one row of stat columns per profile id ------------------------
-- (inlined as a LATERAL in each function below)

drop function if exists public.lookup_player_by_code(text);
create function public.lookup_player_by_code(p_code text)
returns table (
  id uuid, player_id text, display_name text, class text, title text, frame text,
  level int, xp int, streak_days int, power int,
  strength int, focus int, wealth int, health int, social int, purpose int
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.player_id, p.display_name, p.class, p.title, p.frame,
         p.level, p.xp, p.streak_days, p.power,
         st.body, st.brain, st.wallet, st.lungs, st.social, st.willpower
  from public.profiles p
  left join lateral (
    select
      coalesce(max(value) filter (where stat_slug = 'body'),      0)::int as body,
      coalesce(max(value) filter (where stat_slug = 'brain'),     0)::int as brain,
      coalesce(max(value) filter (where stat_slug = 'wallet'),    0)::int as wallet,
      coalesce(max(value) filter (where stat_slug = 'lungs'),     0)::int as lungs,
      coalesce(max(value) filter (where stat_slug = 'social'),    0)::int as social,
      coalesce(max(value) filter (where stat_slug = 'willpower'), 0)::int as willpower
    from public.user_stats us where us.user_id = p.id
  ) st on true
  where p.player_id = upper(trim(p_code))
  limit 1;
$$;
revoke all on function public.lookup_player_by_code(text) from public;
grant execute on function public.lookup_player_by_code(text) to authenticated;

drop function if exists public.list_friend_cards();
create function public.list_friend_cards()
returns table (
  id uuid, player_id text, display_name text, class text, title text, frame text,
  level int, xp int, streak_days int, power int,
  strength int, focus int, wealth int, health int, social int, purpose int,
  status text, initiated_by_me boolean
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.player_id, p.display_name, p.class, p.title, p.frame,
         p.level, p.xp, p.streak_days, p.power,
         st.body, st.brain, st.wallet, st.lungs, st.social, st.willpower,
         f.status::text,
         (f.initiated_by = auth.uid()) as initiated_by_me
  from public.friends f
  join public.profiles p
    on p.id = case when f.user_id = auth.uid() then f.friend_id else f.user_id end
  left join lateral (
    select
      coalesce(max(value) filter (where stat_slug = 'body'),      0)::int as body,
      coalesce(max(value) filter (where stat_slug = 'brain'),     0)::int as brain,
      coalesce(max(value) filter (where stat_slug = 'wallet'),    0)::int as wallet,
      coalesce(max(value) filter (where stat_slug = 'lungs'),     0)::int as lungs,
      coalesce(max(value) filter (where stat_slug = 'social'),    0)::int as social,
      coalesce(max(value) filter (where stat_slug = 'willpower'), 0)::int as willpower
    from public.user_stats us where us.user_id = p.id
  ) st on true
  where f.user_id = auth.uid() or f.friend_id = auth.uid();
$$;
revoke all on function public.list_friend_cards() from public;
grant execute on function public.list_friend_cards() to authenticated;
