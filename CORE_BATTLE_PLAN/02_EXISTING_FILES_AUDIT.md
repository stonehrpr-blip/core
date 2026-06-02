# 02 — EXISTING FILES AUDIT

> Read `00_README.md` and `01_STRATEGY.md` first.

This file is the per-file audit of everything in `~/Desktop/lifeos/`. For each file you'll find:

- **What it is** — one-line purpose
- **State** — ✅ ship-ready, 🚧 needs fixes, ❌ rewrite, ➕ keep + expand
- **Audit checks** — what to verify before touching
- **Fixes required** — what's broken now and must be repaired
- **Additions required** — what to add (cross-referenced to `03_NEW_FEATURES.md`)
- **Verification** — how to confirm the file works after edits

When Claude works on a file, **open this section first, fix what it lists, do not improvise.**

---

## §0. The shared assets (read this first — wires into everything)

These files are dependencies of nearly every HTML page. Fix them in order before touching pages.

### `previews/core-state.js` ➕ keep + expand

**What it is:** Single source of truth for runtime state. Persists `coreState.v1` localStorage key.

**Current shape:**
```js
{
  stats: { lungs, brain, wallet, willpower, body }, // 0–100
  streak: {
    days,
    previousDays,
    lostAt,
    freezes: { availableThisWeek, weekResetAt }
  },
  xp,
  level,
  slips: []
}
```

**Audit checks:**
- Open `core-state.js`. Confirm the schema above is current.
- Run a `grep -n "data-core=" *.html` in `previews/` — every binding should match a real path.
- Test in DevTools console: `coreState.read()` returns the schema. `coreState.lifeScore()` returns a number 0–100.

**Fixes required (current bugs):**
1. **Weekly freeze reset edge case.** When `weekResetAt` is in the future but the user changed their device clock, the reset can fail. Add a sanity check: if `now - weekResetAt > 14 days`, force reset.
2. **Slip array unbounded.** No cap on `slips[]`. After a year heavy users will have 1000+ entries. Add a rolling cap of 500 most recent slips; older ones aggregate into a `slipHistorySummary` field.
3. **`previousDays` not cleared on successful restore.** When user restores their streak, `previousDays` stays populated and confuses subsequent UI. Clear it on `restoreStreak()`.
4. **No `migrate()` function.** When schema changes (this spec adds many fields), there's no version-aware migration. Add a `version` field and a `migrate(oldState)` function that takes any v1 state and produces v2.

**Additions required (this spec):**
1. **Pact state.** Add `pacts: []` array. Each pact: `{id, partnerId, partnerName, startedAt, endsAt, stake, status, escrowId}`.
2. **Witness state.** Add `witness: { enabled, patterns: [], pingHistory: [], dismissedCategories: [] }`.
3. **Promise Letter state.** Add `promiseLetter: { writtenAt, body, deliveredAt, resurfacedAt: [] }`.
4. **Body Receipt state.** Add `bodyReceipts: []`. Each receipt: `{weekOf, lungHoldSeconds, bodyScanData, reflection, photoBlob?}`.
5. **Bonus habits.** Add `bonusHabits: []`. Each: `{id, name, addedAt, primaryStat, slips: []}`.
6. **Lifetime status.** Add `lifetime: { eligibleAt, offeredAt: [], purchased, purchasedAt }`.
7. **Coach tone history.** Add `coachToneHistory: []` so we can show "you switched from Direct to Gentle on day 14."
8. **Calm Library use.** Add `calmLibrary: { sessions: [] }`. Each: `{startedAt, completedAt, trigger, durationSec}`.
9. **App version field.** Add `appVersion` to track which spec version generated the data.

**API additions:**
- `coreState.addPact(partner, stake)` — creates a Pact, calls Stripe escrow stub.
- `coreState.completePact(id, outcome)` — settles a Pact.
- `coreState.recordWitnessPing(category, response)` — tracks user responses.
- `coreState.canAddBonusHabit()` — returns boolean based on streak + existing habits.
- `coreState.recordBodyReceipt(data)` — pushes new weekly receipt, prunes to 26 weeks.
- `coreState.markLifetimeOffered()` — increments offer count.
- `coreState.purchaseLifetime()` — sets `lifetime.purchased = true` and disables future offers.
- `coreState.exportData()` — returns JSON dump for user export.
- `coreState.resetAll()` — already exists, expand to clear all new fields.

**Verification:**
- After edits, schema v2 should accept v1 state via `migrate()`.
- All existing `data-core="path"` bindings must continue to work.
- New fields are accessible via the same binding pattern.
- DevTools test: `coreState.read().version === 2`.

---

### `previews/analytics.js` ➕ keep + expand

**What it is:** Single analytics chokepoint. Exposes `window.coreTrack(event, props)`. Buffers last 200 events in `sessionStorage.coreAnalyticsRing`.

**Audit checks:**
- Open file. Confirm `coreTrack` is exposed on `window`.
- Check the standardized event list in the header comment.
- Verify `screen_view` auto-fires on load.

**Fixes required:**
1. **Anonymous ID not persistent across origins.** `coreAid` is in localStorage which is origin-bound. Add a fallback to read from a meta tag the gallery can inject if needed.
2. **No event throttling.** Heavy interactions (scroll, etc.) could spam. Add a 100ms throttle for high-frequency events; events tagged `throttle: true` are batched.
3. **Ring buffer too small for debugging.** Bump from 200 to 500. Add a `coreAnalyticsExport()` that downloads it as JSON.
4. **No session ID.** Add a `coreSid` UUID per session (cleared on page close or after 30 min idle).

**Additions required:**

Standardize this event taxonomy. **Every event below must be implemented somewhere in the codebase:**

#### Lifecycle
- `app_first_open` — fired once ever, when no `coreAid` exists yet
- `screen_view` — fires on every page load with `{screen, path, sessionDuration}`
- `session_start`, `session_end` — bracket each session
- `app_background`, `app_foreground` — Page Visibility API

#### Onboarding
- `splash_viewed`, `splash_skipped`
- `index_viewed`
- `trial_viewed`, `trial_step_view {step}`, `trial_step_complete {step}`
- `promise_typed`, `promise_signed`, `promise_hint_shown`
- `coach_tone_selected {tone, viaTest}`
- `coach_tone_test_started`, `coach_tone_test_completed {result}`
- `checkin_time_selected {time}`
- `trial_started`, `trial_skipped`
- `quiz_step_view {step}`, `quiz_step_complete {step, answer}`
- `quiz_completed {duration}`
- `permissions_granted {permission}`, `permissions_denied {permission}`
- `onboarding_completed`

#### Main app
- `dashboard_viewed`
- `dashboard_quickaction {action}` — sos/post/scan/etc.
- `stat_card_tapped {stat}`
- `habit_viewed {habit}`
- `slip_button_pressed {habit}`
- `slip_confirm_hold_start`, `slip_confirm_hold_release {duration}`
- `slip_confirmed {habit, magnitude}`
- `slip_almost {mood, hasNote}`
- `streak_freeze_used`
- `streak_lost {previousDays}`
- `streak_restored {previousDays, daysSinceLoss}`
- `recovery_started`, `recovery_completed {duration, hasReflection}`
- `coach_msg_sent {len, isFollowup}`
- `coach_msg_received {tone, isInsight, isAgentic}`
- `coach_agentic_action {action}` — start_session/draft_pact/etc.
- `insight_card_viewed {type}`
- `insight_card_dismissed {type}`
- `panic_started`, `panic_completed {duration}`, `panic_aborted {duration}`
- `crisis_viewed`
- `crisis_resource_tapped {resource}`

#### Milestones
- `milestone_reached {tier, days}` — 7/14/30/60/100/365
- `milestone_celebration_viewed {tier}`
- `milestone_share_tapped {tier, channel}`
- `rank_promotion {fromRank, toRank}`
- `rank_demotion {fromRank, toRank}` — yes, demotions exist on prolonged inactivity

#### Money
- `paywall_viewed {origin}`
- `pricing_viewed {context}`
- `plan_selected {plan}`
- `subscription_started {plan, isTrialAccept}`
- `subscription_canceled {plan, reason}`
- `subscription_retained {offer}` — saved by retention flow
- `subscription_renewed {plan}`
- `lifetime_offered {context}`
- `lifetime_purchased`
- `lifetime_declined {context}`
- `streak_insurance_purchased`
- `streak_insurance_cancelled`
- `restore_purchased`

#### Social
- `feed_viewed`
- `post_viewed {postId, postType}`
- `post_liked {postId}`
- `post_commented {postId, len}`
- `compose_started`
- `compose_posted {len, hasMedia, isPublic}`
- `friend_invited {channel}`
- `friend_accepted {viaChannel}`
- `pact_drafted`
- `pact_invited {partnerId, stake}`
- `pact_accepted {pactId}`
- `pact_declined {pactId}`
- `pact_completed {pactId, outcome}`
- `pact_partner_slipped {pactId}`

#### Witness (new)
- `witness_enabled {permissions}`
- `witness_disabled`
- `witness_ping_fired {category, confidence}`
- `witness_ping_engaged {category, action}` — engaged/dismissed/not_relevant
- `witness_pattern_muted {category}`

#### Body Receipts (new)
- `body_receipt_started`
- `body_receipt_lung_test_started`
- `body_receipt_lung_test_completed {seconds}`
- `body_receipt_completed {duration}`
- `body_receipt_shared {channel}`

#### Promise Letter (new)
- `promise_letter_written`
- `promise_letter_delivered {context}` — day7/30/60/100/near_slip
- `promise_letter_opened`
- `promise_letter_closed {durationRead}`

