-- 0002_reconcile_profiles_to_live.sql
--
-- Reconciles public.profiles with the schema the app (previews/_lib/core-accounts.js)
-- actually reads and writes, which had drifted from 0001_initial_schema.sql.
--
-- Verified 2026-06-01 against the live project (tqjpgknkbfaayrjuwoet) by probing
-- which columns exist via the REST API. The LIVE table already matches the app;
-- 0001 did NOT (it declared onboarded_at / avatar_url / timezone / body-metric
-- columns the app never uses, and lacked onboarded / trial_state / signed_in_* ).
--
-- Every statement is guarded so this migration is:
--   * a NO-OP against the live DB (columns already present, extras already absent)
--   * a REPAIR for any fresh DB built from 0001 (db reset on a new project)
--
-- Column TYPES below are inferred from app usage (see core-accounts.js):
--   onboarded         -> boolean        (code: !!profile.onboarded)
--   trial_state       -> jsonb          (code stores the trialState object)
--   completed_trial_at-> timestamptz    (code: Date.parse(...))
--   signed_in_with    -> text
--   signed_in_at      -> timestamptz
--   last_seen_at      -> timestamptz
-- If `supabase db pull` later reveals different live types, prefer the pulled types.

set check_function_bodies = off;

-- Columns the app uses -------------------------------------------------------
alter table public.profiles add column if not exists onboarded          boolean     not null default false;
alter table public.profiles add column if not exists trial_state        jsonb;
alter table public.profiles add column if not exists completed_trial_at timestamptz;
alter table public.profiles add column if not exists signed_in_with     text;
alter table public.profiles add column if not exists signed_in_at       timestamptz;
alter table public.profiles add column if not exists last_seen_at       timestamptz not null default now();

-- Columns from 0001 the app never references (drop only if a fresh DB created them;
-- no-ops against live, which never had them). Kept conservative: drop the clearly
-- unused ones, leave nothing that could hold real data on live (live lacks these).
alter table public.profiles drop column if exists onboarded_at;
alter table public.profiles drop column if exists avatar_url;
alter table public.profiles drop column if exists timezone;
alter table public.profiles drop column if exists sex_at_birth;
alter table public.profiles drop column if exists birth_year;
alter table public.profiles drop column if exists height_cm;
alter table public.profiles drop column if exists weight_kg;

-- RLS correctness: the UPDATE policy in 0001 has a USING clause but no WITH CHECK,
-- so a row's new state isn't validated against the owner. Re-create it with both.
drop policy if exists "self_write_profile" on public.profiles;
create policy "self_write_profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
