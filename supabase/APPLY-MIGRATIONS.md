# Applying migrations to the live CORE database

Live project ref: **`YOUR_PROJECT_REF`** (config.toml local alias is `core`).

These steps are **for Stone to run** — they mutate production. Claude does not run them.

## Pending migrations (in order)

| File | What it does | Depends on |
|------|--------------|------------|
| `0003_profile_game_card.sql` | Adds player-card columns to `profiles` (`player_id`, `class`, `title`, `frame`, `level`, `xp`, `streak_days`, `power`) + friend-code RPCs (`gen_player_id`, `lookup_player_by_code`, `list_friend_cards`). **Unblocks card-field + friends sync.** | — |
| `0004_stat_slug_social.sql` | Adds `'social'` to the `stat_slug` enum (its own txn). | — |
| `0005_social_stat_catalog.sql` | Seeds the `Social` row in `public.stats`. | 0004 committed |

`user_stats` itself already shipped in **0001 (applied)** — the 5-stat sync works today; 0004/0005 only add the 6th (`social`).

## Steps

```bash
cd ~/Desktop/lifeos

# 1. Link the CLI to the live project (one-time; will prompt for the DB password)
supabase link --project-ref YOUR_PROJECT_REF

# 2. SAFETY — pull live schema and confirm none of the new columns/types pre-exist
#    with a different shape. Review the diff before continuing.
supabase db pull
git diff supabase/migrations            # inspect what pull added, if anything

# 3. Preview exactly what will run against prod
supabase db push --dry-run

# 4. Apply (runs 0003 → 0004 → 0005 in order)
supabase db push
```

## Verify after applying

```sql
-- card columns present
select column_name from information_schema.columns
where table_name = 'profiles'
  and column_name in ('player_id','class','title','frame','level','xp','streak_days','power');

-- social slug present
select unnest(enum_range(null::stat_slug));            -- should include 'social'
select slug from public.stats where slug = 'social';   -- one row

-- RPCs callable (run as an authenticated user)
select * from public.lookup_player_by_code('CORE-XXXX-XXXX');
select * from public.list_friend_cards();
```

## Rollback notes
- `0003` columns: `alter table public.profiles drop column ...` (safe — additive).
- `0004`: **enum values cannot be removed** in Postgres. Adding `'social'` is effectively permanent. This is the one irreversible step — make sure the name is final before applying.
- `0005`: `delete from public.stats where slug = 'social';` (only if no `user_stats` reference it yet).