#### Calm Library (new)
- `calm_library_opened`
- `calm_session_started {category}`
- `calm_session_completed {category, duration}`
- `calm_session_aborted {category, duration}`

#### Pacts (new — see Social)

#### Errors
- `error_boundary {component, message}` — for RN
- `network_error {endpoint, status}`
- `validation_error {field, value}` — for forms

**Verification:**
- Open any preview page, open DevTools, check `sessionStorage.coreAnalyticsRing` after 30 seconds — should contain `screen_view` minimum.
- Every event in the list above must appear at least once during a full user flow walk.
- Build the `dev/metrics.html` page to display real-time analytics (already exists, expand it).

---

### `previews/core-buttons.css` ✅ keep, minor

**What it is:** Shared button system. CSS variables for refined colors.

**Audit checks:**
- Confirm classes exist: `.btn.primary`, `.btn.secondary`, `.btn.ghost`, `.btn.danger`, `.btn.success`.
- Confirm modifiers: `.lg`, `.sm`, `.pill`, `.block`, `.glow`, `.shine`.
- Verify CSS variables match `07_AESTHETIC_BIBLE.md` color tokens.

**Fixes required:**
1. **Hover states on touch devices.** Currently `.btn:hover` fires on touch. Wrap hover in `@media (hover: hover)`.
2. **Disabled state lacks contrast.** `.btn:disabled` is barely distinguishable. Bump opacity to 0.45 and add `cursor: not-allowed`.
3. **Focus ring missing on `.btn.ghost`.** Add a 2px outline on `:focus-visible` for accessibility.

**Additions required:**
1. `.btn.crisis` — red `#FF4F6B`, larger touch target, no shine animation (crisis is not a celebration).
2. `.btn.pact` — gradient with money-green accent `#3DDC97`, used only for Pact CTAs.
3. `.btn.coach` — Coach-tinted, used for "Ask Coach" CTAs everywhere.

**Verification:**
- Test all button variants on dashboard, settings, paywall pages.
- Confirm `:focus-visible` rings appear with keyboard nav.
- Test on iOS Safari, no double-tap-to-zoom artifacts.

---

### `previews/core-responsive.css` ✅ keep

**What it is:** Drops the iPhone phone-frame chrome on mobile viewports.

**Audit checks:**
- Open at `<460px` viewport — frame should disappear.
- Open at desktop — frame should be visible.

**Fixes required:**
1. **Tablet sizing.** Between 460px and 1024px (iPad portrait), the layout currently picks neither rule cleanly. Add a tablet ruleset: keep frame but center, no max-width restriction.
2. **Landscape mobile.** When height drops below 700px on mobile, content can clip. Add a `@media (max-height: 700px)` rule reducing vertical paddings 25%.

**Additions required:**
- New `@media (prefers-reduced-motion: reduce)` block — disable all `animation:` and slow `transition:` to `0.01s`.
- New `@media (prefers-color-scheme: light)` block — **do not auto-light-mode CORE.** CORE is dark-only. Set this block to enforce dark even when user prefers light. (Comment why.)

**Verification:**
- Test 320px (iPhone SE 1), 390px (iPhone 12+), 460px (boundary), 768px (iPad portrait), 1024px (iPad landscape), 1440px (desktop).
- Test with browser's "reduce motion" enabled.

---

### `previews/core-theme.css` ✅ keep, expand

**What it is:** Core color tokens + base typography.

**Fixes required:**
1. Currently defines colors in multiple files (`core-buttons.css` redeclares `--core-blue`). Consolidate all color tokens here. Other files reference, never redeclare.

**Additions required:**
- Add `--core-money-green: #3DDC97;` (for Pact)
- Add `--core-witness-cyan: #5BB1FF;` (for Witness pings — same as breath, intentional)
- Add `--core-letter-gold: #E8C77E;` (for Promise Letter accent)
- Add semantic tokens: `--bg-page`, `--bg-card`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-disabled`, `--border-subtle`, `--border-strong`. All resolve to existing literals; semantic naming for refactor safety.

**Verification:**
- Search codebase for hex literals. After this fix, hex literals only appear in `core-theme.css`. Other files reference `var(--token)`.

---

### `previews/core-tabbar.js`, `core-header.js`, `core-back.js`, `core-toast.js`, `core-tour.js` ✅ keep

These are utility includes. Audit checks:
- `core-tabbar.js` — bottom tab bar renderer. Confirm tabs are: Home / Feed / Coach / Ranks / You. After spec: add a 6th tab? **No.** 5 tabs max. Pacts go inside Feed; Body Receipts go inside You. Witness lives in Coach.
- `core-header.js` — top header. Confirm it renders rank chip + notif bell + settings.
- `core-back.js` — back button utility. Confirm it handles missing referrer (defaults to dashboard, not browser back).
- `core-toast.js` — toast notification system. Confirm queue handling.
- `core-tour.js` — tutorial spotlight. Confirm it only fires once per user via localStorage flag.

**Fixes required across all:**
- Replace any direct `localStorage.setItem` calls with `coreState.update(...)` where possible to keep state centralized.
- Add `try / catch` around every `JSON.parse(localStorage.getItem(...))` call.

---

### `previews/core-pricing-ab.js`, `core-experiments.js` 🚧 expand

**What it is:** A/B testing framework stubs.

**Fixes required:**
1. Currently uses `Math.random()` for assignment which is non-deterministic across sessions. Switch to deterministic hash of `coreAid`.
2. No exposure logging. Every A/B exposure must fire an analytics event.

**Additions required:**
- Define active experiments:
  - `exp_pricing_yearly` — control: $44.99, variant: $39.99 (winner inherits).
  - `exp_promise_hint_timing` — control: 8s, variant: 5s.
  - `exp_coach_opener_warmth` — 4 variants (one per tone) — already tone-specific, this tests warmer/cooler within tone.
  - `exp_witness_default` — control: opt-in, variant: opt-out (user must actively disable). **Default to control — opt-in by default for user trust.**

**Verification:**
- Same `coreAid` should always get same variant.
- Every exposure should appear in analytics ring.

---

### `previews/restore-banner.js` ✅ keep, minor

**What it is:** Drop-in renderer for the streak-lost banner.

**Fixes required:**
1. The minutes-since-slip label refreshes every 60s but doesn't account for the 48hr expiry — when the recoverable window closes mid-view, the banner should self-remove. Add a `checkAndRender()` that runs on every refresh.

---

### `previews/core-edit-mode.js`, `core-tour.js`, `core-stepper.js`, `core-settings-menu.js`, `core-moderation.js`, `core-invite-discount.js`, `core-rank-perks.js`, `core-pricing-ab.js`, `core-atmosphere.js`, `core-avatar.js`, `core-theme.js`, `core-ai.js`, `electric-border.js`, `electric-border.css` ✅ keep

These are scoped utilities. For each:
- Read the file.
- If under 100 lines and behavior is single-purpose, ship as-is.
- If over 200 lines, split into named functions and document the API at the top.

**Specific notes:**
- `core-atmosphere.js` — manages the ambient star field. Ensure performance: throttle to 30fps on mobile, full 60fps on desktop.
- `core-ai.js` — currently a stub. Will become the Coach response router. See `03_NEW_FEATURES.md` §6.

---

## §1. Onboarding screens

### `previews/splash.html` ✅ keep, minor

**What it is:** Native launch placeholder. 1.6s animation → routes per state.

**Audit checks:**
- Open file. Confirm it routes:
  - To `welcome-back.html` if `daysIdle >= 3`
  - To `morning-checkin.html` if pre-11am AND `checkin ∈ {morning, both}` AND no entry today
  - To `bedtime.html` if past 8:30pm AND no bedtime entry today
  - To `dashboard.html` if onboarded
  - To `index.html` if not

**Fixes required:**
1. **No splash on subsequent loads.** If `splashSeenInSession` flag is set, skip and route immediately. Splash should feel premium, not repetitive.
2. **Animation duration hardcoded.** Move to a config var so it's tunable.
3. **No fallback if all routing checks pass and user is in weird state.** Add a final `else` that goes to `index.html` and fires `error_routing_unknown_state` analytics.

**Additions required:**
- Pre-load critical assets during the 1.6s (Coach default avatar, gradient backgrounds, the first dashboard frame).
- If `lastSeenAt` is more than 30 days ago, route to a special "welcome back, here's what changed" screen (a new file, see `03_NEW_FEATURES.md` §15).

---

### `previews/index.html` ➕ keep + expand

**What it is:** The user-facing entry screen. Pentagon orb layout with stat taglines. CTA: "Start my 7-day free trial."

**Audit checks:**
- Open file. Confirm orb names (BRAIN/LUNGS/WALLET/WILLPOWER/BODY) with 3-word taglines.
- Confirm CTA: "Start my 7-day free trial" → `trial.html`.
- Secondary: "I have an account" → `sign-in.html`. "See it first" → `walkthrough.html`.

**Fixes required:**
1. **Top bar alignment.** Person icon + brand mark + invisible spacer. Confirm spacer width matches person icon for centered brand mark.
2. **Mobile orb sizing.** On iPhone SE (320px width), orbs overlap. Ensure 64px size cap with 200px container.
3. **Title gradient.** "you'd be." gradient should be `#5BB1FF → #B388FF → #FF6BAA` per memory. Verify.
4. **Field positioning.** `top: 88px; bottom: 360px;` — confirm this works at all heights, doesn't collide with safe area.
5. **Subscribe-orbs constellation lines.** Lines connecting pentagon points should fade in over 800ms after pentagon stabilizes.

