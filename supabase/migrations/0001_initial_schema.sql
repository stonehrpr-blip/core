-- Life-OS initial schema
-- All user-owned tables have RLS enabled.
-- All FKs use cascade or restrict as appropriate to keep data sane on delete.

set check_function_bodies = off;

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Enums ---------------------------------------------------------------------
create type habit_metaphor as enum (
  'smoke', 'melt', 'darken', 'drain', 'glitch', 'bloat', 'haze', 'hum'
);

create type stat_slug as enum (
  'lungs', 'brain', 'wallet', 'willpower', 'body'
);

create type scan_type as enum ('food', 'body', 'outfit');

create type friend_status as enum ('pending', 'accepted', 'blocked');

create type subscription_status as enum (
  'trialing', 'active', 'paused', 'canceled', 'expired'
);

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  sex_at_birth text check (sex_at_birth in ('female', 'male', 'other', 'unspecified')),
  birth_year int check (birth_year between 1900 and 2030),
  height_cm int check (height_cm between 50 and 250),
  weight_kg numeric(5,2) check (weight_kg between 20 and 300),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "self_read_profile" on public.profiles for select using (auth.uid() = id);
create policy "self_write_profile" on public.profiles for update using (auth.uid() = id);
create policy "self_insert_profile" on public.profiles for insert with check (auth.uid() = id);

-- habits (preset catalog) ---------------------------------------------------
create table public.habits (
  slug text primary key,
  label text not null,
  short_label text not null,
  metaphor habit_metaphor not null,
  primary_stat_impact stat_slug not null,
  secondary_stat_impacts stat_slug[] not null default '{}',
  xp_loss_per_slip int not null default 20,
  sound_key text not null,
  description text not null,
  is_active boolean not null default true
);

-- stats (preset catalog) ----------------------------------------------------
create table public.stats (
  slug stat_slug primary key,
  label text not null,
  icon text not null,
  color_hex text not null,
  description text not null,
  decay_per_day_without_slip numeric(5,2) not null default 0,
  recovery_per_clean_day numeric(5,2) not null default 1
);

-- user_habits ---------------------------------------------------------------
create table public.user_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_slug text not null references public.habits(slug) on delete restrict,
  daily_target int not null default 0,
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  quit_intent text,
  created_at timestamptz not null default now(),
  unique (user_id, habit_slug)
);
alter table public.user_habits enable row level security;
create policy "self_read_user_habits" on public.user_habits for select using (auth.uid() = user_id);
create policy "self_write_user_habits" on public.user_habits for all using (auth.uid() = user_id);

-- slip_logs -----------------------------------------------------------------
create table public.slip_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_habit_id uuid not null references public.user_habits(id) on delete cascade,
  logged_at timestamptz not null default now(),
  xp_lost int not null,
  recovery_completed boolean not null default false,
  xp_recovered int not null default 0,
  trigger_note text,
  device_local_time text,
  created_at timestamptz not null default now()
);
create index slip_logs_user_logged_at_idx on public.slip_logs (user_id, logged_at desc);
alter table public.slip_logs enable row level security;
create policy "self_read_slip_logs" on public.slip_logs for select using (auth.uid() = user_id);
create policy "self_write_slip_logs" on public.slip_logs for all using (auth.uid() = user_id);

-- user_stats ----------------------------------------------------------------
create table public.user_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  stat_slug stat_slug not null references public.stats(slug) on delete restrict,
  value numeric(5,2) not null default 60 check (value between 0 and 100),
  level int not null default 1,
  total_xp_gained int not null default 0,
  total_xp_lost int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, stat_slug)
);
alter table public.user_stats enable row level security;
create policy "self_read_user_stats" on public.user_stats for select using (auth.uid() = user_id);
create policy "self_write_user_stats" on public.user_stats for all using (auth.uid() = user_id);

