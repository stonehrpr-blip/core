-- 0004_stat_slug_social.sql
--
-- Adds 'social' to the stat_slug enum so the 6th Core Stat (Social) — already
-- present in the previews (previews/23-profile.html) — can persist to user_stats.
--
-- MUST be its own migration: Postgres forbids USING a newly-added enum value in
-- the same transaction that adds it. The catalog row + backfill therefore live in
-- 0005_social_stat_catalog.sql, which runs as a separate transaction.
--
-- Idempotent: `if not exists` makes re-application a no-op.

alter type public.stat_slug add value if not exists 'social';