**Additions required:**
- A subtle "60 seconds to your first Coach message" line under the CTA. Subtitle, secondary text color.
- An "as seen on" social-proof strip below the CTA — TikTok handle, Reddit subreddit, hashtag. Only show after we have real social presence; for now ship behind a feature flag (`exp_landing_social_proof`).
- The orb pulse animation should be slightly different per stat — Lungs breathes (4-4-4-4 cadence), Brain pulses faster (1Hz), Wallet pulses slower (0.5Hz), Willpower has a single firm tick (1.2Hz with sharp ease), Body has a steady glow (no pulse). This makes each orb feel alive in its own character.

**Verification:**
- Open at 320px, 390px, 460px, 768px viewport — pentagon should hold shape.
- All four CTA paths work (Start trial / Sign in / See it first / Person icon).

---

### `previews/walkthrough.html` ✅ keep, minor

**What it is:** Pre-trial 3-tab demo. Home/Slip/Coach with sample "Alex" data.

**Fixes required:**
1. The sample data is static. Add subtle motion — the streak counter slowly ticks, the Coach types a message every 8 seconds, the Life Score animates.
2. "Back to welcome" link → `index.html` should preserve any `?ref=` URL params (referral chain).
3. Add a sticky footer CTA that's more prominent than current — "Start my 7-day free trial" in primary button style, not text link.

**Additions required:**
- A fourth tab: "Pact" — showing a sample Pact between Alex and a fake user. This previews the social mechanic without requiring real friends.
- An "exit intent" overlay: if user moves cursor toward top of screen (desktop) or swipes down past top (mobile), show a small bottom sheet: "Want to skip this and just start?" with CTA to `trial.html`.

---

### `previews/trial.html` ➕ keep + expand

> **DRIFT NOTE (2026-05-30):** The live HTML is a **9-step flow with Apple Pay sheet** — `Promise / Name / Profile / Goal / Blocker / Routine / Tone / Check-in / Apple Pay`. The 5-step description below was the original v1 spec but Stone iterated past it in the "AI life-OS sprint" commit (`d92f0c8`). When implementing, **trust the source over this section.** Landed fixes (pricing → $7.99/mo + $44.99/yr + 7-day trial; PROMISE paste-reject; Promise Letter teaser in Step 8; coreTrack wired into local track) committed `6e160a7`. The RN mirror (`trial.tsx`) is still 5-step and pending expansion.

**What it is:** 9-step animated card flow. PROMISE-typed contract / Name / Profile / Goal / Blocker / Routine / Coach tone / Check-in / Apple Pay.

This is one of the most important screens in the app. **Read it carefully.**

**Audit checks:**
- Open file. Confirm 5 steps with progress dots.
- Confirm Step 0 requires literal "PROMISE" typed (uppercase, mono font).
- Confirm Step 1 captures name → stored in `coreOnboardTrial.name`.
- Confirm Step 2 has 4 tone cards (gentle/balanced/direct/drill) + "Not sure? Take the test →" link.
- Confirm Step 3 check-in time (Morning / Evening / Both-recommended).
- Confirm Step 4 trial pitch + commit CTA.
- Confirm exit-intent bottom sheet on attempted leave.

**Fixes required:**
1. **The 8s hesitation tooltip** on Step 0 — copy is "Take your time. This part isn't a test — it's a signature." Verify timing (8s after entering step 0 with no typed input).
2. **PROMISE input accepts pasted text.** Currently does. **Should reject paste** — typing is part of the commitment. Add `paste` event handler that prevents and shows a toast: "Type it. Don't paste."
3. **Tone card descriptions are too long.** Each card has body copy that's 3 lines. Shorten to 1 line + a 2-word vibe tag.
4. **Check-in time picker** — "Both-recommended" should have a small badge "Most users pick this" that lights up after 1.5s.
5. **Step 4 trial pitch** — currently the price ($9.99/mo) is visible. Update to new pricing ($7.99/mo or $44.99/yr) per `01_STRATEGY.md` §3.
6. **Exit intent bottom sheet** — copy currently says "$9.99/mo." Update to new price.
7. **Analytics events** — verify all 5 step views fire `trial_step_view {step}` and all 5 completions fire `trial_step_complete {step}`.

**Additions required:**
- **Step 2.5 — Tone preview chip.** Each tone card gets a small "preview ›" link that opens `tone-detail.html?tone=X`. Already exists per memory; verify wired.
- **Step 3.5 — Permissions preflight.** Between check-in and trial pitch, add a screen "We'll ask for notifications in a sec. Here's why." with the bell icon and a single sentence per permission. Soft preview, not the actual prompt.
- **Step 4 — The Promise Letter teaser.** After "Start my 7-day free trial" CTA, add a sub-line: "On day 7, Coach will write you a letter." This previews the Promise Letter feature (see `03_NEW_FEATURES.md` §2) and adds anticipation.
- **The PROMISE input** should accept multiple variants: "PROMISE" / "I promise" / "I do" (each in caps required). All count. Default placeholder shows "PROMISE." This adds choice without weakening the commitment.

**Verification:**
- Type "P-R-O-M-I-S-E" letter by letter — input should accept.
- Try paste — should reject with toast.
- Complete all 5 steps — `coreOnboardTrial` should populate with name, tone, checkin, committed=true, trialStartedAt timestamp.
- Try to exit during steps — exit-intent should fire.
- Verify analytics ring after completion has all 5 step_view + 5 step_complete + 1 trial_started.

---

### `previews/coach-tone-test.html` ✅ keep, minor

**What it is:** 3-question quiz that recommends a tone.

**Fixes required:**
1. The recommendation logic is currently a sum of points. Replace with a 3D vector scoring: each answer affects (warmth, directness, energy). The closest tone in vector space wins. This makes results more nuanced.
2. After recommendation, the "Use this Coach" CTA writes `coreToneTestResult` and routes to trial OR settings. Verify routing logic (memory says it routes correctly based on `coreOnboardComplete`).

**Additions required:**
- Show all 4 tones' scores at the end (radar chart). User can override the recommendation if they prefer a different tone.

---

### `previews/quiz.html` 🚧 fixes + additions

**What it is:** 14-step legacy structure quiz mirroring `~/Desktop/Zilo-edit/pages/trial.html`.

**Audit checks:**
- Open file. Confirm 14 steps: Name / Profile / Age / Main Goal / Sleep / Water / Routine / Blocker / Dynamic Q1 / Dynamic Q2 / Check-In Time / Reminders / Coaching Style / Review.
- Confirm Dynamic Q1/Q2 swap based on Goal selection.
- Confirm final step writes `coreOnboardComplete=1` and routes to dashboard.
- Confirm prefills from `coreOnboardTrial` (name, tone).

**Fixes required:**
1. **Quiz duration too long.** 14 steps after the user has already done 5 in trial.html is exhausting. Trim to 9 steps for v2:
   - Profile (1)
   - Age (2)
   - Main Goal (3)
   - Vape: last puff, daily count, trigger (4-6 — three specific vape questions)
   - Sleep (7)
   - Coaching style preview (8 — confirms tone from trial)
   - Review (9)
   - Remove: Water, Routine, Blocker, Dynamic Q1/Q2, Check-In Time, Reminders (already in trial)
2. **Profile step has avatar upload that doesn't validate file size.** Add: max 5MB, JPG/PNG only, show preview before commit.
3. **Age slider min/max.** Currently 13-99. Bump min to 18 (legal vape age US, AU, UK). Below 18 → show "Core is built for adults 18+. Come back when you're ready." page.