-- streaks -------------------------------------------------------------------
create table public.streaks (
  user_habit_id uuid primary key references public.user_habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clean_current int not null default 0,
  clean_longest int not null default 0,
  honesty_current int not null default 0,
  honesty_longest int not null default 0,
  last_logged_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.streaks enable row level security;
create policy "self_read_streaks" on public.streaks for select using (auth.uid() = user_id);
create policy "self_write_streaks" on public.streaks for all using (auth.uid() = user_id);

-- scans (S2+) ---------------------------------------------------------------
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_type scan_type not null,
  image_path text not null,
  ai_result jsonb not null,
  confidence numeric(3,2),
  created_at timestamptz not null default now()
);
create index scans_user_type_idx on public.scans (user_id, scan_type, created_at desc);
alter table public.scans enable row level security;
create policy "self_read_scans" on public.scans for select using (auth.uid() = user_id);
create policy "self_write_scans" on public.scans for all using (auth.uid() = user_id);

-- coach_conversations -------------------------------------------------------
create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary text,
  message_count int not null default 0,
  mood text
);
alter table public.coach_conversations enable row level security;
create policy "self_read_coach_conv" on public.coach_conversations for select using (auth.uid() = user_id);
create policy "self_write_coach_conv" on public.coach_conversations for all using (auth.uid() = user_id);

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_in int,
  tokens_out int,
  model text,
  created_at timestamptz not null default now()
);
create index coach_messages_conv_idx on public.coach_messages (conversation_id, created_at);
alter table public.coach_messages enable row level security;
create policy "self_read_coach_msg" on public.coach_messages for select using (auth.uid() = user_id);
create policy "self_write_coach_msg" on public.coach_messages for all using (auth.uid() = user_id);

-- friends -------------------------------------------------------------------
create table public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status friend_status not null default 'pending',
  initiated_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friends enable row level security;
create policy "self_read_friends" on public.friends for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "self_write_friends" on public.friends for all using (auth.uid() = user_id or auth.uid() = friend_id);

-- subscriptions -------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null,
  status subscription_status not null,
  revenuecat_user_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "self_read_subscriptions" on public.subscriptions for select using (auth.uid() = user_id);

-- seed catalog data ---------------------------------------------------------
insert into public.stats (slug, label, icon, color_hex, description, recovery_per_clean_day) values
  ('lungs', 'Lungs', 'lung', '#FF6BAA', 'Capacity, recovery, and clarity of breath.', 1.2),
  ('brain', 'Brain', 'brain', '#B388FF', 'Focus, presence, dopamine regulation.', 1.5),
  ('wallet', 'Wallet', 'wallet', '#FFD05C', 'Financial restraint and intention.', 1.0),
  ('willpower', 'Willpower', 'flame', '#FF7A45', 'The flame. Burned by slips, fed by honest logs.', 1.0),
  ('body', 'Body', 'person', '#5CE1E6', 'Composition, vitality, movement.', 0.8);

insert into public.habits (slug, label, short_label, metaphor, primary_stat_impact, secondary_stat_impacts, xp_loss_per_slip, sound_key, description) values
  ('vape', 'Vaping', 'Vape', 'smoke', 'lungs', array['willpower']::stat_slug[], 25, 'exhale', 'Each puff darkens your lungs and chips at your willpower.'),
  ('doomscroll', 'Doom-scrolling', 'Scroll', 'melt', 'brain', array['willpower']::stat_slug[], 15, 'static', 'Mindless scrolling melts your focus.'),
  ('drink', 'Drinking', 'Drink', 'darken', 'body', array['willpower']::stat_slug[], 30, 'pour', 'Each drink tints your body stat.'),
  ('spend', 'Impulse spending', 'Spend', 'drain', 'wallet', array['willpower']::stat_slug[], 20, 'coin', 'Coins fly out of your wallet.'),
  ('porn', 'Porn', 'Porn', 'glitch', 'willpower', array['brain']::stat_slug[], 25, 'buzz', 'Glitches willpower and dulls dopamine.'),
  ('junk_food', 'Junk food', 'Junk', 'bloat', 'body', array['willpower']::stat_slug[], 15, 'crunch', 'Bloats your body avatar.'),
  ('weed', 'Weed', 'Weed', 'haze', 'lungs', array['brain','willpower']::stat_slug[], 25, 'exhale', 'Smoke and haze layer across lungs and brain.'),
  ('nicotine_pouch', 'Nicotine pouch', 'Pouch', 'hum', 'willpower', array['lungs']::stat_slug[], 15, 'hum', 'Quiet hum of dependency.');
