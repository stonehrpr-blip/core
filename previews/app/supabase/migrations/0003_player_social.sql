-- ════════════════════════════════════════════════════════════════════════════
-- 0003  Player social layer — friend lookup + stat comparison + leaderboard.
--
-- ⚠️  STAGED FOR REVIEW — NOT YET APPLIED.  This intentionally exposes a LIMITED,
--     public-facing slice of each profile (handle + stats + power/rank) so friends
--     can compare. Review the privacy trade-off before running against the live DB.
--
-- profiles.id is the auth user id; existing RLS restricts the base table to its owner.
-- We add the public columns to profiles, then expose ONLY the safe columns through a
-- read-only `player_cards` view. Clients query the VIEW, never the base table, for
-- other players. Email / push tokens / trial_state stay private on `profiles`.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists player_id        text unique,
  add column if not exists core_power       int  not null default 0,
  add column if not exists core_rank        text,
  add column if not exists core_xp          int  not null default 0,
  add column if not exists core_level       int  not null default 1,
  add column if not exists stat_strength    int  not null default 0,
  add column if not exists stat_focus       int  not null default 0,
  add column if not exists stat_wealth      int  not null default 0,
  add column if not exists stat_health      int  not null default 0,
  add column if not exists stat_social      int  not null default 0,
  add column if not exists stat_purpose     int  not null default 0,
  add column if not exists stats_updated_at timestamptz;

create index if not exists profiles_player_id_idx  on public.profiles (player_id);
create index if not exists profiles_core_power_idx on public.profiles (core_power desc);

-- World-readable projection of ONLY the social/comparison columns.
-- security_invoker = false (default for views) means it reads past the base-table RLS,
-- but only the columns selected here are ever visible — by design.
create or replace view public.player_cards as
  select player_id, display_name, core_power, core_rank, core_xp, core_level,
         stat_strength, stat_focus, stat_wealth, stat_health, stat_social, stat_purpose,
         stats_updated_at
  from public.profiles
  where player_id is not null;

-- Any signed-in user can read the cards (friend compare + leaderboard).
-- Swap `authenticated` → `anon` as well if you want fully public, share-link cards.
grant select on public.player_cards to authenticated;

-- NOTE: the client (`_lib/core-social.js`) writes stat_* / core_* via an
-- `update ... where id = auth.uid()`, so the existing owner-only RLS on `profiles`
-- already authorises the write — no new write policy is required.