**Additions required:**
- **Vape-specific section (steps 4-6):**
  - Step 4: "When was your last puff?" — options: <1 hour / 1-24 hours / 1-3 days / 4+ days / never started (this question identifies the user's stage — newbie quitter, mid-quit, returner)
  - Step 5: "How many puffs / pods per day at your peak?" — slider 0-100+
  - Step 6: "What sets it off?" — multi-select: Stress / Boredom / Drinking / After meals / Driving / On phone / Wake-up / Other — these become Witness model inputs
- **Step 8 (Coaching style preview)** — instead of re-picking tone, show a sample message from the chosen tone and ask "Sound right?" with options Yes / Change tone. If Change tone → opens tone test.

**Verification:**
- Take quiz from trial.html → quiz.html. Should be ~3 minutes total.
- Check `coreQuizAnswers` localStorage after completion — should contain all 9 step answers.
- Vape trigger answers should appear in Witness model on dashboard.

---

### `previews/baseline.html` ❌ remove

**What it is:** Old alt-short onboarding flow.

**Decision:** No longer needed. The 5-step trial + 9-step quiz covers everything. Remove from gallery and routing.

**Fixes required:**
- Delete the file. Remove all links pointing to it.
- Search: `grep -rn "baseline.html" ~/Desktop/lifeos/` — confirm zero references after deletion.

---

### `previews/pick-habits.html` 🚧 fixes

**What it is:** Habit selection. Pre-selects "Quit Vaping" with "★ Your focus" pill.

**Fixes required:**
1. **Continue CTA bypassing baseline.** Memory says it goes straight to dashboard. Verify.
2. **The "add more anytime" line should clarify the unlock rule.** Append: "Bonus habits unlock at day 30." per strategy.
3. **All non-vape habits are visually disabled** (low opacity, locked icon) but selectable. **Should be visually disabled AND non-selectable** until day 30. Tap → toast "Unlocks at day 30 of your streak."

**Additions required:**
- A "Why only vape at first?" link below the list → opens a brief modal explaining the "wedge" philosophy. Coach voice. Helps the user buy in.

---

### `previews/permissions.html` 🚧 fixes + additions

**What it is:** Permission preflight after onboarding.

**Fixes required:**
1. Currently asks for Notifications only. Add the new permissions Witness requires (with clear opt-in).
2. The "Allow" button shouldn't be the only path. Add "Maybe later" with no penalty.

**Additions required:**

Each permission gets a dedicated card:

1. **Notifications** (existing)
   - Title: "Coach can reach you"
   - Body: "Morning check-ins, milestone celebrations, Witness pings. Never spam. Never overnight."
   - CTA: Allow / Maybe later
   - On allow: fire native permission prompt.

2. **Screen Time** (new — for Witness + Shield)
   - Title: "Witness watches with you" (Coach voice)
   - Body: "Core checks for slip-pattern usage on apps you flag. Only those apps. Nothing else."
   - Reassurance: "You pick the apps. You can revoke any time."
   - CTA: Set this up / Maybe later
   - On allow: open `witness-setup.html` (new screen, see `03_NEW_FEATURES.md` §1).

3. **Location** (new — optional, for Witness)
   - Title: "Pattern your places"
   - Body: "Core can ping you when you're near a place you've slipped before. Off by default. Choose places explicitly."
   - CTA: Set up places / Skip
   - On allow: open `witness-places.html`.

4. **Health (lung function tracking)** (new — for Body Receipts)
   - Title: "Track your lungs"
   - Body: "Weekly breath-hold timer + optional Apple Health sync. Your lungs heal; you should see it."
   - CTA: Connect Health / Skip

5. **Contacts** (optional — for Pacts)
   - Title: "Find your Pact partner"
   - Body: "Match you with a friend already on Core. We never store contacts after the match."
   - CTA: Allow once / Skip
   - On allow: ephemeral contact match — no persistence.

**Verification:**
- Skip all 5 — flow completes, no permissions granted.
- Allow all 5 — flow completes, all permissions registered in `coreState.permissions = {notif, screenTime, location, health, contacts}`.

---

### `previews/sign-in.html`, `sign-in-email.html`, `sign-in-otp.html` 🚧 fixes

**What it is:** Apple/Google/Email auth flows.

**Fixes required:**
1. **Email validation.** `sign-in-email.html` accepts any string. Add regex validation. Show inline error if invalid before allowing submit.
2. **OTP screen.** `sign-in-otp.html` should auto-advance focus when each digit typed. Backspace should also work cross-input.
3. **Apple/Google buttons.** Verify the design follows Apple/Google brand guidelines (white bg required for Sign in with Apple on dark UI? Check the spec).
4. **Back button.** `sign-in.html` back uses `history.back()` with fallback. Verify the fallback (`index.html`).

**Additions required:**
- "Forgot password" link from email screen.
- "Sign in with passkey" option for Apple users with passkey support.

---

## §2. Main app screens

### `previews/dashboard.html` ➕ keep + extensive expand

**What it is:** The home screen. THE most important page in the app.

**Audit checks:**
- Open file. Confirm structure: head greeting → rank chip + trial pill → Life Score ring → 5 stat cards → today's quest → achievement teaser → quick actions.
- Confirm streak strip with freeze pill.
- Confirm `data-core` bindings on stat cards.
- Confirm restore banner slot is wired.
- Confirm milestone redirect logic (auto-routes to `streak-celebration.html` once per tier).
- Confirm INSIGHT_RULES system renders Coach insight cards.

**Fixes required:**
1. **Stat card animations on data change.** When a slip happens elsewhere, the dashboard stat values update via `coreStateChange` event. Currently the change is a jump-cut. Add a 600ms tween (CSS transition) on the stat number AND the progress fill bar.
2. **Trend chip computation accuracy.** Trend chip uses 24hr deltas. Bug: if there's a single slip 23 hours ago, the chip still shows it tomorrow. Filter strictly by `Date.now() - 24*60*60*1000`.
3. **Quick action "SOS" button placement.** Currently in the row of 4 actions. **Promote** to be standalone, large, always visible at the top of the actions row. SOS is the highest-leverage button in the app and should not be a peer to "Scan food."
4. **The trial day pill** — "DAY 3/7" — should be tappable, opening a modal: "Day 3 of your free trial. 4 days left. We'll only charge if you choose to continue." This proactively addresses trial anxiety.
5. **The greeting "Morning, {name}"** — currently hard-coded as "Morning." Add time-of-day variants: Morning (5-12) / Afternoon (12-17) / Evening (17-22) / Late (22-5). Each variant has tone-aware copy.
6. **Streak strip tappable.** Memory says it now routes to `streak-board.html`. Verify the freeze pill `event.stopPropagation()` is correct (inner click doesn't propagate to outer streak tap).

**Additions required:**
1. **Witness ping slot.** Above the Life Score ring, when a Witness ping is active, render a card: "[Coach line] · Yes / No thanks." See `03_NEW_FEATURES.md` §1.
2. **Promise Letter teaser strip.** Day 7, day 30, day 60, day 100 — appears above stats: "Coach wrote you a letter. [Read]." See §2 of new features.
3. **Body Receipt prompt.** Week-end (Sunday afternoon by default): "Your week is wrapping up. Quick Body Receipt? [Yes / Later]." See §4.
4. **Pact strip.** Below stat cards, if active Pacts exist, render small cards showing each Pact's status (day X of Y, partner avatar, your status / their status). Tap → opens that Pact's detail.
5. **Calm Library quick access.** A subtle button in the bottom-right of the stat grid: "Calm me · 60s." Goes to the Calm Library.
6. **Lifetime offer slot.** Day 30, the lifetime offer appears as a card (once). User can dismiss; reappears day 90.
7. **Lockdown mode indicator.** If user is in 7-day Lockdown (extreme mode), the dashboard top bar gets a small "Lockdown · Day 4/7" amber chip. Settings access is gated.
8. **Coach line of the day.** A new small section between the achievement teaser and quick actions: "Coach says: [one line]." Tone-aware. Updates daily at 3am local.

**Layout priorities (top to bottom):**

1. Top header (greeting + rank + trial pill + bell)
2. Restore banner (if streak lost in last 48h) — only shows if applicable
3. Witness ping (if active) — only shows if applicable
4. Promise Letter teaser (if applicable, day 7/30/60/100) — only shows if applicable
5. Life Score ring + 5 stat cards
6. Streak strip (with freeze pill, today's slips chip)
7. Pact strip (if active Pacts exist)
8. Today's quest (1 daily action — e.g., "Try the 60-second box breath")
9. Coach line of the day
10. Quick actions row (SOS large + Post + Body Receipt + Calm)
11. Achievement teaser
12. Body Receipt prompt (if weekend, only)
13. Lifetime offer (day 30 / 90 only)

This layout puts the **immediate-action triggers** (Witness, Restore, Promise Letter) above the steady-state (Life Score). Decisions before display.

**Verification:**
- Open dashboard fresh — all hidden cards (Witness/Promise/Pact/Receipt/Lifetime) properly hidden.
- Trigger a slip elsewhere — see stat cards animate down.
- Trigger a milestone — get redirected to celebration.
- Trigger Witness ping (via dev/state-mutator) — card appears.
- Resize viewport from desktop to 320px — layout reflows without overflow.

---

### `previews/habit.html` ➕ keep + expand

**What it is:** Universal habit page. URL hash determines which habit (`#vape`, etc.).

**Audit checks:**
- Open with `#vape`. Confirm avatar, color, particle theme matches.
- Confirm "Mark a puff" button (or equivalent per habit) routes to `slip-confirm.html?habit=vape`.
- Confirm primary stat (lungs) displays via `data-core="stats.lungs"`.
- Confirm streak chip shows current habit streak.

**Fixes required:**
1. **Habits other than vape are accessible by URL even before unlock.** Wrap the page in a unlock-check head script: if user requests a locked habit, redirect to `dashboard.html` with toast.
2. **"Mark a puff" copy is vape-specific.** For other habits, copy varies — "Mark a scroll" / "Mark a spend" / etc. Move to a habit copy map.
3. **Particle theme per habit** — vape uses smoke, doomscroll uses pixelation, spend uses falling coins (red), etc. Verify each habit has its theme.

**Additions required:**
1. **Body Receipt mini.** At the top of vape habit, show last-week's breath-hold time vs this week's. Visual: a horizontal bar comparing.
2. **Witness panel.** Below the slip button, a small card: "Coach is watching for: [your top 3 triggers]." Tap to edit. Pulls from quiz answers.
3. **Triggers log.** A small section: "Triggers logged this week" — listed with timestamps. Helps the user see their own pattern.
4. **Coach quick-prompt.** A "Talk to Coach about [habit]" button at bottom — opens Coach with a pre-filled context that this conversation is about this habit.

**Verification:**
- Open `#vape` — vape avatar, smoke particles, lungs stat shown.
- Open `#doomscroll` — different avatar, pixelation, brain stat — but only after day 30 unlock.
- Tap "Mark a puff" — routes to slip-confirm with `?habit=vape`.

---

### `previews/slip-confirm.html` ✅ keep, minor

**What it is:** 2-second hold-to-confirm sheet between slip button and `logSlip`. Animated SVG ring.

**Fixes required:**
1. The "I almost did but didn't" escape — currently rewards +5 XP, willpower +1. Increase to +8 XP, willpower +2 (recognizes willpower more strongly).
2. The hold ring color should pulse red as it nears completion (visceral signal).
3. Tone-aware title/copy — verify all 4 tones implemented.

**Additions required:**
- A "What set it off?" mini-prompt after slip is confirmed (3-tap multi-select with the user's known triggers): Stress / Boredom / Drinking / After meal / Driving / Phone / Wake-up / Other. Records to slip metadata. Helps Witness learn.
- Optional 1-line free text "anything else?" — never required, takes ≤30 chars.

**Verification:**
- Press and hold — ring animates over 2s, slip logs at 2s.
- Release early — slip does NOT log.
- Tap "Almost did but didn't" — XP +8, willpower +2, no slip logged.
- Slip metadata records the trigger tags.

---

### `previews/recovery-quest.html` ➕ keep + expand

**What it is:** Post-slip recovery flow. Reflection + reframe.

**Fixes required:**
1. Currently a single-step textarea. Expand to 3-step:
   - Step 1: "What set it off?" (trigger multi-select)
   - Step 2: "What were you feeling?" (mood emoji + 1-line note)
   - Step 3: "What would have helped?" (Coach generates suggestions based on trigger)
2. CTA at the end: "Lock in your reset" — bounces back to dashboard with +25 XP recovery bonus.

**Additions required:**
- Coach reflection: based on trigger + mood + slip count this week, Coach surfaces a personalized line at the end. Tone-aware.
- Body Receipt sync: if this slip was logged on a habit page, prompt to update lung stat manually (acknowledging that the data may have already counted it).

---

### `previews/coach.html` ➕ keep + extensive expand

**What it is:** Main Coach chat surface.

**Audit checks:**
- Open file. Confirm streak-broken takeover when `isStreakRecoverable()`.
- Confirm tone-aware greeting based on `coreOnboardTrial.tone`.
- Confirm suggested-prompts chips at top.
- Confirm INSIGHT_RULES cards above chat.
- Confirm voice mode toggle (Jarvis-style mic).

**Fixes required:**
1. **Suggested prompts chip behavior.** When tapped, currently fills the input. Should also auto-submit. The friction is too high.
2. **Voice mode** — `assistant.html` is the voice mode preview. Verify the link from coach.html chat to voice mode works.
3. **Conversation persistence.** Verify Coach conversation history is stored in `coreState.coachConversations[]`. Last 50 messages.

**Additions required:**
1. **Witness toggle in header.** A small badge: "Witness: On / Off." Tap to open Witness settings.
2. **Tone switcher.** A small chip showing current tone. Tap → quick switcher modal with 4 tone cards. Switching mid-conversation is allowed and fires `coach_tone_changed`.
3. **Agentic actions.** Coach replies can include inline action cards:
   - "Start 10-min focus session"
   - "Open Calm Library"
   - "Draft a Pact with [friend]"
   - "Set Witness window for tonight"
   - "Open Promise Letter"
   These are styled as buttons in the message bubble. Tapping confirms (per AI safety memory) before executing.
4. **The Calm Library button.** Always available in the input area, alongside the mic. Tapping opens the Calm Library.
5. **Coach memory.** A "Coach's notes" section in Settings (new) shows what Coach has stored about the user. Editable. Transparency.

**Verification:**
- Open Coach — greeting matches tone.
- Tap a suggested prompt — submits and Coach responds.
- Coach reply includes an action card — tap → confirmation modal → action executes.
- Switch tone mid-convo — next reply uses new tone.

---

### `previews/coach-during-craving.html` ✅ keep, minor

**What it is:** Single-purpose takeover. Breath ring + 3 quick replies.

**Fixes required:**
1. **Persistent banner.** Confirm banner stays for entire screen duration.
2. **Breath ring timing.** 4-4-4-4 cadence. Verify implementation matches box-breath standard.
3. **Quick replies** — passed/slipped/call → handle each. "Call" should open phone with a placeholder support number or trusted contact.

**Additions required:**
- A "I'm spiraling" red button at bottom that routes immediately to `crisis.html`. Last-resort safety.

---

### `previews/coach-craving-result.html` ✅ keep

**What it is:** Post-panic win screen. Auto-routes from panic.html after 60s timer.

**Fixes required:**
1. Tone-aware Coach quote — verify all 4 tones implemented.
2. "Share this win" CTA → `streak-share.html` — verify the params pass through.

---

### `previews/stat.html` ➕ keep + expand

**What it is:** Universal stat drilldown. Hash determines which stat.

**Audit checks:**
- Open `#lungs`. Confirm the ring shows current value from `coreState.stats.lungs`.
- Confirm trend graph (last 7 days).
- Confirm recent activity list filters by primary-habit map.

**Fixes required:**
1. **Trend graph** — currently shows mocked data fallback when no real data. Should show a "Building your trend" placeholder for first week.
2. **Recent activity** — when there's no data, fallback is generic. Replace with "Your trend will appear here." personalized to stat.

**Additions required:**
1. **Drill-down by habit.** If user has bonus habits affecting this stat, show contributions per habit.
2. **Goal setting.** "Set a target for [stat]" — small CTA. Allows user to choose a target value. Stat ring then shows progress toward target.
3. **Body Receipt link.** For Lungs and Body, link directly to Body Receipts. "See your weekly evidence."
4. **Coach quick prompt.** "Why is [stat] dropping?" — Coach analyzes recent slips affecting this stat and responds tone-aware.

---

### `previews/stat-wizard.html` ➕ keep + light expand

**What it is:** Setup flow for stat targets.

**Fixes required:**
1. Currently a stub. Build it out: 3 steps — pick stat, set target, set timeline. Saves to `coreState.statTargets`.

---

### `previews/feed.html` ➕ keep + expand

**What it is:** Social feed. Friends streak strip + sample posts.

**Audit checks:**
- Open file. Confirm friend streak strip + 4 posts.
- Confirm like / comment / share menus.
- Confirm habit tags on posts.
- Confirm rank pills.

**Fixes required:**
1. **Default visibility.** Posts should default to "Friends only" per `01_STRATEGY.md` §8.
2. **"Like" persistence.** Currently localStorage-only. Add a fake delay (200ms) before persisting to simulate network. Helps the RN port feel real.

**Additions required:**
1. **Pact section.** Above the post feed, a horizontal scroll of active Pacts (yours + close friends'). Tap to see details.
2. **Empty state.** If no friends added, feed shows "Your feed is quiet. Add friends or join a Pact."
3. **Posting prompts.** Floating compose button. When no recent posts, the empty state has prompts: "Share your first 7 days" / "Post your Body Receipt" / "Start a Pact."

---

### `previews/compose.html` ✅ keep, minor

**What it is:** Post creation with live word filter.

**Fixes required:**
1. **Live word filter** — confirm it flags + hides certain terms, hard-blocks self-harm content. List in `08_COPY_LIBRARY.md`.
2. **Visibility default** — set to friends-only by default. Public requires explicit toggle.

**Additions required:**
- A "Tag your habit" field. Auto-tags to vape if user has only one habit. Multi-select if multiple.
- A "Share Body Receipt" toggle — if user has a recent Body Receipt, can attach a redacted version (no photo, just stats).

---

### `previews/comments.html` ✅ keep

**What it is:** Post thread with nested replies.

**Fixes required:**
1. **Nested depth limit.** Cap at 3 levels deep. Beyond that, "Continue this thread →".
2. **Block / report** — verify accessible from each comment's menu.

---

### `previews/profile.html` ➕ keep + expand

**What it is:** User profile. Avatar + rank pill + trio (streak/score/friends) + 5-stat strip + achievement grid.

**Fixes required:**
1. **Day streak tap** — verify routes to `streak-board.html`.
2. **Rank pill** — should show current rank with tier-appropriate color.
3. **Avatar** — placeholder if user hasn't uploaded.

**Additions required:**
1. **Promise Letters section.** Below stats, a section "Letters from your future" — shows all delivered Promise Letters. Tap to re-read.
2. **Pact history.** Below letters, "Your Pacts" — completed + active Pacts as cards.
3. **Body Receipts.** "Your evidence" — last 4 weeks of Body Receipts as a horizontal strip.

---

### `previews/user-profile.html` ✅ keep, minor

**What it is:** View another user. Follow/message + shared habits + recent posts.

**Fixes required:**
1. **Privacy respect.** If the other user is private, show "This profile is private" + "Send Pact invite?" CTA only.
2. **Block / report** options visible in menu.

**Additions required:**
- "Pact with [name]" CTA visible if both users are eligible (no active Pact with each other, both Pro tier).

---

### `previews/leaderboard.html` 🚧 expand

**What it is:** 7-tier rank ladder.

**Fixes required:**
1. **Rank ladder expansion.** Memory mentions 7 tiers (Focus→Apex). Per `01_STRATEGY.md`, expand to 13 tiers. Update visual ladder.
2. **Friends-only by default.** Toggle for global leaderboard (paid feature).
3. **Recovery Quality ranking.** Replace raw XP ranking with Recovery Quality score: `(daysClean * 1.0) + (recoveriesCompleted * 0.5) - (slipsThisMonth * 0.3)`. This rewards both consistency AND honesty (people who log + recover rank above people who never slip but also never engage).

**Additions required:**
- "Pacts you're in" sub-section below the leaderboard. Pact partners are highlighted.
- Filter by: All-time / This month / This week.

---

### `previews/ranks.html`, `rank-detail.html`, `rank-reveal.html`, `rank-up.html` ➕ expand

**What it is:** Rank progression system.

**Fixes required:**
1. **Rank up celebration** (`rank-up.html`) — verify particles + sound.
2. **Rank reveal** (`rank-reveal.html`) — currently shows on first time user reaches a rank. Confirm one-shot via localStorage flag.

**Additions required:**
- Per `01_STRATEGY.md`, expand from 7 tiers to 13. New rank ladder:
  1. Focus (day 0–6)
  2. Spark (day 7+)
  3. Steady (day 14+)
  4. Flow (day 21+)
  5. Forge (day 30+)
  6. Iron (day 45+)
  7. Edge (day 60+)
  8. Crest (day 80+)
  9. Peak (day 100+)
  10. Summit (day 150+)
  11. Apex (day 200+)
  12. Beyond (day 300+)
  13. **Core** (day 365+) — the rank named after the app. Ultimate.
- Each rank gets a perk (see `core-rank-perks.js`):
  - Focus: just starting
  - Spark: unlock first Pact invitation
  - Steady: unlock bonus tone preview (cycle Coach for a week)
  - Flow: unlock the first Body Receipt template variant
  - Forge: unlock bonus habit slot (1)
  - Iron: unlock the Calm Library customization
  - Edge: unlock public profile option
  - Crest: unlock the "veteran" badge
  - Peak: unlock the 90-day report customization
  - Summit: unlock the second bonus habit slot
  - Apex: unlock Coach tone mixing (e.g., 70% direct + 30% gentle)
  - Beyond: unlock Pact host mode (organize multi-person Pacts)
  - Core: unlock the lifetime upgrade discount ($59 instead of $89)

**Verification:**
- Set `coreState.streak.days = 365` via dev tools. Check rank = "Core."
- Set `streak.days = 7`. Rank = "Spark." Check perk unlock applied.

---

### `previews/streak-board.html` ✅ keep, minor

**What it is:** 365-day heatmap.

**Fixes required:**
1. Today's cell should be outlined (currently might be unmarked).
2. Slips overlay (red cells) verified against `coreState.slips[]`.
3. Freezes (cyan) verified.

**Additions required:**
- Weekly summary below the grid (already exists per memory). Verify shows last 6 weeks.
- Tap any cell → modal with what happened that day (slip note, recovery, milestone).

---

### `previews/streak-celebration.html` ✅ keep, minor

**What it is:** Milestone moment. Confetti + aurora + XP bonus.

**Fixes required:**
1. **Param-driven (`?days=14`).** Verify tier map handles all 6 tiers (7/14/30/60/100/365). Add 200, 300 as bonus tiers if expanding.
2. Post to feed CTA → `share-options.html`. Verified.
3. **Pick next mountain** CTA — appears only when days >= 30 AND no `coreNextGoalPicked` flag. Routes to `goal-set.html`.

**Additions required:**
- Promise Letter delivery hook: at day 7, after celebration, automatically open the Promise Letter. At day 30/60/100, surface the letter as a "re-read" option.

---

### `previews/streak-share.html`, `share-card-generator.html`, `share-streak-card.html`, `share-options.html` ✅ keep

**What it is:** Share assets system. PNG generation + share sheet.

**Fixes required:**
1. **PNG generation** — `share-card-generator.html` downloads a real 1290² PNG. Verify the canvas rendering matches design (radial bg, gradient text, stat chips, footer).
2. **iMessage / X / Story / Copy** channels — verify each handles the share intent (URL or PNG blob).
3. **Public URL handoff** — when sharing a profile, the URL goes to `u/index.html?u=name&days=N` — the public profile preview. Verify it works.

---

### `previews/morning-brief.html`, `bedtime.html`, `morning-checkin.html`, `weekly-review.html` ➕ keep + minor

**What it is:** Time-based check-ins.

**Fixes required:**
1. **Routing from splash.** Verify the splash logic routes to morning-checkin pre-11am (if checkin includes morning AND no entry today) and bedtime post-8:30pm (if no entry today).
2. **Mood tally + sleep average** — verify `weekly-review.html` reads real data from `coreBedtimeLog` and `coreMorningLog`.

**Additions required:**
1. **morning-brief.html** — add "Witness windows for today" section listing the user's predicted high-risk windows based on past patterns.
2. **weekly-review.html** — add Body Receipt summary (lung-hold trend, weight if tracked, photo grid).
3. **bedtime.html** — add "Did Witness help today?" yes/no chip → feeds into Witness model.

---

### `previews/panic.html` ✅ keep, minor

**What it is:** Craving SOS. Box breath + 60s timer + 3 prompts.

**Fixes required:**
1. **Breath cadence sync.** Verify the ring's scale/breathe animation matches the 4-4-4-4 phase labels exactly.
2. **60s reward.** XP +10, willpower +2. Verify.
3. **Auto-redirect to coach-craving-result on completion.** Verified.

**Additions required:**
- A "Pact partner online?" tag at the bottom — if any Pact partner is currently in-app (with permission), shows their initial. Tapping pings them.

---

### `previews/crisis.html` ✅ keep

**What it is:** AU/US/UK crisis lines + 60s breath + Coach + friend safety net.

**Fixes required:**
1. **International coverage.** Add lines for Canada (988), New Zealand (1737), Ireland (116 123). Make this list expandable in Settings.
2. **Region detection.** Default to user's locale-derived region; user can override.
3. **Friend safety net.** Allow user to designate a trusted contact (one-time setup). Tap → opens phone call.

---

### `previews/restore-streak.html` ✅ keep

**What it is:** $0.99 streak restore screen.

**Fixes required:**
1. **48hr countdown** — verify timer accuracy.
2. **Restore CTA** — calls `coreState.restoreStreak()` + +50 XP + bounces to dashboard. Verified.

---

### `previews/pause-overlay.html` ✅ keep

**What it is:** Pause durations + streak freezes + leave-Core.

**Fixes required:**
1. **Pause durations** — 24hr / 3 days / 7 days / Indefinite. Verify each updates `coreState.paused` correctly.
2. **Leave Core escalator** — at the bottom, "Leave Core" should be tactful. Not "Delete account." Reads: "Step away · You can come back any time."

---

### `previews/cancel.html` ✅ keep, minor

**What it is:** 3-step retain flow.

**Fixes required:**
1. Step 1 reasons — multi-select OK.
2. Step 2 retention offers — pause 30d / 50% off 3mo / +2 freezes / Streak Insurance $1.99. Verify all four.
3. Step 3 loss-confirm — explicit what-you-give-up list, reading from live `coreState.lifeScore()` + rank + streak. Verified.

---

### `previews/pricing.html`, `paywall.html`, `referral-paywall.html` 🚧 update for new pricing

**What it is:** Pricing tiers + paywall + friend-gift variant.

**Fixes required:**
1. **All prices updated** per `01_STRATEGY.md` §3:
   - Pro Monthly $7.99/mo (was $9.99)
   - Pro Yearly $44.99/yr (was $59.99)
   - Pro Lifetime $89 (new tier, gated to day 30+ users)
2. **Comparison table** — update savings calculation.
3. **FAQ** — update to reflect new pricing.
4. **Streak Insurance addon row** — keep $1.99/mo.

**Additions required:**
1. **Lifetime row** in pricing — visible to all users, but the CTA reads "Available at day 30" with a lock icon if user is pre-day-30.
2. **Pact stake mention** — small footer note: "Pacts cost $5 to start (refundable on completion)."

---

### `previews/walkthrough.html`, `social-proof.html`, `welcome-back.html` ✅ keep

These were covered above (walkthrough) or are simple. Verify:
- `social-proof.html` — animated counters, testimonial carousel, ticker numbers. Memory says exists.
- `welcome-back.html` — 3+ day idle user. Frozen streak flame. Memory says exists.

---

### `previews/trial-expired.html` ✅ keep

**What it is:** Day 8 lock screen. Blurred mini-dashboard.

**Fixes required:**
1. Update pricing on plan toggle (monthly $7.99, yearly $44.99).
2. Resume CTA — calls Stripe/RevenueCat → on success, `setSubscriptionActive(true)` → routes to dashboard.

---

### `previews/notifications.html`, `notifications-settings.html` 🚧 expand

**What it is:** Notification inbox + settings.

**Audit checks:**
- `notifications.html` — inbox list with marks for read/unread.
- `notifications-settings.html` — check-in segmented picker, channel toggles, DND.

**Fixes required:**
1. **DND enforcement.** Verify the app actually respects DND windows when sending local notifications.
2. **Witness notifications.** Add a Witness toggle in settings.

**Additions required:**
- Witness category toggle (with description of what it does).
- Pact category toggle.
- Body Receipt reminder toggle.
- Promise Letter delivery toggle (separately from generic notifications — these are special).

---

### `previews/find-friends.html` ✅ keep, minor

**What it is:** Search + invite + suggested + Buddy match.

**Fixes required:**
1. **Buddy match logic.** Verify the "same streak day" matching uses actual streak days.
2. **Invite via channel.** SMS / WhatsApp / Email / Copy link — verify each.

**Additions required:**
- A "Pact-ready friends" section — friends who are at compatible streak levels and have Pro tier. Sorted by match score.

---

### `previews/friends-leaderboard.html`, `friends-streak.html`, `friend-slipped.html` ✅ keep

**Fixes required:**
1. **`friend-slipped.html`** — iOS-style notif → sheet. Verify the 4 reply templates (proud/walk/here/match) work.
2. **`friends-streak.html`** — horizontal scroll of friends' streak rings. Verify own ring shows current days.
3. **`friends-leaderboard.html`** — 5-friend table. Weekly XP vs all-time toggle. Verify.

---

### `previews/invite.html`, `referral.html` ✅ keep, minor

**Fixes required:**
1. **Generated URL** — `core.app/u/<name>?ref=<name>` — verify name is lowercased + alphanumeric-only.
2. **Copy button** — writes full https URL. Verified.

---

### `previews/notifications-settings.html` (already covered)

### `previews/settings.html` ➕ expand

**What it is:** Main settings page.

**Fixes required:**
1. **Cancel subscription row** — routes to `cancel.html`. Verified.
2. **Coach tone row** — shows current tone, "FROM QUIZ" badge if last source. Verified.
3. **Notifications row** — shows current checkin times. Verified.
4. **Refer a friend row** — routes to `referral.html`. Verified.

**Additions required:**
1. **Witness section** — new section with toggles for Witness, per-pattern mute, window editor.
2. **Permissions section** — readouts of granted/denied permissions with revoke links.
3. **Data export** — "Download your data" — outputs `coreState.exportData()` as JSON file.
4. **Account deletion** — "Delete account" link → confirm flow → wipes localStorage + signs out + revokes server data (if any).
5. **Coach memory** — "What Coach knows about you" → opens a viewer showing Coach's stored profile, editable.
6. **Pact settings** — manage stake limits, default privacy, etc.
7. **Body Receipts settings** — frequency (weekly default), photo storage opt-in/out.

---

### `previews/legal.html` ✅ keep

**What it is:** 3-tab Privacy/Terms/EULA.

**Fixes required:**
1. **TL;DR sections** — verify each tab has a TL;DR.
2. **Update Privacy** to mention Witness, Body Receipts photo storage (local-only by default), Pact escrow.
3. **Update Terms** to mention Pact mechanics, refund policy, age gate (18+).

---

### `previews/legal.html`, `banned.html` ✅ keep

**Fixes required:**
- `banned.html` — verify the appeal flow has a clear contact path.

---

### `previews/feed.html`, `compose.html`, `comments.html`, `notifications.html` — already covered.

---

### `previews/find-friends.html` — already covered.

---

### `previews/widgets.html` 🚧 expand

**What it is:** iOS lock-screen widgets preview.

**Fixes required:**
1. **Widget sizes** — small/medium/large at real sizes (158×158 / 338×158 / 338×354 for iOS 16+). Verify.
2. **Each widget shows real data.** Small: streak count. Medium: streak + Life Score. Large: streak + 5 stats + Coach line of the day.

**Additions required:**
- A 4th widget variant: **The Promise Pin** — a lock-screen pin (iOS 16+ lock-screen widget) showing the typed PROMISE text in tiny mono. Constant reminder.
- A 5th variant: **Pact Status** — shows active Pact day count + partner avatar.

---

### `previews/achievements.html` ✅ keep, minor

**What it is:** 9 unlocked + 3 in-progress + 18 locked + filter chips.

**Fixes required:**
1. **Achievement definitions** — store in a single `achievements.json` referenced by all displaying screens.
2. **In-progress** — show progress bar.

**Additions required:**
- New achievements added by this spec:
  - "Witness Listener" — accept 10 Witness pings.
  - "Promise Reader" — open the Promise Letter 5 times.
  - "First Pact" — complete a Pact (win or lose).
  - "Body Receipt Streak" — 4 weeks of Body Receipts.
  - "Calm Tap" — 10 Calm Library sessions.
  - "The 90 Days" — reach day 90.
  - "The Year" — reach day 365 (the rare one).
  - "Lifetime" — purchase lifetime.
  - "Honest Slip" — log a slip within 5 minutes of it happening (the willing-to-be-honest achievement).
  - "The Recovery" — complete a recovery quest within 10 minutes of a slip.

---

### `previews/activity.html` ✅ keep

**What it is:** XP timeline with day grouping.

**Fixes required:**
1. **Data source** — reads from `coreState.activity[]` (need to add this array). Each entry: `{at, type, amount, source}`. Aggregate events.
2. **Grouping** — by day, then by hour within day.

---

### `previews/scan-food.html`, `scan-body.html`, `scan-outfit.html` 🚧 keep + clarify

**What it is:** AI scan previews.

**Decision per `01_STRATEGY.md`:** Body and outfit scans serve the niche (vape → lung/body recovery). Food scan is tangential. Keep all three but reposition:
- `scan-body.html` → renamed conceptually to "Body Check" — input for Body Receipts.
- `scan-outfit.html` → keep as bonus feature, day 60+ unlock.
- `scan-food.html` → keep, day 30+ unlock.

**Fixes required:**
1. **Camera viewfinder** — fake camera UI is OK for previews. RN port will use real camera.
2. **Result screens** — confirm Coach commentary in result is tone-aware.

---

### `previews/gym.html` ❌ remove or repurpose

**Decision:** Out of scope for v1. Move to `_archive` (delete from previews/, keep in git).

---

### `previews/morning-checkin.html`, `bedtime.html` — already covered.

---

### `previews/assistant.html` ✅ keep, expand

**What it is:** Jarvis voice mode preview.

**Fixes required:**
1. **Breathing orb** — verify animation.
2. **Transcript** — verify scrolling.
3. **Suggested commands** — keep relevant: "Talk me down" / "Start a session" / "What's my streak?" / "Draft a Pact."

**Additions required:**
- Push-to-talk vs always-listening toggle (privacy).
- Visual feedback when listening (the orb pulses faster).
- Hand-off to Coach screen with full transcript on completion.

---

### `previews/coach-tone-test.html` — already covered.

---

### `previews/tone-detail.html` ✅ keep

**What it is:** Per-tone sample conversation.

**Fixes required:**
1. Verify each of 4 tones has its own variant (`?tone=gentle` etc.).
2. "Use this Coach" CTA commits tone + returns to trial. Verified.

---

### `previews/goal-set.html` ✅ keep

**What it is:** Day-30 next-goal picker.

**Fixes required:**
1. Only appears when `days >= 30 && !coreNextGoalPicked`. Verified.
2. Adds picked goal to `coreSelectedHabits`. Verified.

---

### `previews/dev/metrics.html`, `dev/state-mutator.html` 🚧 owner-only

**What it is:** Dev/QA pages. Funnel metrics + state mutator.

**Fixes required:**
1. **`metrics.html`** — verify owner-only gate. Polls `sessionStorage.coreAnalyticsRing` every 2s.
2. **`state-mutator.html`** — file://-only gate. Verify can't be reached on hosted gallery.

**Additions required:**
- `dev/scenarios.html` — one-tap user-state scenarios for QA: "fresh user," "day 7," "day 30 just slipped," "day 60 strong," "trial expired," "subscribed lifetime," "Pact in progress," "Pact won," "Pact lost." Each sets up state and routes to appropriate screen.

---

### `previews/gallery.html` ➕ keep + expand

**What it is:** Owner-only preview gallery + demo-state toolbar.

**Fixes required:**
1. **Passphrase gate** — currently `stone-core-2026`. Stone to choose final passphrase (pending decision per memory).
2. **`?pass=` URL param** — accepts passphrase. Verified strips from history.
3. **Demo presets** — 5 (new user / mid-trial / expired / returning / subscribed). Verify each.

**Additions required:**
- **Sections** in the gallery for new screens (see `03_NEW_FEATURES.md`):
  - Witness setup + ping + history
  - Promise Letter (writing + reading)
  - Pact (invite + active + completion)
  - Body Receipts (start + result + history)
  - Calm Library
  - Shield setup + active screen
- "Owner-only" lock icons on dev/state-mutator.html etc. Verified.
- Live preview iframe (already exists?) — when clicking a card, open full-frame preview.

---

### `previews/u/index.html` ✅ keep

**What it is:** Public read-only profile (`?u=name&days=N&score=N`).

**Fixes required:**
1. Verify no coreState dependency (external surface).
2. CTA "Start my 7-day free trial" → `../index.html`.

---

### `previews/u/` directory ➕ expand

**Additions required:**
- `u/pact.html` — public Pact landing page (`?p=pactId`). Shows the two users + days remaining + stake amount. Spectators can cheer (anonymous tap that pings the participants).

---

### `previews/admin.html`, `moderation.html`, `coin-history.html`, `gift.html`, `shop.html`, `coach-dashboard.html`, `coach-signup.html`, `coach-onboarding.html`, `press-kit.html`, `app-store-screenshots.html`, `landing.html`, `legal.html`, `tutorial.html`, `tiktok-feed.html`, `referral.html`, `testflight-email.html`, `producthunt.html`, `session-prep.html`, `icon-system.html`, `app-icon.html`, `electric-border.css/.js`, `core-*.js/.css`

**Decisions per spec:**

| File | Action |
|---|---|
| `admin.html` | Keep — owner-only admin. |
| `moderation.html` | Keep — back-office triage. |
| `coin-history.html` | Remove — coin economy not part of CORE v1. (Out of scope.) |
| `gift.html` | Repurpose to "Pact gift" — gift a Pact to a friend. |
| `shop.html` | Remove. Out of scope. |
| `coach-dashboard.html` | Keep — B2B coach UI. Expand: add Pact moderation per coach, Body Receipt review tools. |
| `coach-signup.html` | Keep. Update pricing if changed. |
| `coach-onboarding.html` | Keep. |
| `press-kit.html` | Keep. Update screenshots after new features. |
| `app-store-screenshots.html` | Keep. Regenerate after new features. |
| `landing.html` | Keep. Update pricing + add Witness/Pact/Body Receipt mentions. |
| `tutorial.html` | Keep — first-launch spotlight. Update to mention new features unlocked over time. |
| `tiktok-feed.html` | Keep — promo asset. |
| `testflight-email.html` | Keep. |
| `producthunt.html` | Keep — launch asset. |
| `session-prep.html` | Keep — coach B2B asset. Expand. |
| `icon-system.html` | Keep. Reference doc. |
| `app-icon.html` | Keep. 6 variants. |
| `electric-border.css/js` | Keep — used for halo effects. |

---

### `previews/bank-flow-plan.html`, `routine-builder.html`, `deep-onboarding.html`, `ai-setup.html` 🚧 review

**Decisions:**

| File | Action |
|---|---|
| `bank-flow-plan.html` | Out of scope for v1. Remove from gallery. |
| `routine-builder.html` | Keep — useful for bonus habits at day 30+. |
| `deep-onboarding.html` | Already deprecated by trial.html + quiz.html. Remove. |
| `ai-setup.html` | Keep — Witness initial setup. Rename to `witness-setup.html` per naming. |

---

### `previews/assets/` directory

**Audit checks:**
- Open `~/Desktop/lifeos/previews/assets/`. List contents.
- Two largest files (per memory): `dashboard.png` (532K), `ranks.png` (520K) in `assets/screens/`.

**Fixes required:**
1. **Image compression.** Use `imagemin` or `squoosh` to compress all PNGs in `assets/screens/`. Target: each under 200KB. JPEG conversion OK where transparency unneeded.
2. **Asset folder structure.** Reorganize:
   - `assets/icons/` — SVG icons (currently mixed)
   - `assets/screens/` — screen mockups
   - `assets/sounds/` — slip/recovery/milestone audio (new)
   - `assets/avatars/` — avatar set
   - `assets/coach/` — Coach avatar variants per tone

**Additions required:**
- Sound files: slip, recovery, milestone (per tier), panic complete, Pact complete. WAV or AAC. Mute by default in app.
- Coach avatar variants: 4 tones × 4 emotions = 16 SVGs. Stored as one sprite sheet.

---

### `previews/backend/` directory 🚧 review

**What it is:** Backend stubs (memory says 452KB).

**Decisions:**
- Audit each file. Most are stubs.
- Decide which become real (Pact escrow, Witness model server, coach platform server).
- For v1 ship: minimal backend. Stripe via RevenueCat. Pact escrow via Stripe Connect (deferred). Witness fully local.

**Fixes required:**
- Document each backend stub's intent in `backend/README.md`.

---

### `previews/dev/` directory — already covered.

---

### `previews/_redirects`, `netlify.toml`, `PAYMENTS.md`, `BACKEND.md` ✅ keep

**Fixes required:**
- `_redirects` — verify routes. Add new routes for new screens.
- `netlify.toml` — review headers (Content-Security-Policy especially for hosting Coach + Witness without leaks).
- `PAYMENTS.md` — update for new pricing tiers.
- `BACKEND.md` — update for Pact backend (Stripe Connect) plan.

---

## §3. The React Native app (`apps/mobile/`)

The RN app mirrors the HTML previews. Read `04_PAGE_BEHAVIORS.md` for the cross-platform behavior spec. Audit summary:

### `apps/mobile/app/_layout.tsx`, `(auth)/_layout.tsx`, `(tabs)/_layout.tsx` ✅ keep

Routing scaffolds. Verify:
- `(tabs)/_layout.tsx` gates with `<Redirect href="/(auth)" />` if `onboardedAt === null`.
- `<Redirect href="/(auth)/trial-expired" />` if `trialExpired()`.

### `apps/mobile/app/index.tsx` (splash) ✅ keep

Routes to welcome-back, morning-checkin, bedtime, or (tabs) based on state. Mirror of `splash.html`.

### `apps/mobile/app/(auth)/index.tsx` (was welcome.tsx) ✅ keep

Pentagon orbs, taglines, CTA. Mirror of `index.html`.

### `apps/mobile/app/(auth)/trial.tsx` 🚧 expand to mirror HTML

Currently a 5-step flow (`Promise / Name / Tone / Check-in / Trial pitch`). The web HTML is now 9-step with Apple Pay (see drift note above). For this RN file:
- Pricing already aligned to $7.99/mo + $44.99/yr in commit `6e160a7`.
- Promise Letter teaser line added to trial card.
- **Pending:** expand to 9 steps mirroring HTML (Profile / Goal / Blocker / Routine added between Name and Tone). Deferred to a separate session.

### `apps/mobile/app/(auth)/quiz.tsx` 🚧 update

14-step legacy → trim to 9 steps per spec. Add vape-specific section (steps 4-6).

### `apps/mobile/app/(auth)/trial-expired.tsx` ✅ keep

Day-8 lock screen. Mirror. Update pricing.

### `apps/mobile/app/(auth)/welcome-back.tsx` ✅ keep

Mirror of `welcome-back.html`. Reanimated flicker on streak flame.

### `apps/mobile/app/(auth)/onboarding/*.tsx` 🚧

Likely partial. Verify pick-habits, baseline (remove), permissions all present.

### `apps/mobile/app/(tabs)/index.tsx` ✅ keep, extensive expand

Dashboard. Mirror of `dashboard.html`. **All fixes from dashboard.html audit apply here too.**

### `apps/mobile/app/(tabs)/habits.tsx`, `profile.tsx` ✅ keep

Both built per memory. Verify they read from `useGameStateStore`.

### `apps/mobile/app/(tabs)/*` — fill in any missing tabs

Per tab bar: Home / Feed / Coach / Ranks / You. Verify each tab has a file. Build missing.

### `apps/mobile/lib/stats/stat-engine.ts` ✅ keep

Pure derivation engine. Verify formula:
```
value = baseline + 0.7×primary + 0.3×secondary − slipsLost + recovered − decay
```

### `apps/mobile/stores/*.ts` ✅ keep, expand

- `auth-store.ts` — verify `trialDay()` selector, all trial fields.
- `habits-store.ts` — verify slip/freeze logic.
- `stats-store.ts` — verify `computeNow()`, `snapshotToday()`.
- `game-state-store.ts` — mirror of `core-state.js`. **Verify schema v2 migration matches.**

### `apps/mobile/lib/notifications.ts` ✅ keep, expand

`scheduleCheckinsFromTrial(trial)`. Add: Witness ping scheduling, Pact reminders, Body Receipt prompts.

### `apps/mobile/lib/analytics.ts` ✅ keep, mirror

Add all new analytics events from §0 above.

### `apps/mobile/components/dev/DemoStateBar.tsx` ✅ keep

Owner-only dev overlay.

### `apps/mobile/constants/{modules, stats}.ts` ✅ keep, expand

- `modules.ts` — 14 legacy → 5 stats with primary+secondary weights.
- `stats.ts` — Stat type with names + 3-word taglines.

---

## §4. The web/landing site (`web/landing/`)

### `web/landing/index.html` ➕ keep + expand

**What it is:** Public marketing site.

**Fixes required:**
1. **Pricing update** — new tiers.
2. **iOS Safari detection** — verify the TestFlight handoff for iOS users.
3. **Feature section** — add Witness, Pacts, Body Receipts, Promise Letter mentions.

**Additions required:**
- A "How it works" section with the 5 wedges visualized.
- A "Why not Reload or Lock In?" comparison table (deliberate, named — confidence).
- Email capture for non-iOS users → `waitlist.html` flow.
- Press kit link → `previews/press-kit.html`.
- Coach platform CTA → `previews/coach-signup.html`.

---

## §5. The docs (`docs/`)

These exist per memory. Verify and update:

- `docs/REVENUE_STRATEGY.md` — update pricing.
- `docs/TIKTOK_PLAYBOOK.md` — 10 launch scripts. Update to mention Witness/Pacts/Body Receipts as hooks.
- `docs/TIKTOK_STORYBOARDS.md` — frame-by-frame first 3 videos.
- `docs/COACH_OUTREACH.md` — DM templates A/B/C + email D.
- `docs/APP_STORE_LISTING.md` — ASO copy + keywords. Update for new features.
- `docs/MVP_30_DAY_PLAN.md` — day-by-day RN build to TestFlight. Update with new feature day-by-day.
- `docs/REDDIT_LAUNCH.md` — mod outreach + launch post.
- `docs/TIKTOK_CALENDAR.md` — 30-day daily schedule.
- `docs/COMPETITOR_TEARDOWN.md` — **update with Reload and The Lock In full teardown.**
- `docs/COACH_DASHBOARD_SPEC.md` — B2B spec.
- `docs/MODULE_MAPPING.md` — 14 legacy modules → 5 stats.

**Additions required:**
- `docs/WITNESS_SPEC.md` — full spec for the Witness feature including pattern matching algorithm.
- `docs/PACT_SPEC.md` — Pact mechanics including legal review (money handling, age, jurisdictions).
- `docs/PROMISE_LETTER_SPEC.md` — generation algorithm + storage + delivery scheduling.
- `docs/BODY_RECEIPTS_SPEC.md` — weekly cadence, data fields, privacy.
- `docs/CALM_LIBRARY_SPEC.md` — content generation + voicing approach.

---

## §6. The `_to-bin/` and `_archive/`

These are Stone's manual review pile. **Do not touch these.** They're not part of the spec.

---

## §7. End-of-section verification

After completing all audits + fixes in this file:

1. Run `find ~/Desktop/lifeos/previews -name "*.html" | wc -l` — count should be approximately 91 (some removed, some added).
2. Open `gallery.html` — every card should open without errors.
3. Walk the new user flow from `index.html` → `trial.html` → `quiz.html` → `dashboard.html`. Time it. Should be under 4 minutes.
4. Walk the slip flow on `habit.html#vape` → `slip-confirm.html` → `recovery-quest.html`. Verify state updates.
5. Open `dev/metrics.html` — verify analytics ring has populated with events.
6. Open DevTools console on dashboard: `coreState.read().version === 2`.
7. Resize from 1440px to 320px viewport. No overflow anywhere.

Commit. Next file: `03_NEW_FEATURES.md`.
