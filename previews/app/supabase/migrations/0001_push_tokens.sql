-- Push notification tokens on the live profiles table.
-- profiles.id is the auth user id; existing RLS already restricts rows to the owner,
-- so these columns are protected by the same policy.

alter table public.profiles
  add column if not exists push_token_ios     text,
  add column if not exists push_token_android text,
  add column if not exists push_token_web     text,
  add column if not exists push_opted_in      boolean not null default false,
  add column if not exists timezone           text;

-- Optional: index for the reminder/offer sender to find opted-in users fast.
create index if not exists profiles_push_opted_in_idx
  on public.profiles (push_opted_in)
  where push_opted_in = true;
