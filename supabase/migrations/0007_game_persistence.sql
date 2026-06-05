-- 0007_game_persistence.sql — Lane5 (Supabase persistence)
-- Make slip / quest / chest progress survive an app reinstall.
--
-- LIVE today: slip persistence. game-state logSlip() flows through
-- apps/mobile/stores/slips-sync-store.ts, which write-throughs to
-- public.slip_logs keyed idempotently by client_slip_key so an offline replay,
-- queue flush, or re-sign-in can't double-count a slip.
--
-- SCAFFOLD: quests / chests / inventory. The RN app has no quest or chest model
-- yet — quests exist only as game-state xpLedger 'quest_*' tags, and chests live
-- in previews/28-chest.html (no RN code). The dormant syncQuestComplete() /
-- syncChestOpen() hooks in slips-sync-store.ts already target these tables, so
-- when those features land in RN the persistence layer is ready with no schema
-- change. RLS mirrors the self-only pattern from 0001_initial_schema.sql.

-- slip_logs: idempotency key ------------------------------------------------
-- game-state slips are uniquely identified per user by their ms timestamp +
-- habit (+ magnitude). Encoding that into a client key lets us upsert instead
-- of insert, so the same slip can be pushed any number of times harmlessly.
alter table public.slip_logs
  add column if not exists client_slip_key text;

create unique index if not exists slip_logs_user_client_key_uidx
  on public.slip_logs (user_id, client_slip_key)
  where client_slip_key is not null;

-- user_quests (scaffold) ----------------------------------------------------
create table if not exists public.user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_slug text not null,
  status text not null default 'completed',
  xp_awarded int not null default 0,
  client_quest_key text,                       -- idempotency: unique per user
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists user_quests_user_client_key_uidx
  on public.user_quests (user_id, client_quest_key)
  where client_quest_key is not null;
create index if not exists user_quests_user_completed_idx
  on public.user_quests (user_id, completed_at desc);
alter table public.user_quests enable row level security;
drop policy if exists "self_read_user_quests" on public.user_quests;
create policy "self_read_user_quests" on public.user_quests
  for select using (auth.uid() = user_id);
drop policy if exists "self_write_user_quests" on public.user_quests;
create policy "self_write_user_quests" on public.user_quests
  for all using (auth.uid() = user_id);

-- chest_opens (scaffold) ----------------------------------------------------
-- TRADEOFF (lane5 step 3): rewards are CLIENT-AUTHORED here — the client rolls
-- the chest and logs the result. This is tamperable: a modified client could
-- write any reward. That's acceptable for now because chests aren't real-money
-- and aren't in the RN app yet. When chests ship, prefer a SECURITY DEFINER rpc
-- / edge function that rolls server-side and writes this row, then tighten the
-- write policy to with-check(false) so clients can only read. Until then we log
-- the client result so it can be reconciled later.
create table if not exists public.chest_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chest_tier text not null,
  rewards jsonb not null default '{}'::jsonb,
  client_open_key text,                        -- idempotency: unique per user
  opened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists chest_opens_user_client_key_uidx
  on public.chest_opens (user_id, client_open_key)
  where client_open_key is not null;
create index if not exists chest_opens_user_opened_idx
  on public.chest_opens (user_id, opened_at desc);
alter table public.chest_opens enable row level security;
drop policy if exists "self_read_chest_opens" on public.chest_opens;
create policy "self_read_chest_opens" on public.chest_opens
  for select using (auth.uid() = user_id);
drop policy if exists "self_write_chest_opens" on public.chest_opens;
create policy "self_write_chest_opens" on public.chest_opens
  for all using (auth.uid() = user_id);

-- user_inventory (scaffold) -------------------------------------------------
create table if not exists public.user_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_slug text not null,
  qty int not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_slug)
);
alter table public.user_inventory enable row level security;
drop policy if exists "self_read_user_inventory" on public.user_inventory;
create policy "self_read_user_inventory" on public.user_inventory
  for select using (auth.uid() = user_id);
drop policy if exists "self_write_user_inventory" on public.user_inventory;
create policy "self_write_user_inventory" on public.user_inventory
  for all using (auth.uid() = user_id);
