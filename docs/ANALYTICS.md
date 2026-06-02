# Analytics — Core

## Tools

- **Product analytics:** PostHog (self-host eventually, cloud at start)
- **Errors:** Sentry
- **Performance:** Sentry performance + manual marks
- **Revenue:** RevenueCat dashboard (source of truth) + PostHog ingest
- **A/B:** PostHog feature flags

## Events (v0.1)

### Onboarding
- `onboarding_started`
- `onboarding_step_completed` `{step}`
- `habit_selected` `{habit_slug}`
- `baseline_submitted` `{age_bucket, sex, height_bucket, weight_bucket}`
- `permissions_granted` `{notifications, camera}`
- `widget_prompted`
- `widget_installed` (best-effort heuristic)
- `onboarding_completed` `{duration_s}`

### Auth
- `auth_started` `{provider}`
- `auth_completed` `{provider, is_new}`
- `auth_failed` `{provider, error_code}`

### Core loop
- `slip_logged` `{habit_slug, time_of_day, days_since_last}`
- `recovery_started` `{habit_slug}`
- `recovery_completed` `{habit_slug, xp_recovered}`
- `recovery_skipped`
- `streak_broken` `{habit_slug, prev_count}`
- `streak_milestone` `{habit_slug, count}` // 1, 3, 7, 14, 30, 60, 100

### Coach
- `coach_opened`
- `coach_message_sent` `{is_voice}`
- `coach_message_received` `{first_token_ms, total_ms}`

### Scanners (S2+)
- `scan_started` `{type}`
- `scan_completed` `{type, duration_ms, confidence}`
- `scan_failed` `{type, reason}`

### Subscription
- `paywall_shown` `{trigger}` // habit_2, widget, coach, profile
- `trial_started` `{plan}`
- `subscription_purchased` `{plan, mrr_aud}`
- `subscription_renewed`
- `subscription_canceled` `{reason}`

### Engagement
- `app_opened` `{cold|warm}`
- `app_backgrounded` `{session_duration_s}`
- `tab_viewed` `{tab}`
- `widget_tapped` `{size, action}`
- `push_received` `{type}`
- `push_opened` `{type}`

## Funnels (track every release)

1. **Onboarding** — install → onboarding_started → habit_selected → permissions → onboarding_completed
2. **First slip** — onboarding_completed → first slip_logged (target: ≤ 24h)
3. **First widget install** — onboarding_completed → widget_installed (target: ≤ 48h)
4. **Trial → Paid** — trial_started → subscription_purchased (target: ≥ 30%)
5. **D30 retention** — install → still active on D30

## Cohorts to watch

- New installs this week
- Users with active subscription
- Users with widget installed
- Users with ≥3 habits tracked
- Users who logged in last 24h
- High-honesty users (logged daily for 7d, even slips)
- Quitters (had 7+ day clean streak, then broken — for win-back)

## Privacy

- No PII in events — user_id is opaque UUID
- No raw slip times tracked across users — only bucketed time-of-day
- No content of coach messages logged — only metadata (length, latency)
- Scan images never logged — only result metadata
- Users can opt out → all events stop, historical purged within 30 days

## Dashboards (PostHog)

- **NSM:** DAU/MAU + paying-user retention
- **Funnel health:** onboarding, first-slip, widget, trial
- **Coach engagement:** messages/user/week, AI cost/user/week
- **Scanner adoption:** scans/user/week per type (post-S2)
- **Habit popularity:** which habits drive signups, which retain longest
