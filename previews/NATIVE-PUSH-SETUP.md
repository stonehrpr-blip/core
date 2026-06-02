# CORE — Native Push Notifications setup (Capacitor + APNs/FCM)

This is the runbook to turn on real notifications (reminders + offers) for CORE.

## What's already built
- **Client capture** — `_lib/core-push.js` requests permission, registers with the OS, captures the device token, and saves it to Supabase `profiles`. Wired into `15-permissions.html` ("Turn on" on the Notifications card).
- **Token storage** — `coreAccounts.savePushToken()` in `_lib/core-accounts.js` writes `push_token_ios / push_token_android / push_token_web` + `push_opted_in` + `timezone` to `profiles`. SQL in `supabase/migrations/0001_push_tokens.sql`.
- **Backend sender** — `backend/lib/notifications/` already implements APNs (`apns.ts`), FCM (`fcm.ts`), web-push, a timezone-aware scheduler (`scheduler.ts`, `scheduleAtLocalTime`), the `Notification` table, `ReminderTemplate` campaigns, and cron routes (`/api/cron/push` every minute, `/api/cron/daily`). It just needs keys + a deploy.
- **Capacitor shell** — `capacitor.config.json` + `package.json` (appId `com.harperlinks.core`, matches `APNS_TOPIC`).

## What YOU still have to do
These need a Mac with Xcode, an Apple Developer account, a Firebase project, and real keys — they can't be done in a headless CLI, so they're listed as steps.

### 1. Supabase — add the columns
Run `supabase/migrations/0001_push_tokens.sql` against project `tqjpgknkbfaayrjuwoet` (SQL editor or `supabase db push`).

### 2. Capacitor — create the native shells
```bash
cd previews
npm install
npx cap init CORE com.harperlinks.core   # config already present; confirms it
npm run ios:add        # adds + syncs the iOS project
npm run android:add    # adds + syncs the Android project
```
> `webDir` is `.` so it copies the whole previews folder. For a clean build, point `webDir` at an exported/minified copy that excludes `backend/`.

### 3. iOS — APNs
1. Xcode → target → Signing & Capabilities → **+ Push Notifications**.
2. Apple Developer → Keys → **+ APNs Auth Key (.p8)**. Save the file, note **Key ID** + **Team ID**.
3. Fill backend env: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_TOPIC=com.harperlinks.core`, `APNS_HOST` (`api.sandbox.push.apple.com` dev / `api.push.apple.com` prod), and the `.p8` path.

### 4. Android — FCM
1. Firebase console → add Android app `com.harperlinks.core` → download **google-services.json** into `android/app/`.
2. Project settings → Service accounts → **Generate private key** → save JSON, set `FCM_SERVICE_ACCOUNT_JSON_PATH`.

### 5. Token capture (already wired)
On the permissions screen, "Turn on" calls `corePush.enable()` → permission prompt → `register()` → the token lands in `profiles.push_token_ios/android`. Verify a row gets a token after you tap it on a real device.

### 6. The sender — pick ONE
The dispatch + scheduler already exist in `backend/`. Two coherent ways to run them:

- **Option A — deploy the Next.js `backend/`** (if you run its Postgres/Prisma DB). Fill `APNS_*` / `FCM_*` env, set the Vercel crons (`/api/cron/push` every minute, `/api/cron/daily`). Tokens must reach its `User` table — set `window.CORE_CONFIG.PUSH_REGISTER_URL` to its `/api/me/push/register` so `core-push.js` posts there too.
- **Option B — Supabase Edge Functions (BUILT).** `supabase/functions/` now contains the full sender, ported to Deno:
  - `_shared/apns.ts`, `_shared/fcm.ts` — APNs (ES256) + FCM v1 senders
  - `_shared/push.ts` — dispatch to whichever device tokens a user has
  - `send-push/` — the engine (`POST {userId,title,body,url?}`); reuse it for coach nudges, coin-received, etc.
  - `send-reminders/` — morning/evening check-ins at each user's local time
  - `send-offers/` — trial-ending + win-back segments
  - `_shared/copy.ts` — the message catalog
  - Schedule: `supabase/migrations/0002_push_schedule.sql` (pg_cron + pg_net)

**Recommendation:** the live app is on Supabase, so **Option B is the shipping path.**

### Deploy Option B
```bash
# from previews/
supabase functions deploy send-push send-reminders send-offers
# secrets (server-side only)
supabase secrets set CRON_SECRET=<random>
supabase secrets set APNS_PRIVATE_KEY="$(cat AuthKey_XXX.p8)" APNS_KEY_ID=... APNS_TEAM_ID=... \
  APNS_TOPIC=com.harperlinks.core APNS_HOST=https://api.push.apple.com
supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat fcm-service-account.json)"
# then run migrations 0001 + 0002 (edit <PROJECT_REF>/<CRON_SECRET> in 0002 first)
```
> APNs keys are passed as the `.p8` **contents** (env), not a file path — Edge Functions can't read local files.

### 7. Reminders & offers (the two message types)
- **Reminders** — from onboarding `state.checkin` (morning 8:30 / evening 21:00 / both) at the user's `timezone`. Backend: `scheduleAtLocalTime()`. After each send, schedule the next day's. Honor the "no streak guilt, no spam" promise (one calm nudge, quiet hours).
- **Offers / win-back** — segment jobs, not schedules: `TRIAL_EXPIRING` (24h before), churned subscriber, slipped 3+ days → `sendPush({ kind: 'TRIAL_EXPIRING' | 'COACH_NUDGE', ... })`.

## Test checklist
1. Migration applied — `profiles` has the push columns.
2. Real device: tap "Turn on" → OS prompt → a token appears in `profiles`.
3. Manually enqueue a `Notification` row with `scheduledFor = now` → cron/sender delivers it to the device.
4. Tap a delivered notification with `data.url` → app deep-links to that screen.
5. Schedule a reminder at your local time → it arrives once, at the right local clock time.
