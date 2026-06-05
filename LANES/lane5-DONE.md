# Lane5 — Supabase Persistence — DONE

**Goal:** make local progress survive an app reinstall by syncing to Supabase
(project `tqjpgknkbfaayrjuwoet`).

## Audit finding (premise correction)
lane5 assumed `quests` / `chests` / `inventory` tables + RN models existed. They
didn't:
- Only `slip_logs` was wireable end-to-end. Core xp/streak/stats **already** sync
  via `profile-sync-store` (→ `profiles` + `user_stats`).
- The RN app has **no quest or chest model** — quests are only `xpLedger`
  `quest_*` tags; chests live in `previews/28-chest.html` (no RN code).

Decision (Stone): **"Slips now, scaffold the rest."**

## What shipped

### Live — slip persistence
- `supabase/migrations/0007_game_persistence.sql`
  - `slip_logs` += `client_slip_key` + partial unique `(user_id, client_slip_key)`
    → idempotent slip upserts.
- `apps/mobile/stores/slips-sync-store.ts` (new) — hydrate-on-sign-in +
  write-through-on-mutation, mirroring `profile-sync` / `friends`. Failed pushes
  queue in `pendingKeys` and replay on next hydrate.
- `apps/mobile/lib/slip-sync.ts` (new) — pure key/diff/queue helpers
  (`slipKey`, `parseSlipKey`, `selectUnsynced`, `applyPushResult`).
- `game-state-store.ts` += `mergeRemoteSlips()` — restores the slip ledger on
  sign-in WITHOUT re-applying stat/xp damage.
- `lib/auth-session.ts` — hydrate on sign-in, reset on sign-out (no screens
  touched).

### Scaffold — quests / chests / inventory
- `0007` creates `user_quests`, `chest_opens`, `user_inventory` (self-only RLS,
  idempotency keys). `chest_opens` documents the client-rolled-reward TRADEOFF
  and the server-authoritative migration path.
- `slips-sync-store` exposes dormant `syncQuestComplete()` / `syncChestOpen()`
  hooks targeting those tables — ready to call when the RN flows land. Nothing
  invokes them yet.

### Bonus — pre-existing clobber fix
`profile-sync-store` previously pushed local xp/streak UP without pulling first,
so a reinstall could overwrite real server progress with DEFAULTS.
- `game-state-store.ts` += `restoreFromServer()`.
- `lib/progress-sync.ts` (new) — `shouldAdoptServerProgress()` (adopt server only
  when it's ahead AND the local xp-ledger is empty → a clean reinstall; the
  ledger guard prevents undoing a just-logged slip) + `buildRestoreStats()`.
- hydrate now pulls `xp / streak_days` (+ `user_stats`) and restores when the gate
  passes, before pushing.

## Verified
- `npm test` (apps/mobile) → **all suites pass** (`slip-sync`, `progress-sync`,
  `compliance`).
- `tsc --noEmit` → all touched files clean. (Pre-existing
  `noUncheckedIndexedAccess` / `app.config.ts` errors are unrelated.)

## NOT verified here — manual steps required
No `supabase` CLI / `psql` in the build env, so the migration apply + device test
are yours to run. (Bundling itself now works — see the mobile-bundler note.)

> **Dependency:** the clobber-fix path reads `profiles.xp` / `profiles.streak_days`,
> which are added by **`0003_profile_game_card.sql`**. Apply 0003 first if it
> isn't live yet (see `supabase/APPLY-MIGRATIONS.md`). 0007's slip persistence +
> scaffold tables do NOT need 0003 (`slip_logs`/`user_stats` shipped in 0001).

### 1. Apply migration 0007 (Stone runs — mutates prod)
```bash
cd ~/Desktop/lifeos
supabase link --project-ref tqjpgknkbfaayrjuwoet   # one-time
supabase db push --dry-run                          # preview 0007 (+ any pending)
supabase db push                                    # apply
```
0007 is **re-runnable**: tables use `create table if not exists` and the policies
are now guarded with `drop policy if exists`.

Sanity-check after applying:
```sql
select column_name from information_schema.columns
  where table_name = 'slip_logs' and column_name = 'client_slip_key';   -- 1 row
select table_name from information_schema.tables
  where table_name in ('user_quests','chest_opens','user_inventory');   -- 3 rows
```

### 2. Device test (lane5 VERIFY)
Log a slip → reinstall → re-sign-in → confirm the ledger restores and `slip_logs`
has the row (with `client_slip_key`). Also confirm core xp/streak restores
(clobber fix). Check rows in project `tqjpgknkbfaayrjuwoet`:
```sql
select logged_at, xp_lost, client_slip_key from public.slip_logs
  where user_id = auth.uid() order by logged_at desc limit 10;
```

## Future
- When chests ship in RN: move the reward roll to a SECURITY DEFINER rpc / edge
  function and tighten `chest_opens` write policy to `with check (false)`.
- Build the RN quest model so `syncQuestComplete()` stops being dormant.
