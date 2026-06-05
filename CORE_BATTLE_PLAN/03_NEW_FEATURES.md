# 03 — NEW FEATURES

> Read `00_README.md`, `01_STRATEGY.md`, `02_EXISTING_FILES_AUDIT.md` first.

This file is the **deep specification for every new feature added by this plan**. Each feature has:

- **Why** — what user pain it serves + competitive position
- **What** — the feature in one paragraph
- **User flow** — step-by-step interaction
- **Screens** — list of HTML/RN screens to add or modify
- **Data model** — state shape additions
- **Animations + sounds + haptics** — sensory specifics
- **Edge cases** — what could break
- **Analytics** — events fired
- **Verification** — how to confirm it works

The features are numbered. Sections later (`04_PAGE_BEHAVIORS.md`, `06_EXECUTION_PLAN.md`) reference these numbers.

---

## §1. Witness — predictive slip prevention

### Why

Reload and Lock In are **reactive** — you log a slip, they respond. CORE is **predictive** — the Coach watches behavioral patterns and pings BEFORE the slip. This is the strongest differentiator in the AI-coach category. Reviewers consistently say "AI feels generic" about competitor coaches. Witness gives our Coach something to actually *know* about the user.

This is also a **trust feature**. When a Witness ping fires correctly ("Heads up — this is one of your slip windows") and the user really was about to slip, they think *"this thing is watching out for me."* That's the conversion moment for free → paid.

### What

The Coach observes signals about the user's day: time-of-day patterns from past slips, app usage patterns (with Screen Time permission), location patterns (with Location permission, optional), streak-stress patterns (declining stats across days), and self-reported triggers from past slips.

When a pattern matches a known pre-slip configuration **with high confidence**, the Coach sends a calm ping: "Heads up. This is one of your slip windows. Want a 60-second panic flow, or are you already steady?"

The user can:
- **Accept** the help (opens panic.html or a Coach session)
- **Dismiss** ("I'm steady" — neutral, no learning impact)
- **Mark not relevant** ("Not a real pattern for me" — teaches the model to mute this category)

The model is **fully local** for v1. No server. No cloud LLM in the loop. The model is a deterministic rule engine + lightweight pattern matcher. A neural net is v2.

### User flow — initial setup

