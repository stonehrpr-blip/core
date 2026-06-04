-- 0005_social_stat_catalog.sql
--
-- Seeds the Social entry in the public.stats catalog so user_stats rows with
-- stat_slug = 'social' satisfy their FK. Depends on 0004 having committed the
-- new enum value (separate migration = separate transaction).
--
-- Social is NOT habit-driven (no slip lowers it); it grows via friends + social
-- quests, so decay stays 0. Colour matches the previews' Social stat (#B388FF).
-- Idempotent via ON CONFLICT.

insert into public.stats (slug, label, icon, color_hex, description, decay_per_day_without_slip, recovery_per_clean_day)
values ('social', 'Social', 'people', '#B388FF', 'Connection, relationships and community.', 0, 1.0)
on conflict (slug) do nothing;
