-- Schedule the push Edge Functions via pg_cron + pg_net.
-- Enable both extensions first (Dashboard → Database → Extensions, or below).
-- Replace <PROJECT_REF> and <CRON_SECRET> (store the secret in Vault for prod).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reminders: every 15 min on the quarter-hour (matches TICK_MIN in send-reminders).
select cron.schedule(
  'send-reminders',
  '0,15,30,45 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
  $$
);

-- Offers / win-back: once daily at 17:07 UTC (deliberately off the :00 mark).
select cron.schedule(
  'send-offers',
  '7 17 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-offers',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
  $$
);

-- Undo:  select cron.unschedule('send-reminders');  select cron.unschedule('send-offers');