1. User completes onboarding. On Permissions screen, taps "Set this up" for Witness.
2. Opens `witness-setup.html` (formerly `ai-setup.html`).
3. Step 1: "What's Witness?" — 1-screen explainer with the Coach face. Tone-aware copy.
4. Step 2: "What can it watch?" — 3 toggles (Screen Time / Location / Streak patterns). Streak patterns is always on (no permission needed). Screen Time and Location require iOS permission.
5. Step 3: "Tell me your apps." — only shown if Screen Time enabled. User picks apps that correlate with their slips (vape forums, Reddit, TikTok, Instagram, etc.). Multi-select. Max 8 apps.
6. Step 4: "Tell me your places." — only shown if Location enabled. User pins up to 5 places (petrol station, friend's house, etc.). Each gets a 50m radius.
7. Step 5: "How loud should I be?" — slider: Whisper (1/day max) / Calm (3/day max) / Steady (5/day max). Default: Calm.
8. Final: "All set. I'll watch quietly." → returns to dashboard.

### User flow — a Witness ping

1. Time is 14:23. The user's slip history shows 60% of past slips occurred between 14:00–15:00 on weekdays, and they're currently in a high-usage social-media window (per Screen Time, 12 minutes of Instagram in the last 15 minutes — matches pre-slip pattern from past data).
2. Witness fires confidence score 0.78. Threshold is 0.65 → ping triggers.
3. Local notification: "Coach: this is one of your slip windows. Heads up." (Tone-aware copy.)
4. Tap notification → opens dashboard with Witness ping card at top.
5. Card shows: Coach avatar, tone-aware message, "Why this ping?" link, 3 buttons: "I'm steady" / "Walk me through it" / "Not a real pattern."
6. "Walk me through it" → opens `coach-during-craving.html` or `panic.html`.
7. "I'm steady" → dismisses card. Logs `witness_ping_engaged {action: 'dismissed'}`. No model penalty.
8. "Not a real pattern" → dismisses card + opens a 1-question follow-up: "Which signal was off? Time / Apps / Place / Streak stress." User taps the wrong signal → that signal is muted for 7 days. Logs `witness_pattern_muted`.

### Screens

- `previews/witness-setup.html` (new — replaces `ai-setup.html`)
- `previews/witness-places.html` (new — location pin UI)
- `previews/witness-ping.html` (new — standalone preview for the ping card)
- `previews/witness-history.html` (new — past pings + accuracy)
- Dashboard: add the Witness ping card slot at top
- Settings: add Witness section
- Coach: add Witness toggle badge in header

### Data model

```js
coreState.witness = {
  enabled: false, // master switch
  permissions: {
    screenTime: false,
    location: false,
    streakPatterns: true // always on
  },
  apps: [], // ['instagram', 'tiktok', 'reddit', ...]
  places: [], // [{id, label, lat, lng, radius: 50}, ...]
  volume: 'calm', // whisper / calm / steady
  patterns: {
    timeOfDay: { // learned from past slips
      // { '0-6': 0.02, '6-12': 0.18, '12-18': 0.60, '18-24': 0.20 }
    },
    dayOfWeek: { ... },
    appsBeforeSlip: { // map app -> probability
      'instagram': 0.45,
      'tiktok': 0.32,
      ...
    },
    placesBeforeSlip: { 'place_123': 0.28, ... },
    streakStressIndicators: {
      decliningStats3Days: 0.40, // probability of slip given pattern
      lastSlipWithin48h: 0.55,
      lowSleepLast2Nights: 0.30
    }
  },
  pingHistory: [
    // {at, confidence, signals: [], action: 'engaged'|'dismissed'|'not_relevant', userMood?}
  ],
  dismissedCategories: {
    // { time: until_timestamp, apps: until_timestamp, ... }
  },
  modelVersion: 1
}
```

### The matching algorithm (deterministic, v1)

On every app foreground + every 30-min background tick, compute confidence:

```
confidence = w_time * timeMatch
           + w_day  * dayMatch
           + w_apps * appsMatch
           + w_place * placeMatch
           + w_stress * stressMatch

weights = { time: 0.25, day: 0.10, apps: 0.30, place: 0.15, stress: 0.20 }
```

Where each match is the probability from the learned patterns. Default weights, but users with Screen Time disabled have apps weight = 0 and weights re-normalize.

**Fire ping** if `confidence >= 0.65` AND `pingHistory has no ping in last 3 hours` AND `pingHistory.length < volumeCap_today`.

**Update patterns** on every slip:
- Add slip's hour to `timeOfDay` and Bayesian-update probability (smooth with prior).
- Same for day-of-week.
- For apps: grab last-15-min app usage. Update `appsBeforeSlip` Bayesian.
- For places: grab current location. Update `placesBeforeSlip` Bayesian.
- For stress: compute current stress indicators and update.

**Reset patterns** on user request (Settings → "Reset Witness model"). Confirmation required.

### Animations + sounds + haptics

- Witness ping notification arrival haptic: **soft tap pattern** — long-short-long. Not jarring. Distinct from regular notification.
- Card slide-in: 400ms ease-out from top.
- "Walk me through it" tap: success haptic + immediate transition.
- "Not a real pattern" tap: very subtle confirmation haptic, no sound.
- Sound: none by default. Optional "low chime" in settings.

### Edge cases

- **First 7 days:** patterns are empty. Witness should not fire until at least 3 slips have populated the model. Show a "Witness is learning" banner in settings for the first 7 days.
- **No slips ever:** Witness stays passive. Only the streak-stress signal can fire. Confidence rarely passes threshold without slip data.
- **User changes time zone:** flag patterns by local-time, not UTC. Re-localize on time zone change.
- **User in DND window (11pm–7am):** Witness pings are suppressed even at high confidence. The next morning's check-in includes: "Last night had a high-pattern window at [time]. You held. Logged for memory."
- **Permission revoked mid-session:** if Screen Time / Location is revoked, the corresponding weight drops to 0 immediately. User is informed: "Witness can't watch [X] anymore. Tap to re-enable."
- **User in Crisis mode:** Witness pings are **paused** until crisis mode lifts. Crisis flow has its own logic.

### Analytics

- `witness_enabled {permissions}`
- `witness_disabled`
- `witness_setup_completed`
- `witness_app_added {app}`
- `witness_place_added`
- `witness_ping_fired {confidence, signals, timeOfDay}` (signals = array of which weights contributed)
- `witness_ping_engaged {action, timeToAct}` — action = engaged|dismissed|not_relevant
- `witness_pattern_muted {category, durationDays}`
- `witness_model_reset`

### Verification

1. Set `coreState.slips` to a synthetic dataset of 10 slips clustered around 14:00–15:00 weekdays.
2. Set current time to 14:30 Wednesday. Open dashboard.
3. Confidence should compute to ~0.70+. A Witness ping card should appear.
4. Tap "I'm steady" → card dismisses, analytics event fired.
5. Set current time to 04:00. Witness should NOT ping (DND).
6. Disable Screen Time permission. Re-test → apps weight drops to 0, ping may still fire on time + streak alone.

---

## §2. The Promise Letter — asynchronous self-accountability

### Why

The hardest moment in quitting is 2am on day 38 when nothing feels worth it. The Coach is helpful in real-time, but real-time is sometimes too noisy. The Promise Letter is a **bookmark to your future self.** It's the user's own voice telling them why they started.

Reload's "affirmations" are generic ("you are strong"). The Promise Letter is **specific** — generated from the user's own answers to onboarding, slip patterns, and stated reasons. It's the letter only they could have written.

This is also the **emotional moment** at day 7 that converts trial → paid. Reaching day 7 + receiving a personalized letter from "the version of you that made it to day 365" is a stronger conversion event than a paywall.

### What

On **day 7** of clean streak, the Coach writes the user a letter and stores it. The letter is presented after the streak celebration. It re-surfaces on **day 30, 60, 100**, and **any near-slip** (when Witness fires high-confidence ping OR when slip-confirm hold starts).

The letter is **generated** from the user's data:
- Their name (from trial)
- Their stated reason for quitting (from quiz step 4)
- Their #1 trigger (from quiz step 6)
- Their Coach tone
- A randomly selected "what you might forget" line from a curated bank
- A randomly selected "why this is worth it" line tailored to their goal

The letter is **never AI-generated at runtime** (privacy + latency). It's assembled from a template with the user's data.

The letter is **stored in `coreState.promiseLetter`** as a single object. There is only ever ONE letter per user (the day-7 one). It doesn't change. Reading it on day 60 reads the same words from day 7.

### User flow — generation (day 7)

1. User completes day 7. Splash → routes to `streak-celebration.html?days=7`.
2. Confetti + aurora + +50 XP.
3. After 3.5 seconds, a new card slides up from the bottom: "Coach wrote you a letter."
4. CTA: "Open it."
5. Tap → opens `promise-letter.html` for the first time.
6. The letter unfolds slowly (1.2s reveal animation). User reads.
7. Bottom CTA: "Keep going." → returns to dashboard.
8. Analytics: `promise_letter_written` + `promise_letter_delivered {context: 'day_7'}` + `promise_letter_opened`.

### User flow — re-surface (day 30 / 60 / 100)

1. User reaches day 30. Streak celebration.
2. After celebration, dashboard shows the Promise Letter teaser card: "Re-read your letter."
3. The first time at day 30, an automatic Coach insight card appears below: "Today's the day you re-open the letter. I'll be quiet for a minute."
4. Tap → opens letter. Same words.
5. Bottom CTA differs by re-surface context:
   - Day 30: "I see you."
   - Day 60: "Halfway."
   - Day 100: "You did it."

### User flow — re-surface (near-slip)

1. User taps "Mark a puff" → opens `slip-confirm.html`.
2. **Before** the 2-second hold begins, if a Promise Letter exists, a small banner appears at the top of the slip-confirm screen: "Letter from you, day 7. Read in 30s before deciding."
3. User can tap the banner → opens the letter in modal overlay. No commitment to read fully.
4. Or user can skip the banner and proceed with slip-confirm.
5. Reading the letter does **not** affect the slip outcome. But the banner is a moment of friction that often prevents slips.

### Screens

- `previews/promise-letter.html` (new — the letter view)
- `previews/promise-letter-write.html` (new — internal/transition screen for day 7 only, shown for ~3 seconds while "Coach writes")
- Slot in `streak-celebration.html` for the "Coach wrote you a letter" card
- Banner in `slip-confirm.html` for near-slip resurface
- Banner in `dashboard.html` for day-30/60/100 resurface
- Section in `profile.html` showing the letter

### Data model

```js
coreState.promiseLetter = {
  writtenAt: null, // timestamp when generated
  deliveredAt: null, // timestamp first opened
  resurfacedAt: [], // [{at, context: 'day_30'|'day_60'|...}]
  openedCount: 0,
  body: {
    salutation: '', // "Dear Stone,"
    reason: '', // pulled from quiz answer 4
    trigger: '', // pulled from quiz answer 6
    whatYouMightForget: '', // randomly selected from bank
    whyItsWorthIt: '', // randomly selected, goal-tailored
    signoff: '', // tone-specific
    signature: '' // "— You, on day 7"
  },
  generated: false // becomes true on day 7
}
```

### Letter template (tone: gentle, example)

```
Dear {name},

You started Core because {reason_from_quiz_paraphrased}. I'm writing this from day 7, when it's beginning to feel real.

Here's something you might forget at 2am:

{whatYouMightForget — example: "The reason it's hard isn't because you're weak. It's because vape works. It's a really good drug. You're up against a chemical that was designed to win. The fact that you've made it 7 days is not nothing."}

Here's why it's worth it:

{whyItsWorthIt — example: "You said you wanted to feel like yourself again. You said you wanted to breathe deep without a wheeze. That's not gone. It's coming."}

Your trigger is {trigger}. When that hits later, remember: it's the brain not the body. Wait it out, ride it through, or text Coach. I'll be here.

Keep going.

— You, on day 7
```

### Tone variants

The same letter has 4 variants based on `coreOnboardTrial.tone`. Each tone has a different signoff and small phrasing changes. See `08_COPY_LIBRARY.md` §"Promise Letter Templates" for all four.

- **Gentle:** signoff "Keep going." + signature "— You, on day 7."
- **Balanced:** signoff "Hold the line." + signature "— You, day 7."
- **Direct:** signoff "Don't back down." + signature "— You. Day 7."
- **Drill:** signoff "Stay locked." + signature "— Day 7 You."

### Animations + sounds + haptics

- Letter reveal: paper-unfold animation, 1.2s. SVG-based, looks like an envelope opening into a letter.
- Background subtle gold glow `#E8C77E` at 0.15 opacity behind the letter.
- Reading the letter: no animations beyond a slow text fade-in (paragraph by paragraph, 600ms each, staggered).
- Closing: letter folds back into envelope. 1.2s.
- Sound: optional muted pen-on-paper at letter open (very subtle). Off by default.
- Haptic: gentle confirm when opening. None during reading.

### Edge cases

- **User loses streak before day 7:** no letter generated. Once they get back to day 7 (on a NEW streak), letter generates fresh.
- **User skips letter on day 7:** still considered delivered. Day 30 surfaces normally.
- **User on day 7 but in Witness ping:** letter takes precedence — Witness ping defers to morning.
- **Tone changed mid-app:** letter does NOT regenerate. The letter is from "the day-7 you" — that you had a specific tone. We honor it.
- **User reaches day 365:** a SECOND letter generates — "letter from day 7 → letter from day 365." Same mechanic, new content. (This is the only exception to "one letter ever.")
- **User has lost streak after day 7 and rebuilt:** letter still surfaces at day 30/60/100 of the CURRENT streak, even if total clean days is different. Letter is contextual to current run.

### Analytics

- `promise_letter_written` — fires on day 7
- `promise_letter_delivered {context}` — fires when letter is shown (could be 'day_7', 'day_30', 'day_60', 'day_100', 'near_slip')
- `promise_letter_opened`
- `promise_letter_closed {durationRead, context}`
- `promise_letter_365_written` — special event for the day-365 second letter

### Verification

1. Mock `coreState.streak.days = 7`. Open `streak-celebration.html?days=7`.
2. Should see "Coach wrote you a letter" card after 3.5s.
3. Tap → `promise-letter.html` opens with letter unfolding.
4. Body should contain user's name, quiz answer 4 paraphrase, trigger.
5. Close + reopen. Animation plays again. Content unchanged.
6. Set `streak.days = 30`. Dashboard should show "Re-read your letter" teaser.
7. Set `streak.days = 365`. Should trigger second letter generation.
8. Open `slip-confirm.html` with letter existing — banner appears.

---

## §3. Pacts — friendship as commitment device

### Why

Reload's open community is noise. Lock In's removed Duo mode was a real-time co-focus, which is too high-pressure. Both withdrew from social because social-without-stakes is engagement bait.

Pacts work because **money on the line + a friend watching = the commitment device most quit apps lack**. It mirrors the StickK / Beeminder model but tuned for the vape niche. It also makes CORE inherently viral — you can't Pact alone.

It also addresses a real psychological dynamic: most quit-vape users have at least one friend who also vapes. Pacts let them quit together with structure.

### What

A Pact is:
- Two users mutually commit to a shared challenge (e.g., "14 days clean together")
- Each stakes $5 (held by Stripe Connect, NOT by Core directly)
- If both complete: each gets $5 back + a Pact badge + Coach acknowledgement
- If one slips and the other doesn't: slipper's $5 → completer (minus 10% platform fee)
- If both slip: each gets $4 refund (10% platform fee)
- $1 hardship option available

**Pact rules:**
- Max 3 active Pacts at once
- Pact unlocks at user day 14 (you need your own streak first)
- Invitations expire in 48 hours
- Once accepted, the Pact is locked — no canceling without forfeit
- Pact duration choices: 7 / 14 / 30 days (no longer for v1)
- "Slip" in a Pact is defined as logging a slip via `coreState.logSlip()`. Honest reporting required.
- Both partners can see each other's streak in real-time during the Pact (only)
- Both partners can send each other "cheer" messages (templated, can't be free text in v1 to avoid moderation overhead)

### User flow — drafting a Pact

1. User on day 14+. Dashboard shows "Pacts available" badge in Coach quick actions OR Feed shows "Try a Pact" empty state.
2. Tap → `pact-draft.html`.
3. Step 1: "Who?" — pick a friend (auto-filtered to friends who are eligible: day 14+, no existing Pact with this user).
4. Step 2: "How long?" — 7 / 14 / 30 days.
5. Step 3: "Stake?" — $5 default, $1 hardship option visible. Confirm.
6. Step 4: "Why this Pact?" — optional 1-line note ("Both quitting before vacation").
7. Step 5: Review → "Send invitation."
8. On send: Stripe Connect hold $5 from user. Push notification + in-app inbox to partner.
9. Analytics: `pact_drafted` → `pact_invited {partnerId, stake, duration}`.

### User flow — receiving a Pact invitation

1. Partner receives notification: "[Inviter] invited you to a 14-day Pact. $5 stake. Tap to see."
2. Tap → `pact-invite.html` shows the Pact details + the inviter's profile.
3. Two CTAs: "Accept ($5 stake)" or "Decline."
4. Accept → Stripe charges $5. Both stakes are in escrow. Pact officially starts. Coach sends a tone-aware confirmation to both: "Pact locked. 14 days. You and [partner]. Go."
5. Decline → No charges. Inviter gets a polite notification: "[Partner] passed on the Pact this time."

### User flow — during a Pact

1. Dashboard shows the Pact strip with: partner avatar, day count (e.g., "Day 4/14"), both your statuses (green = clean, red = slipped).
2. Tap the strip → `pact-detail.html` with:
   - Both users' streaks side-by-side
   - "Send cheer" button (templated: "Proud of you" / "I'm here" / "You got this" / "Walk with me?")
   - Pact rules reminder
   - Days remaining count
3. If user slips during a Pact:
   - Normal slip flow runs (slip-confirm.html → recovery-quest.html).
   - **After recovery**, a separate Pact notification: "Your Pact partner [name] will be notified. Do you want to add a note?" — short 1-line message, optional.
   - Partner gets push: "[Inviter] slipped today. They've started recovery."
   - The Pact does NOT auto-fail on a single slip — it depends on the duration and rules (see below).
4. If partner slips, user gets push: "[Partner] slipped today." with the option to send a cheer.

### Pact success/failure rules

A Pact "completes" at the end of duration. Outcomes:

| Your days clean | Partner days clean | Outcome |
|---|---|---|
| Full duration | Full duration | Both win. Each gets $5 back + Pact badge + XP +200. |
| Full duration | < full duration | You win. You get $5 back + your partner's $5 (minus 10% fee = $4.50). Partner gets nothing back, gets a "Pact partner badge" anyway. |
| < full duration | Full duration | You lose. You get nothing back. Partner gets your stake. |
| < full duration | < full duration | Both lose to slip. Each gets $4 refund (90% return). |

**The 90% refund on mutual fail** is intentional — we don't want users to feel scammed when both fail. The 10% covers actual processing.

**Number of slips during a Pact does NOT auto-fail.** The user just needs to reach the end of the duration with their streak intact at that moment. So a user can slip on day 2, recover, build a new mini-streak, and still complete the Pact at day 14 if they're clean on day 14.

**Optional: strict mode.** Each Pact can be marked "strict" at draft time — strict means any single slip during the Pact is a loss. Both partners must agree. Strict Pacts have +25% XP reward.

### Screens

- `previews/pacts.html` (new — list of active + completed)
- `previews/pact-draft.html` (new)
- `previews/pact-invite.html` (new — receiver view)
- `previews/pact-detail.html` (new — during-Pact view)
- `previews/pact-complete.html` (new — completion celebration)
- `previews/pact-failed.html` (new — sad-but-honest outcome)
- `previews/u/pact.html` (new — public Pact spectator landing)
- Slot in `dashboard.html` for Pact strip
- Section in `profile.html` for Pact history
- Section in `feed.html` for active Pacts
- Section in `find-friends.html` for Pact-ready friends

### Data model

```js
coreState.pacts = [
  {
    id: 'pact_a1b2c3',
    partnerId: 'user_xyz',
    partnerName: 'Alex',
    partnerAvatarUrl: '...',
    duration: 14, // days
    startedAt: 1234567890,
    endsAt: 1235567890,
    stake: 5, // dollars
    strict: false,
    note: 'Both quitting before vacation',
    status: 'active', // active | won_both | won_self | lost_self | lost_both | aborted
    cheersSent: [], // {at, template}
    cheersReceived: [],
    yourSlips: [], // slips during pact
    partnerSlips: [], // slips during pact (partner's data, synced from server)
    escrowId: 'stripe_escrow_id'
  }
]
```

### Stripe / RevenueCat integration

For v1 ship:
- **Use Stripe Connect for Pact escrow.** Each Pact creates a held charge. Settlement on Pact completion.
- **CORE never touches the funds.** Stripe is the trusted party. Our backend just instructs Stripe.
- **RevenueCat handles the subscription side** ($7.99/$44.99/$89 tiers). Pacts are NOT a subscription — they're one-time charges per Pact.
- **Backend service required:** a thin Node/serverless endpoint to coordinate Pact lifecycle with Stripe. See `backend/pacts.js` (to be built).

For v1.0 SHIP, if backend isn't ready: ship Pacts with **placeholder $0 stakes** and a "Real-money Pacts coming soon" banner. The mechanic still works socially.

### Animations + sounds + haptics

- Pact strip on dashboard: subtle pulsing border when partner is online (using their `lastSeenAt`).
- Pact invitation arrival: gentle haptic + Coach voice tone notification.
- Pact accept: success haptic + Coach voice + Pact lock-in animation (two streak rings interlock).
- Pact slip notification (partner): warning haptic + subtle red flash on Pact strip.
- Pact completion celebration: special variation of `streak-celebration.html` with money-green accent + dual-user confetti.

### Edge cases

- **Partner deletes account during Pact:** Pact auto-aborts. User gets full refund. Partner badge logged.
- **Stripe charge fails:** Pact does not start. Both users notified. Retry flow available.
- **User in trial expires mid-Pact:** Pact is honored. User can continue using app for Pact features even if other paid features lock. Subscription prompt resurfaces post-Pact.
- **User abuses the system (creates Pacts with sock-puppet accounts to game stakes):** server-side detection — same payment method on both sides = blocked. Same device fingerprint = blocked. Reported to moderation.
- **Pact partner doesn't have CORE installed:** invitation sent via SMS / Email with App Store link. They must install + onboard + accept within 48h.
- **Time zone differences:** Pact day-count uses inviter's time zone for consistency. Both partners see the same "Day X/Y."
- **Pact ends during DND:** completion notification delivered next morning, not at the literal end timestamp.

### Analytics

- `pact_eligible` — fires when user first qualifies (day 14)
- `pact_drafted`
- `pact_invited {partnerId, stake, duration, strict}`
- `pact_invitation_received`
- `pact_accepted {pactId, duration}`
- `pact_declined {pactId}`
- `pact_invitation_expired {pactId}`
- `pact_cheer_sent {pactId, template}`
- `pact_cheer_received {pactId, template}`
- `pact_partner_slipped {pactId}`
- `pact_self_slipped {pactId}`
- `pact_completed {pactId, outcome, yourSlipCount, partnerSlipCount}`
- `pact_aborted {pactId, reason}`
- `pact_escrow_failed {pactId, errorCode}`

### Verification

1. Mock 2 user accounts in dev tools. Both day 15+.
2. User A drafts Pact with User B. 7-day duration, $5.
3. User B accepts. Stripe in test mode simulates dual escrow.
4. User A on day 4 of Pact, slips. User B unaffected.
5. Pact reaches day 7. User A's streak = 3 (broken by day-4 slip, recovered to 3 by day 7). User B's streak = 22 (uninterrupted).
6. Outcome: User B wins. User B gets $5 back + $4.50 = $9.50. User A gets nothing.
7. Verify both users' analytics + state updated correctly.
8. Verify Pact appears in profile history with outcome.

---

## §4. Body Receipts — weekly visible evidence

### Why

Reload's "Recovery Goals" are text-based. Lock In tracks habits but doesn't track *bodies*. CORE's wedge is vape, and vape recovery has a *physical* dimension many people notice: breathing can feel easier, skin and sleep can improve, energy returns. (Frame as subjective, individual experience — never a guaranteed medical outcome.)

Body Receipts are **weekly snapshots of the user's body changing** — a visual report card that proves the work is working. This is what no quit-vape app does in this depth.

Specifically: weekly breath-hold timer + optional Apple Health sync + optional photo + 3-question reflection.

The user can SEE their body change in pixel form: lung-hold time increasing, weight stabilizing, skin clearing. **This is the conversion event at day 30**. Reload doesn't have evidence. We do.

### What

Each Sunday afternoon (default — user can change), a Body Receipt prompt appears on dashboard: "Your week is wrapping up. Quick Body Receipt? [Yes / Later]."

Tap → opens `body-receipt.html`.

Steps:
1. **Welcome:** "This is your weekly receipt. 3 minutes."
2. **Breath hold timer:** "Take a breath. Hold. Tap when you let go." → SVG ring fills as user holds → user taps "Let go" when they exhale. Time recorded.
3. **Apple Health sync (optional):** if connected, auto-pulls last week's data (sleep avg, weight, HRV, mindfulness minutes). User can edit before saving.
4. **Optional photo:** "Quick body shot? (Private. Local-only by default.)" — user can take a photo. Stored as base64 in localStorage (web) / device-only (RN). NEVER uploaded to server without explicit opt-in.
5. **Reflection (3 questions):**
   - "How did this week feel?" — 5 mood emoji
   - "What changed in your body?" — 1-line free text
   - "What's one thing you noticed?" — 1-line free text
6. **Summary screen:** shows the breath-hold time + change from last week, mood trend, photo if taken.
7. CTA: "Save Body Receipt." → stores in `coreState.bodyReceipts[]`.

### User flow — viewing history

1. Profile → "Your evidence" section → horizontal strip of last 4 weeks.
2. Tap any receipt → opens `body-receipt-detail.html` showing all stats for that week + trend lines.
3. From dashboard: tap any receipt thumbnail → also opens detail.

### User flow — sharing (optional)

1. From `body-receipt-detail.html`, tap "Share" → opens `share-options.html` with a Body Receipt card (redacted — no photo, just stats).
2. Channels: iMessage / X / Story / Copy link.
3. Default privacy: no photo, no personally identifying info — just the breath-hold time + delta.

### Screens

- `previews/body-receipt.html` (new — multi-step flow)
- `previews/body-receipt-detail.html` (new — view single receipt)
- `previews/body-receipt-history.html` (new — full history grid)
- `previews/body-receipt-lung-test.html` (new — standalone for the breath-hold step)
- Slot in `dashboard.html` for Body Receipt prompt (Sunday afternoon)
- Section in `profile.html` for "Your evidence"
- Section in `weekly-review.html` for receipt summary
- Section in `settings.html` for Body Receipt preferences (frequency, photo opt-in/out)

### Data model

```js
coreState.bodyReceipts = [
  {
    id: 'br_1234',
    weekOf: '2026-05-25', // ISO date of Sunday
    completedAt: 1234567890,
    lungHoldSeconds: 47, // breath-hold time in seconds
    apple_health: { // null if not connected
      sleepAvgHours: 7.2,
      weightLbs: 165,
      hrvAvg: 52,
      mindfulnessMinutes: 12
    },
    photo: null, // base64 string, or null
    mood: 4, // 1-5
    bodyNote: 'My morning breath felt easier all week.',
    noticeNote: 'No vape cravings on the drive home anymore.',
    delta: { // computed against previous receipt
      lungHoldDelta: +3, // seconds gained
      sleepDelta: +0.5, // hours gained
      weightDelta: -1, // lbs lost
      moodDelta: +1
    }
  }
]

coreState.settings.bodyReceipts = {
  frequency: 'weekly', // weekly | biweekly | off
  defaultDay: 0, // Sunday = 0
  defaultTime: '14:00',
  photoOptIn: false,
  appleHealthSync: false,
  shareIncludeStats: true,
  shareIncludePhoto: false
}
```

### The breath-hold timer

The breath-hold test:
- User reads instruction: "Take a deep breath. Hold. Tap LET GO when you exhale."
- User taps START → timer starts. Big number counts up: 1, 2, 3, ...
- A SVG ring fills as time progresses. Color shifts cyan → blue → red gradient as time extends.
- User taps LET GO → timer stops. Time recorded.
- Comparison shown: "Last week: 44s. This week: 47s. +3s — keep watching this number move."

**Calibration:**
- First receipt: no comparison shown. Just "47 seconds. We'll watch this grow."
- Failure mode: if user taps LET GO under 10s, ask "Did you hold all the way? Try again if not." (No data recorded on first under-10 attempts.)
- Outliers: cap at 180s. Beyond that, ask if user wants to retry — physiologically suspicious.

### Animations + sounds + haptics

- Breath-hold timer: ring fills smoothly. Color transitions every 10s.
- Counter pulses gently with each second.
- LET GO tap: success haptic + brief flash of the final number.
- Delta reveal: number animates from previous value to current. 800ms ease.
- Optional sound: nothing during the hold (too intrusive). Soft chime on completion.
- Photo capture (if used): camera shutter haptic. Image fades in.

### Edge cases

- **User skips multiple weeks:** prompt re-surfaces gently — "Welcome back. Your last Receipt was [X weeks ago]." No shame.
- **Apple Health denied mid-flow:** that step is skipped seamlessly.
- **Photo permission denied:** photo step shows graceful "Photo skipped" state.
- **Storage full (photos):** old photos pruned beyond 26 weeks (6 months).
- **First-ever receipt:** delta computation is skipped; show baseline message instead.
- **User in trial expired:** Body Receipts continue — they're trial-feature-gated only for the photo + Health sync features. Breath-hold + reflection always available.
- **Receipt completed at unusual time:** stored with `weekOf` = nearest Sunday, regardless of actual completion time.

### Analytics

- `body_receipt_prompt_shown`
- `body_receipt_started`
- `body_receipt_lung_test_started`
- `body_receipt_lung_test_completed {seconds, isFirst}`
- `body_receipt_health_synced`
- `body_receipt_photo_taken`
- `body_receipt_photo_skipped`
- `body_receipt_mood_logged {mood}`
- `body_receipt_completed {duration, hasPhoto, hasHealth}`
- `body_receipt_skipped`
- `body_receipt_shared {channel, includePhoto, includeStats}`
- `body_receipt_history_viewed`

### Verification

1. Set `coreState.streak.days = 22` (after first 3 weeks).
2. Mock today as Sunday afternoon.
3. Open dashboard → Body Receipt prompt should appear.
4. Open `body-receipt.html`. Complete all 6 steps.
5. Check `coreState.bodyReceipts[]` should now have 1 entry.
6. Open profile → "Your evidence" should show the receipt.
7. Compute breath-hold delta should be null on first receipt.
8. Take a second receipt next week → delta should compute correctly.
9. Share the receipt → share-options.html opens with stats card.

---

## §5. Calm Library — Coach-voiced custom scripts

### Why

Reload bundles generic "relaxation sounds." Lock In doesn't have anything in this space. CORE's Calm Library is the Coach reading a script *tailored to the user's current trigger*. It's not background music. It's *the Coach's voice telling you the specific thing you need to hear right now*.

This is a **moment-of-craving alternative** to the panic flow. Panic is intense (60s box breath). Calm is softer (90s of Coach voice + breath + gentle imagery).

### What

The Calm Library is a collection of 30+ short scripts (60-120 seconds each), each tagged by:
- **Trigger** — what kind of craving it serves (boredom / stress / loneliness / after-meal / nighttime / driving / post-drink / etc.)
- **Tone** — which Coach tone variant (4 per script)
- **Energy** — calming / grounding / encouraging

When the user opens the Calm Library:
1. Top of screen: "What do you need?" with 6 large buttons (the trigger categories).
2. Tap a trigger → 3 scripts matching that trigger surface, picked by:
   - Coach tone (matches user's setting)
   - Time of day (some scripts are time-aware)
   - Recently played (skip if played in last 24h)
3. User taps a script → starts playback.

Playback:
- Coach's "voice" reads the script (text-to-speech in v1; recorded voice in v2)
- Background: a subtle visual — calm rays / breathing orb / abstract gradient flow
- Optional muted ambient audio in background (nature, hum)
- User can pause / restart / exit any time
- Completion: gentle haptic + "+5 XP" + Coach line: "That's it. Good."

The user can also save favorite scripts. Saved scripts appear in a "Yours" tab.

### Scripts (v1 list — 30 minimum)

Each script is ~90 seconds. Plain text. The TTS / recorded voice reads at a measured pace.

Categories (5 scripts each):
1. **Boredom** — for the "nothing to do" crave
2. **Stress** — for the "everything is too much" crave
3. **Loneliness** — for the "I just want to feel close to something" crave
4. **After-meal** — for the post-eating ritual crave
5. **Nighttime** — for the wind-down crave
6. **Driving** — for the commute crave

Plus 6 special scripts:
- "First night without it" — for users in early days
- "Day 30 reflection" — milestone-specific
- "After a slip" — Recovery alternative
- "Before bed" — pre-sleep wind-down
- "When you can't sleep" — middle-of-night
- "You did it" — for day 365

See `08_COPY_LIBRARY.md` for all 36 scripts in all 4 tones.

### Screens

- `previews/calm-library.html` (new — main library + trigger picker)
- `previews/calm-session.html` (new — playback view)
- `previews/calm-complete.html` (new — completion celebration)
- Slot in dashboard quick actions
- Slot in Coach screen input area
- Section in habit.html for habit-specific calm

### Data model

```js
coreState.calmLibrary = {
  sessions: [
    {
      id: 'calm_1234',
      scriptId: 'boredom_1',
      tone: 'gentle',
      startedAt: 1234567890,
      completedAt: 1235567890,
      durationSec: 90,
      completed: true, // false if aborted
      trigger: 'boredom',
      timeOfDay: 'afternoon'
    }
  ],
  favorites: ['boredom_2', 'nighttime_3'], // script IDs
  totalSessions: 12,
  totalMinutes: 18
}

CALM_SCRIPTS = {
  'boredom_1': {
    category: 'boredom',
    duration: 90,
    tones: {
      gentle: 'You're here because nothing else fit. That's okay. Sometimes the brain just wants something...',
      balanced: '...',
      direct: '...',
      drill: '...'
    },
    visual: 'calm_rays_blue',
    ambient: 'low_hum' // null for none
  },
  ...
}
```

### Playback engine

For v1:
- **Web (preview HTML):** uses Web Speech API (`speechSynthesis`) for TTS. Voice tuned to match Coach.
- **RN (production):** uses `expo-speech` for TTS. Or pre-recorded MP3s if recorded.

Visual layer:
- A breathing orb (similar to panic.html) in the center
- Behind: calm rays in tone-appropriate color
- Bottom: 3 control buttons — Pause / Restart / Exit

### Animations + sounds + haptics

- Open Calm Library: smooth fade-in from dashboard.
- Trigger button tap: ripple effect + scripts cards fade in (staggered, 100ms each).
- Script card tap → playback screen: zoom-in transition, the script's color theme floods the screen.
- During playback: orb breathes in 4-4-4-4 pattern (same as panic) by default; some scripts override with 4-7-8.
- Completion: gentle "soft bell" haptic + Coach line fades in.

### Edge cases

- **TTS not available (no voices loaded):** show text + suggest user enable voice download in iOS settings. Fall back to silent text + breath orb.
- **User exits mid-script:** session logged as `completed: false` with `durationSec` partial. No XP awarded.
- **User plays same script too many times:** suggest others in same trigger.
- **No favorites and no recent plays:** first-time experience shows curated "Start here" set.

### Analytics

- `calm_library_opened`
- `calm_trigger_selected {trigger}`
- `calm_session_started {scriptId, tone, trigger}`
- `calm_session_completed {scriptId, durationSec, trigger}`
- `calm_session_aborted {scriptId, durationSec, trigger}`
- `calm_favorited {scriptId}`
- `calm_unfavorited {scriptId}`

### Verification

1. Open Calm Library from dashboard.
2. Tap "Boredom" → 3 script cards appear.
3. Tap one → playback starts with TTS voice + breathing orb.
4. Exit mid-script → session logged as aborted.
5. Play one to completion → +5 XP, completion screen.
6. Open library again → "Recently played" section shows the completed script.
7. Favorite a script → appears in "Yours" tab.

---

## §6. Agentic Coach — Coach can do things, not just talk

### Why

Lock In's Bob can start timers and create habits. Reload's Miro is a pure chatbot. CORE's Coach must match Lock In and exceed it: Coach can start sessions, draft Pacts, set Witness windows, open the Calm Library, and (with confirmation) execute small actions.

This is the **AI safety preference memory** in action — all agentic actions are confirmation-gated. Coach proposes; user confirms.

### What

Coach replies can include inline action cards. When the user types something like "I'm bored" or "I have a craving," Coach's reply can include:

```
[CARD: Open Calm Library — boredom track]
[CARD: Start a 10-minute focus session]
[CARD: Draft a Pact with someone]
```

Each card is a confirmation tap. The user reads it, taps, and a modal appears: "Open Calm Library now? [Yes / Cancel]." Confirm → action executes.

This is **soft-agentic** — Coach proposes specific actions, user confirms each. Coach never auto-executes.

### Specific agentic actions Coach can offer

1. **Open Calm Library** — with a specific trigger pre-selected
2. **Start a Focus Session** — picks Trenches/Flow/Override (see §7), proposes duration
3. **Draft a Pact** — opens `pact-draft.html` pre-filled with suggested partner (from friends list, sorted by streak compatibility)
4. **Set a Witness window** — for tonight at 8pm, propose a check-in window
5. **Add a Body Receipt reminder** — for this Sunday
6. **Open the Promise Letter** — re-surface manually
7. **Schedule a check-in** — adjust morning/evening times for tomorrow
8. **Mute a Witness pattern** — when user says "you're wrong about X"
9. **Pause Coach for X hours** — when user says "I need quiet"
10. **Set Crisis mode** — when user expresses distress (auto-suggests, requires confirmation)

### User flow — Coach proposes Calm Library

1. User: "I'm bored. Trying not to vape."
2. Coach: "Boredom is a real one. I have a 90-second script for this — Coach voice. Walk in?"
   [CARD: Open Calm Library — boredom · 90s]
   [CARD: Try a 60-second box breath]
   [Text: "Or talk to me — what's the bored feel like today?"]
3. User taps the Calm Library card.
4. Confirmation modal: "Open Calm Library: Boredom · 90s. Now?"
5. User taps "Yes."
6. Calm Library opens, boredom script auto-starts.
7. Analytics: `coach_agentic_action {action: 'calm_library', confirmed: true, trigger: 'boredom'}`.

### User flow — Coach proposes Crisis mode

1. User: "I don't want to be here anymore."
2. Coach: "I'm here. Before we talk more — I want to make sure you're safe."
   [CARD: Open Crisis screen]
   [Text: "If you can, tap that. We can talk after."]
3. User taps Crisis card.
4. **NO confirmation modal for Crisis** — it's the safety case. Goes straight to `crisis.html`.
5. Analytics: `coach_agentic_action {action: 'crisis', confirmed: true}`.

This is the one exception to "user confirms every agentic action" — Crisis mode is a one-tap path because friction is wrong here.

### Implementation — the response router

Coach's response system has two parts:
1. **Text generation** — produces conversational reply (tone-aware, contextual).
2. **Action proposal layer** — looks at the conversation context and proposes 0-3 action cards.

For v1: action proposal is a deterministic rule engine.
- If user says "bored" → propose Calm Library boredom + box breath.
- If user says "craving" / "want to vape" → propose box breath + Calm Library + Pact partner ping (if Pact active).
- If user says "tired" / "can't sleep" → propose Calm Library nighttime + Witness window for tomorrow morning.
- If user says "alone" / "lonely" → propose Find Friends + Pact.
- If user says specific keywords matching crisis intent → propose Crisis (always).

For v2: LLM-based action proposal.

### Screens

- `previews/coach.html` — extend to render action cards inline
- `previews/coach-action-confirm.html` (new — confirmation modal) OR build as inline overlay

### Data model

```js
coreState.coachActions = {
  proposed: [], // history of {at, action, params, confirmed}
  // separate from coachConversations to keep analytics clean
}

const COACH_ACTION_TYPES = {
  CALM_LIBRARY: 'calm_library',
  FOCUS_SESSION: 'focus_session',
  PACT_DRAFT: 'pact_draft',
  WITNESS_WINDOW: 'witness_window',
  BODY_RECEIPT_REMINDER: 'body_receipt_reminder',
  PROMISE_LETTER: 'promise_letter',
  CHECKIN_SCHEDULE: 'checkin_schedule',
  WITNESS_MUTE: 'witness_mute',
  PAUSE_COACH: 'pause_coach',
  CRISIS: 'crisis'
}
```

### Animations + sounds + haptics

- Action card render: types in (like a typed message) with a subtle blue underline.
- Tap action card: scale + glow.
- Confirmation modal: bottom sheet slides up.
- Confirmed action execution: brief haptic + transition to the target screen.

### Edge cases

- **User taps an action that requires a permission they haven't granted (e.g., Witness window without Screen Time):** confirmation modal includes a step to grant permission first.
- **User taps an action that requires Pro tier (e.g., draft Pact while free):** confirmation modal becomes upgrade prompt with the Pact value prop.
- **Multiple actions in queue:** show max 3 action cards per Coach message. If Coach has more, "More options" expands.
- **Crisis-related keywords AND non-crisis text:** Crisis card takes priority and is rendered first.

### Analytics

- `coach_action_proposed {action, context}` — fires when card is rendered
- `coach_action_tapped {action}` — fires when user taps card
- `coach_action_confirmed {action, latencyMs}` — fires when user confirms in modal
- `coach_action_cancelled {action}` — fires when user dismisses confirmation
- `coach_action_executed {action, success}` — fires after execution
- `coach_action_permission_required {action, permission}` — fires when blocked by permissions
- `coach_action_upgrade_required {action}` — fires when blocked by tier

### Verification

1. Open Coach. Type "I'm bored, trying not to vape."
2. Coach should reply with text + action cards (Calm Library + box breath).
3. Tap Calm Library card → confirmation modal.
4. Confirm → Calm Library opens with boredom trigger pre-selected.
5. Type "I don't want to be here anymore." 
6. Coach should propose Crisis card immediately.
7. Tap → routes straight to `crisis.html` (no confirmation).

---

## §7. CORE Sessions — multi-intensity focus sessions

### Why

Lock In has 3 intensity levels (Trenches / Flow State / Override). It's a core feature for their power users. CORE matches and exceeds: 5 intensity levels, with breath ring + Coach support during sessions. Useful for vape recovery because the highest-risk windows often coincide with situations where focus is hard (boredom, post-stress).

### What

A CORE Session is a focused chunk of time the user commits to. During a Session:
- A timer counts down
- A breath ring optionally pulses on-screen
- App blocking (Shield — see §8) can activate per session
- Coach offers contextual help if user opens the app

5 intensity levels:

1. **Whisper** (5-30 min) — soft session. Notifications muted, no app blocking. Breath ring visible. For light focus or rest.
2. **Calm** (15-60 min) — moderate. Notifications muted, can pause without consequence. Breath ring + Coach line of intent.
3. **Steady** (30-120 min) — committed. Notifications muted, pausing requires confirmation. Optional: 1-app whitelist for work.
4. **Locked** (30-180 min) — focused. Shield blocks all non-whitelisted apps. Pausing breaks the session (no XP).
5. **Trenches** (60-180 min) — extreme. Shield blocks everything including Settings. Sessions cannot be paused or ended early. **Confirmation required at start.** 

For each: a clear copy explanation, an estimate of the commitment, and a visual difference (Trenches is the darkest, most serious; Whisper is the gentlest, with more glow).

### User flow — starting a Session

1. User taps "Start a Session" from dashboard or Coach quick action.
2. Opens `session-start.html`.
3. Step 1: Pick intensity (5 cards).
4. Step 2: Pick duration (slider with snap points: 5 / 15 / 30 / 45 / 60 / 90 / 120 / 180).
5. Step 3 (Locked/Trenches only): Pick whitelist apps (optional, max 3).
6. Step 4: "Why this session?" — optional 1-line note ("Deep work on the report").
7. Review → "Start." For Trenches: "Confirm Trenches" requires typed "GO" (mini-contract).
8. Session active screen (`session-active.html`):
   - Big countdown timer
   - Optional breath ring
   - Coach line of the session ("You're 14 minutes in. Steady.")
   - Bottom: depending on intensity, controls (pause / end early).
9. Session ends naturally → success screen → +XP, badge if applicable, return to dashboard.

### Session active screen

The session-active screen is **the only screen the user sees** during the session (for Locked / Trenches). It's intentionally bare:
- Countdown timer (large, center)
- Optional breath ring (toggleable in settings)
- Brief Coach line that updates every 10-15 minutes
- Bottom controls (vary by intensity)
- No notifications
- No other app navigation

### Pausing / ending

| Intensity | Pause | End early |
|---|---|---|
| Whisper | Free | Free |
| Calm | Free (3 max) | Confirmation |
| Steady | Confirmation | Loses 50% XP |
| Locked | Cannot pause | Ends session, no XP |
| Trenches | Cannot pause | Cannot end early; requires user to wait |

### Screens

- `previews/session-start.html` (new)
- `previews/session-active.html` (new — the only-screen-during-session)
- `previews/session-complete.html` (new — celebration)
- `previews/session-history.html` (new — past sessions)
- `previews/session-end-confirm.html` (new — confirmation modal)
- Slot in dashboard for "Start a session" CTA
- Slot in Coach for agentic session start

### Data model

```js
coreState.sessions = [
  {
    id: 'sess_1234',
    intensity: 'steady',
    durationMin: 45,
    startedAt: 1234567890,
    endedAt: 1235567890,
    completed: true,
    pauseCount: 0,
    whitelistedApps: [],
    note: 'Deep work on report',
    xpEarned: 30
  }
]

const SESSION_INTENSITIES = {
  whisper: {
    label: 'Whisper',
    description: 'Soft focus. No blocking.',
    color: '#5BB1FF',
    pauseLimit: Infinity,
    canEndEarly: true,
    xpPerMinute: 0.5,
    minDuration: 5,
    maxDuration: 30
  },
  // ... others
}
```

### Animations + sounds + haptics

- Session start: brief flash + transition to active screen.
- Active timer: subtle pulse on each minute.
- Breath ring: optional, 4-4-4-4 cadence.
- Session complete: confetti + Coach line.
- Pause attempted (Locked/Trenches): warning haptic + Coach line "Trenches don't pause. Take a breath."

### Edge cases

- **User force-closes the app during Trenches:** session does not auto-complete. Reopen the app → session resumes from the elapsed time. If actual elapsed >= duration, session counts as complete with no XP penalty.
- **iOS background time limits:** when app backgrounds, use background fetch + local notification at session end. Persisted across kill.
- **Whitelist app crashes / is uninstalled:** session continues with that app removed from whitelist.
- **User reaches Trenches but doesn't type GO:** session does not start. No state change.

### Analytics

- `session_started {intensity, durationMin}`
- `session_paused {intensity, elapsedMin}`
- `session_resumed {intensity, pauseDurationMin}`
- `session_ended_early {intensity, elapsedMin, xpEarned}`
- `session_completed {intensity, durationMin, xpEarned}`
- `session_app_blocked_attempt {sessionId, app}`

### Verification

1. Tap "Start a session" → session-start.html opens.
2. Pick Steady, 30 min, no whitelist, "Deep work" note. Start.
3. Session-active.html opens with 30:00 countdown.
4. Try to pause → confirmation modal.
5. Complete session → session-complete.html with +15 XP.
6. Check `coreState.sessions[]` has 1 entry.
7. Try Trenches → type "GO" required at confirmation.

---

## §8. CORE Shield — app/website blocking

### Why

Reload's #1 reviewed feature: "Actually blocks the websites you want blocked with no way to turn it off." It's the killer feature for the discipline category. CORE needs a Shield to compete.

Shield is **vape-tinted** — it blocks vape-related sites and apps by default (vape forums, vape shop apps, social media if user flags them). Users can add custom blocklists.

### What

CORE Shield blocks sites and apps via:
- iOS Screen Time API (apps + websites system-wide)
- DNS filtering (websites only; requires VPN-style profile install)
- For v1, **iOS Screen Time API only**. DNS is v2.

Shield modes:
1. **Always-on** — Shield active 24/7. Hard to disable.
2. **Windowed** — Shield active during specified windows (e.g., 9pm-7am).
3. **Session-based** — Shield activates only during CORE Sessions (see §7).
4. **Lockdown** — Shield + cannot be disabled for 7 days. See §9.

Blocklist tiers:
1. **Vape default** — pre-curated list of vape forums, vape shops, etc. Optional toggle.
2. **Social risk** — Instagram, TikTok, Reddit (user-flagged from quiz).
3. **Custom** — user-added apps/sites.

### User flow — initial setup

1. Settings → "CORE Shield" → "Set up Shield."
2. Step 1: "What's Shield?" — explainer. Coach voice.
3. Step 2: Permission request — Screen Time. Show why.
4. Step 3: Mode picker (Always-on / Windowed / Session-based).
5. Step 4: Pick blocklists (Vape default toggle + Social risk toggle + Custom add).
6. Step 5: Pick shield screen theme (Coach face / Streak count / Promise / Black).
7. Step 6: For Lockdown only: "Lockdown for 7 days. You can't turn this off. Type LOCKED to confirm."
8. Activate.

### Custom shield screen

When the user attempts to open a blocked app/site:
- iOS replaces the app/site with the CORE Shield screen.
- Screen shows: theme image + 1-line Coach message + "Tap to learn more" (opens CORE).
- 4 theme options:
  1. **Coach face** — Coach avatar + tone-aware line
  2. **Streak count** — big number with "[N] days. Don't waste it."
  3. **Promise** — the typed PROMISE word in mono font + signature
  4. **Black** — pure black with single small "core" wordmark

### Screens

- `previews/shield-setup.html` (new)
- `previews/shield-active.html` (new — what user sees when blocked)
- `previews/shield-settings.html` (new — manage blocklists, mode)
- `previews/shield-themes.html` (new — pick shield screen)
- `previews/lockdown.html` (new — Lockdown specific UI)
- Settings section for Shield

### Data model

```js
coreState.shield = {
  enabled: false,
  mode: 'session', // always | windowed | session | lockdown
  windows: [], // [{start: '21:00', end: '07:00', days: ['mon','tue',...]}]
  blocklists: {
    vapeDefault: true,
    socialRisk: false,
    custom: [] // [{type: 'app'|'site', id: 'instagram', label: 'Instagram'}]
  },
  shieldTheme: 'coach_face', // coach_face | streak_count | promise | black
  attempts: [], // log of blocked attempts (timestamp, target, mode)
  lockdown: {
    active: false,
    startedAt: null,
    endsAt: null // 7 days from startedAt
  }
}
```

### Lockdown (extreme mode)

Lockdown is CORE's answer to Reload's "Extreme" + Lock In's "Trenches":
- 7-day commitment
- Shield activates Always-on
- Settings access is BLOCKED — user cannot modify Shield or Witness during Lockdown
- Notifications cannot be disabled
- Subscription cannot be canceled during Lockdown
- One emergency exit: typing the literal word "EMERGENCY" 3 times in the typed input (with 30-second cooldown between) → Crisis screen opens. From Crisis screen, an option to abort Lockdown with a "We see you" message.

Lockdown is opt-in only and requires typed "LOCKED" confirmation at start.

### Animations + sounds + haptics

- Shield setup: clean step-by-step flow.
- Shield active (the block screen): theme-specific.
- Lockdown start: a single sharp haptic + Coach line ("Lockdown active. Day 1 of 7.").
- Lockdown day ticker: each day at midnight, gentle Coach line.

### Edge cases

- **User attempts to delete CORE during Lockdown:** iOS allows it (we can't prevent), but on reinstall, Lockdown state is preserved server-side (requires account sync). For pure local v1: Lockdown state is local; reinstall would reset. Note in Lockdown setup: "If you uninstall CORE, Lockdown resets, but we'll know."
- **Permission revoked mid-Lockdown:** Lockdown remains active in state but blocking ineffective. User notified: "Permission revoked. Shield can't block. Reinstate?"
- **System Screen Time API down:** graceful degrade. Coach notifies.
- **Block screen not rendering correctly:** iOS Screen Time API restrictions. Fallback to plain text Shield.

### Analytics

- `shield_enabled {mode, blocklistCount}`
- `shield_disabled`
- `shield_attempt_blocked {target, mode}`
- `shield_attempt_bypass_tried` — user tried to revoke permission
- `lockdown_started {duration}`
- `lockdown_emergency_invoked`
- `lockdown_completed`
- `shield_theme_changed {theme}`

### Verification

1. Setup Shield → Session mode → Vape default + Social risk + custom (TikTok).
2. Start a Locked Session.
3. Attempt to open TikTok → Shield screen appears (Coach face theme).
4. Log a `shield_attempt_blocked` event.
5. Trigger Lockdown → type "LOCKED" → activated.
6. Try to modify Shield settings → blocked.
7. Type "EMERGENCY" 3 times with 30s cooldown → Crisis screen.

---

## §9. Bonus habits — earned over time

### Why

CORE's wedge is vape. But after 30 days clean, the user has bandwidth. Bonus habits are a **reward for the user's commitment**, not a feature dump.

This is also competitive positioning: Reload and Lock In are habit trackers from day 1. CORE *unlocks* habits as you earn them. Earned > given.

### What

Bonus habit slots:
- Day 30: 1 slot unlocks
- Day 90: 1 more slot unlocks (2 total)
- Day 180: unlimited slots

Available bonus habits (curated, vape-adjacent):
1. **Doomscroll** — quit endless scrolling. Tracks via Screen Time.
2. **Spending** — quit impulse buys.
3. **Drinking** — reduce / quit alcohol.
4. **Porn** — quit porn use.
5. **Junk food** — limit junk food.
6. **Weed** — quit cannabis.
7. **Nicotine pouches** — quit pouches.
8. **Phone in bed** — no phone post-9pm.
9. **Sugary drinks** — quit soda.

Each habit:
- Has a primary stat affected
- Has its own slip-confirm + recovery flow
- Has its own habit page
- Has its own particle theme (per memory: vape→smoke, doomscroll→pixelation, spend→falling coins)

### User flow — unlock + add a bonus habit

1. User reaches day 30.
2. Streak celebration includes "Bonus habit slot unlocked" line.
3. Dashboard prompts: "You earned a bonus habit slot. Pick one when you're ready."
4. User taps → `pick-habits.html` opens with the 9 bonus habits available (vape still pinned).
5. User picks 1 → added to `coreState.bonusHabits`.
6. Bonus habit appears as a new card on the dashboard, with its own stat indicator.
7. Coach acknowledges: "Welcome [habit name] to the lineup."

### Screens

- `pick-habits.html` — already exists, extends to show bonus habits when unlocked
- `habit.html` — already universal, handles all habit hashes
- Slot in dashboard for bonus habit cards

### Data model

```js
coreState.bonusHabits = [
  {
    id: 'doomscroll',
    addedAt: 1234567890,
    primaryStat: 'brain',
    secondaryStat: 'willpower',
    slipsThisWeek: 0,
    slipsAllTime: 0,
    color: '#9F8FFF',
    particleTheme: 'pixelation'
  }
]
```

### Verification

1. Set `coreState.streak.days = 30`. Open dashboard.
2. Should see "Bonus habit unlocked" prompt.
3. Open pick-habits.html → 9 bonus habits available.
4. Pick "Doomscroll" → added.
5. Open dashboard → new doomscroll card visible alongside vape.

---

## §10. Expanded ranks — 13 tiers

### Why

Lock In has 14 tiers. CORE has 7. Expansion to 13 (matching parity) + meaningful perks per rank.

### What

Per `01_STRATEGY.md` §1:

| Tier | Name | Day | Perk |
|---|---|---|---|
| 1 | Focus | 0–6 | Starting tier |
| 2 | Spark | 7+ | Unlock Pact invitation |
| 3 | Steady | 14+ | Bonus tone preview week |
| 4 | Flow | 21+ | Body Receipt template variant |
| 5 | Forge | 30+ | Bonus habit slot 1 |
| 6 | Iron | 45+ | Calm Library customization |
| 7 | Edge | 60+ | Public profile option |
| 8 | Crest | 80+ | Veteran badge |
| 9 | Peak | 100+ | 90-day report customization |
| 10 | Summit | 150+ | Bonus habit slot 2 |
| 11 | Apex | 200+ | Tone mixing (70% direct + 30% gentle) |
| 12 | Beyond | 300+ | Pact host mode (multi-person) |
| 13 | Core | 365+ | Lifetime discount ($59 vs $89) |

### Implementation

- `ranks.html` updated visual ladder.
- `rank-detail.html` shows current + next tier with perks.
- `rank-up.html` celebrates each promotion.
- `core-rank-perks.js` exports `RANK_PERKS` map and `currentRank()` / `unlockedPerks()` functions.

### Verification

1. Set days = 7 → rank = Spark, perks include Pact.
2. Set days = 100 → rank = Peak.
3. Set days = 365 → rank = Core, Lifetime discount available.

---

## §11. Lifetime tier — $89 one-time, gated to day 30

### Why

Reload's lifetime is $24-49 (suspicious, possibly desperate). Lock In has no lifetime. CORE's $89 lifetime is premium-priced but gated to day-30 users — meaning every lifetime is a committed user.

### What

- Price: $89 one-time
- Includes: everything in Pro Yearly, forever, no auto-renew
- **Gate:** offered ONLY after 30 days of usage (not necessarily 30 days clean — 30 days of having the account)
- Offered: once on day 30, once on day 90, then available in Settings only (no further prompts)
- Refund: standard 14-day refund window
- Rank "Core" (day 365) unlocks $59 lifetime discount

### Implementation

- `pricing.html` updated with Lifetime row, gated visibility
- `lifetime-offer.html` (new) — the dedicated offer screen
- Settings → "Pro Lifetime" row (always visible after gate)
- Day 30 dashboard slot for first offer
- Day 90 dashboard slot for second offer

### Verification

1. Mock `coreState.accountAge = 30` days. Dashboard shows Lifetime offer.
2. Tap → `lifetime-offer.html` shows $89 + "no more bills, ever" copy.
3. Decline → `lifetime.offeredAt` records timestamp.
4. Set accountAge = 90 → second offer surfaces.
5. Set rank = Core → settings shows $59 discount.

---

## §12. Public profile — opt-in, evidence-led

### Why

Reload's community is open by default. Risky and noisy. CORE's profile is **friends-only by default**; users opt in to public profile only at Edge rank (day 60+).

### What

A public profile shows (with user consent):
- Display name (or anonymized)
- Rank
- Total days clean (only if user opts in)
- 1-line bio
- Public posts (only if user opts in)
- "Send Pact invite" CTA (if user is on CORE)

What it does NOT show:
- Slips
- Stats below 70 (avoids shaming users mid-decline)
- Body Receipts (always private)
- Promise Letter (always private)
- Coach conversations (always private)

### Implementation

- `user-profile.html` already exists; gate by visibility settings.
- `profile-settings.html` (new) — public/friends/private toggles per data type.
- `u/index.html` already exists for public surface.

### Verification

1. Set profile to public. Open `u/?u=stone&days=120`.
2. Should see rank + days + bio. Not slips, stats below 70, or private data.
3. Set profile to friends-only → public URL returns "Private profile."

---

## §13. Coach memory viewer — transparency

### Why

The user should be able to see what Coach knows about them. Trust feature. Neither competitor offers this.

### What

Settings → "What Coach knows" → opens viewer.

Viewer shows:
- The user's name
- Quiz answers (paraphrased)
- Tone preference history
- Witness patterns (top triggers, top times)
- Total slips logged
- Top recoveries

Each item is EDITABLE — user can update an answer if it changed.

### Implementation

- `coach-memory.html` (new)
- Reads from coreState, presents as form
- On save, updates coreState directly

### Verification

1. Open Coach memory viewer.
2. Each field shows current value.
3. Edit "Main goal" → save → coreState updated.
4. Coach uses new value in next conversation.

---

## §14. Data export — own your data

### Why

Trust feature. Required by GDPR + CCPA. Neither competitor surfaces this prominently.

### What

Settings → "Download your data" → produces JSON file with everything CORE knows about the user.

Also: "Delete account" → wipes localStorage + disables sync + sends account deletion request to backend (if any).

### Implementation

- `coreState.exportData()` returns JSON dump
- Triggers browser download with filename `core-data-{date}.json`
- Settings link "Delete account" → 3-step confirmation flow

### Verification

1. Settings → Download data → JSON file downloads.
2. Open JSON → contains all coreState plus history.
3. Settings → Delete account → 3-step confirmation → localStorage cleared on completion.

---

## §15. Welcome back screen evolution

### Why

User returns after 30+ days idle. They've forgotten state. CORE needs to **gently catch them up** without re-onboarding.

### What

`welcome-back.html` already exists for 3+ day idle. Add a new flow for 30+ day idle: `welcome-back-long.html`.

Shows:
- "We saved your spot."
- Your streak as it was when you left
- Your Coach tone as you set it
- Coach line: "I'm still here. Want to pick up?"
- 3 CTAs: "Continue where I left off" / "Fresh start" / "Just checking in"

"Fresh start" → resets streak with confirmation.
"Just checking in" → low-pressure return, no commitment.

### Verification

1. Set `lastSeenAt` 35 days ago.
2. Open splash → routes to `welcome-back-long.html`.
3. Three CTAs work as specified.

---

## §16. Crisis mode — extended

### Why

Existing `crisis.html` is good. Spec adds **Crisis mode** as a system state — when invoked, the app behaves differently for 24 hours:
- Witness disabled
- Notifications suppressed
- Coach tone forced to Gentle (regardless of setting)
- Pact partners notified (with user consent) that user is in crisis
- All gamification (XP, ranks, badges) muted — no celebrations during crisis
- A persistent "Crisis mode · We're here" pill on top of dashboard

### Implementation

- `coreState.crisisMode = { active, startedAt, endsAt, reason }`
- All systems check this flag
- 24-hour auto-expiry, user can extend
- User can exit early via Settings (no shame)

### Verification

1. Open `crisis.html`. Tap "I need to step away."
2. Crisis mode activates. Dashboard shows pill.
3. Witness ping should NOT fire.
4. Notifications NOT sent.
5. Coach reply uses Gentle tone even if user set Direct.
6. 24h later → mode auto-exits.

---

## §17. The 90-day report

### Why

A milestone artifact. Day 90 marks the strongest behavior-change literature threshold. Issuing a Report at day 90 gives the user an **artifact of their work** — share-able, save-able, evidence of who they became.

### What

On day 90, `report-90.html` is generated. Shows:
- "Your first 90 days with Core"
- Streak history (the heatmap)
- Slip count + recovery count
- Stat changes (start → end)
- Top triggers
- Coach tone usage
- Body Receipts highlights (breath-hold trend)
- The Promise Letter from day 7 (read-only)
- Achievements unlocked
- Pacts won
- A Coach-written summary paragraph

Format: PDF download + shareable card.

### Implementation

- `report-90.html` is the viewer
- `report-90-share.html` is the card generator
- PDF via `html2canvas` + `jspdf` in browser
- RN: native share sheet with image export

### Verification

1. Mock streak.days = 90.
2. Open `report-90.html` → all sections populated with real coreState data.
3. Download PDF → contains visible report.
4. Share card → 1290x1290 PNG with summary.

---

## §18. Community guidelines + moderation

### Why

Even with friends-only-default, the public surfaces (open Pacts, public profile posts, public Body Receipts) need moderation.

### What

- `community-guidelines.html` (new) — the public rules
- `moderation.html` already exists — back-office triage
- `report.html` (new) — user-facing report flow with reasons

### Implementation

- Each post gets a "..." menu → "Report" → opens `report.html`
- Report categories: Spam / Harassment / Self-harm content / Off-topic / Other
- Submissions route to moderation queue

### Verification

1. Open any post → tap "..." → Report.
2. Pick category → submit → confirmation.
3. Check moderation queue has new entry.

---

## §19. Onboarding tutorial spotlight — extended

### Why

`tutorial.html` already exists. Extends to spotlight the NEW features the user encounters for the first time.

### What

Spotlights now cover:
1. First-time slip → spotlight slip-confirm flow
2. First Witness ping → spotlight Witness card + dismissal
3. First milestone → spotlight celebration
4. First Pact eligibility → spotlight Pacts feature
5. First Body Receipt prompt → spotlight Body Receipt
6. First Coach action card → spotlight agentic actions

Each spotlight is **one-time only** via localStorage flags.

### Implementation

- Extend `core-tour.js` with new spotlight flows.
- Each spotlight: dimmed background + pulse ring + tooltip + "Got it" CTA.

### Verification

1. First Witness ping → spotlight appears.
2. Tap "Got it" → spotlight clears, flag set.
3. Subsequent Witness pings → no spotlight.

---

## §20. Accessibility

### Why

Reload and Lock In have basic accessibility. CORE goes deeper — vape recovery users include people who are stressed, tired, possibly low-vision in early morning. Accessibility is care.

### What

- VoiceOver labels on every interactive element
- Larger text support up to 200%
- Differentiate without color alone (icons + labels, not color only)
- Reduced motion: all animations slow to 0.01s
- High contrast mode option
- Haptic feedback toggle (some users dislike haptics)
- Sound effects toggle (off by default)
- Color-blind safe palette verified (test with Sim Daltonism)

### Implementation

- Every HTML element gets proper ARIA labels.
- RN: `accessibilityLabel`, `accessibilityRole`, `accessibilityState` on every component.
- Settings → Accessibility section.

### Verification

1. Enable VoiceOver on iOS. Walk through onboarding → every element announced clearly.
2. Set text to 200% → no overflow.
3. Enable reduced motion → animations effectively disabled.
4. Verify with Sim Daltonism plugin → all UI distinguishable in protanopia/deuteranopia/tritanopia.

---

## §21. Internationalization preparation

### Why

Reload has 10 languages. Lock In has 7. CORE has 1 (English). For v1 ship: English only. But code structure must support i18n for v1.1.

### What

- All strings in `08_COPY_LIBRARY.md` are referenced via keys, not literals.
- HTML uses `data-i18n="key.path"` attributes.
- A simple `i18n.js` translates at runtime.
- Default: English.
- v1.1 target: + Spanish, Portuguese.

### Implementation

- `previews/i18n.js` (new) — runtime translator.
- `previews/locales/en.json` — all strings.
- `previews/locales/es.json` (v1.1).
- All hardcoded strings refactored to keys.

### Verification

1. Open any page. Check no hardcoded strings — all via `data-i18n`.
2. Switch locale (placeholder for v1.1) → strings update.

---

## §22. Performance budgets

### Why

CORE must feel premium. Premium = fast.

### What

Per-page performance budgets:
- **First Contentful Paint:** < 1.5s on 4G
- **Time to Interactive:** < 2.5s on 4G
- **Total Page Weight:** < 500KB per HTML preview
- **JavaScript Execution Time:** < 500ms initial
- **Layout Shift (CLS):** < 0.1

For RN:
- **App cold start:** < 2s on iPhone 12+
- **Screen transitions:** < 250ms
- **List rendering:** < 16ms per frame

### Implementation

- Run Lighthouse on every preview HTML.
- Use `web-vitals` library for production telemetry.
- RN: use `react-native-performance` for monitoring.

### Verification

1. Run Lighthouse on dashboard → all green.
2. Open dashboard on mid-range device → < 2.5s TTI.

---

## §23. Testing strategy

### Why

A complex spec deserves verification. We test:
- **Unit:** stat-engine, state migrations, Witness pattern matching
- **Integration:** onboarding flow end-to-end, slip-to-recovery, Pact lifecycle
- **Visual:** screenshot comparisons across viewport sizes
- **Accessibility:** automated WCAG checks

### What

- Vitest for unit tests on logic functions
- Playwright for end-to-end HTML preview flows
- Detox for RN integration tests
- Lighthouse CI for performance budgets
- axe-core for accessibility checks

### Implementation

- Test files alongside source.
- CI: GitHub Actions running all suites on PR.
- Visual regression: screenshots saved to repo, diffed on PR.

### Verification

1. `pnpm test` runs all suites → all green.
2. Open a PR with intentional regression → CI catches it.

---

## §24. Privacy + data handling

### Why

CORE handles sensitive data (slips, Coach conversations, body photos). Must be airtight.

### What

- **Body photos:** local-only by default. Optional iCloud sync (if user opts in to Apple Health connection).
- **Coach conversations:** local + encrypted at rest. Server backup optional.
- **Slip history:** local. Aggregated metrics may sync to server.
- **Witness model:** fully local. No server.
- **Account data:** minimum required for sign-in (email, Apple/Google ID).
- **Pact escrow:** Stripe Connect. CORE never touches funds.

Privacy policy clearly states what's stored where. User can export everything and delete everything.

### Verification

1. Take a Body Receipt photo. Search filesystem for photo → only present in app sandbox.
2. No network requests should fire for Witness operations.
3. Coach conversations stored as encrypted blob.

---

## §25. Failure modes — graceful degrade

### Why

The app must work when things break.

### What

- **No network:** all features work offline (since most are local). Sync resumes when online.
- **Stripe down:** Pact creation queued, retried later. User notified.
- **iOS Screen Time API unavailable (older iOS):** Shield gracefully shows "Shield requires iOS 16+. Use Witness only."
- **No TTS voices:** Calm Library falls back to text + ambient.
- **localStorage quota exceeded:** older slips pruned automatically.

### Verification

1. Turn off network. Open app → works.
2. Stub Stripe API failure. Try to create Pact → graceful error + retry.
3. Disable Screen Time. Shield setup shows degraded mode.

---

## §26. End-of-feature verification

After completing all features:

1. Walk a complete D1 user flow: install → trial → onboarding → first day → slip → recovery → Coach interaction → setting up Witness → setting up Shield.
2. Walk a D7 milestone: streak celebration → Promise Letter generation → reading.
3. Walk a D14 Pact flow: draft → invite → accept → activate → cheer → completion (mocked).
4. Walk a D30 Body Receipt: prompt → flow → completion → history view.
5. Walk a D30 Lifetime offer: appears → decline → re-decline at D90.
6. Open dev/metrics.html → verify analytics events for all new features.
7. Lighthouse all new pages → performance budgets met.

Commit. Next file: `04_PAGE_BEHAVIORS.md`.
