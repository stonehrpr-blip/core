# 04 — PAGE BEHAVIORS

> Read `00`–`03` first.

This file is the **per-page behavior spec** — what every page does on load, during use, on transitions, on errors. When Claude implements or fixes a page, this is the **source of truth for that page's behavior.** If a behavior is missing here, it's not in scope. If a behavior conflicts with HTML preview, the spec wins.

Pages are grouped by user flow phase. Within each, the behavior spec follows a fixed template:

1. **On load** — what initializes
2. **State subscription** — what coreState changes redraw
3. **Interactions** — every tap, swipe, hold the page responds to
4. **Transitions out** — routing rules
5. **Empty state** — what shows when no data
6. **Error state** — what shows when something breaks
7. **Accessibility** — ARIA, focus order, voiceover labels
8. **Analytics** — events fired
9. **Animations** — entry, idle, exit motion
10. **Edge cases** — uncommon behaviors

---

## §1. Splash (`splash.html` / `app/index.tsx`)

### On load

1. Read `coreState.onboardComplete`, `coreState.lastSeenAt`, `coreState.trial`, `coreState.subscriptionActive`, `coreState.crisisMode`.
2. Start 1.6-second animation immediately (no waiting on data).
3. After 1.6s, compute routing and `router.replace()`.

### State subscription

None — splash is fire-and-forget. State read once on init.

### Interactions

- Tap anywhere during animation → routes immediately (skip animation).
- Long-press dot (owner Easter egg) → opens `dev/scenarios.html` if on file:// origin.

### Transitions out

Routing logic, in order:
1. If `crisisMode.active` → `crisis.html`.
2. If not `onboardComplete` → `index.html`.
3. If `lastSeenAt` is null OR more than 30 days ago → `welcome-back-long.html`.
4. If `lastSeenAt` 3-29 days ago → `welcome-back.html`.
5. If hour < 11 AND `trial.checkin` includes 'morning' AND no morning entry today → `morning-checkin.html`.
6. If hour > 20.5 AND no bedtime entry today → `bedtime.html`.
7. If `trial.day === 4 || 5` AND `coreSocialProofSeen` not set → `social-proof.html`. Set flag.
8. If `trialExpired()` AND NOT `subscriptionActive` → `trial-expired.html`.
9. Default → `dashboard.html`.

### Empty state

N/A — splash always has at minimum the brand wordmark.

### Error state

If routing throws (corrupted state), fall back to `index.html` and fire `error_splash_routing_failed`.

### Accessibility

- `aria-label="Core. Loading."` on container.
- Screen reader users skip animation immediately (announce "Loading Core" once, route).
- Reduce motion: animation collapses to 200ms fade.

### Analytics

- `splash_viewed`
- `splash_routed_to {target}` (after routing computed)
- `splash_skipped` (if user tapped during animation)

### Animations

- Pulsing dot in center: 1Hz scale 1.0 → 1.15.
- 3 expanding rings: stagger 0.2s, fade-out at 1.1s.
- Wordmark "CORE" reveals at 0.8s with character-by-character fade.

### Edge cases

- **Animations stutter on low-end device:** the routing fires regardless after 1.6s. No animation should block routing.
- **State corrupted (JSON.parse fails):** wrap reads in try/catch, treat as new user, route to `index.html`.

---

## §2. Index / Welcome (`index.html` / `app/(auth)/index.tsx`)

### On load

1. Read `coreOnboardTrial.name` (if any) for "Welcome back, [name]" variant copy.
2. Render pentagon orb layout with stat tagings.
3. Start orb pulse animations (different per stat).
4. Render top bar (person icon, brand mark, spacer).
5. Render alt-row CTAs (sign in, walkthrough).

### State subscription

None during display. Static for this view.

### Interactions

- Tap **"Start my 7-day free trial"** CTA → `trial.html`. Analytics: `index_cta_tapped {cta: 'start_trial'}`.
- Tap **"I have an account"** → `sign-in.html`.
- Tap **"See it first"** → `walkthrough.html`.
- Tap person icon (top right) → `sign-in.html`.
- Tap brand mark → no-op (could open About on long-press v2).
- Long-press anywhere (owner Easter egg) → `gallery.html` with passphrase auto-fill (file:// only).
- Each orb is tappable → opens `tone-detail.html?stat=X` (a peek at what that stat means).

### Transitions out

- All CTA-driven. No auto-redirect.

### Empty state

N/A.

### Error state

If page assets fail to load (CSS), fall back to plain HTML with primary CTA visible.

### Accessibility

- Each orb has aria-label: "Brain. Clarity, calm, focus."
- Pentagon ordering is left-to-right top-to-bottom in screen reader order.
- CTAs have aria-labels matching display copy.
- Keyboard nav: Tab order: Person icon → Brand → CTA → "I have an account" → "See it first" → orbs.

### Analytics

- `index_viewed`
- `index_cta_tapped {cta}`
- `index_orb_tapped {stat}`

### Animations

- Pentagon orbs:
  - Brain (top-left): pulse at 1Hz (cognitive)
  - Lungs (top-right): breathe at 4-4-4-4 (the wedge)
  - Wallet (bottom-left): slow pulse at 0.5Hz (steady wealth)
  - Willpower (bottom-right): firm tick at 1.2Hz with sharp ease (discipline)
  - Body (center): steady glow, no pulse (foundation)
- Constellation lines: fade in 800ms after pentagon stabilizes.
- Stars layer: 15 twinkling stars, randomized.
- Central glow: subtle pulse at 0.3Hz.
- Title gradient: shifts every 5s smoothly.
- Primary CTA: gradient shift animation, infinite.

### Edge cases

- **Viewport < 360px:** orbs shrink to 56px each. Constellation lines hide.
- **Viewport < 320px (rare):** fall back to vertical stat list, no pentagon.
- **`prefers-reduced-motion`:** all pulses disable; orbs static. Title gradient static.

---

## §3. Trial (`trial.html` / `app/(auth)/trial.tsx`)

> **DRIFT NOTE (2026-05-30):** Live HTML is a 9-step flow with Apple Pay sheet, not the 5-step variant described below. See `02_AUDIT.md §1 trial.html` for the current step list. The behaviors below (PROMISE paste-reject, 8s hint, exit-intent, tone-card transitions) all apply but are spread across more steps. RN trial.tsx is still 5-step pending mirror.

This is the highest-stakes screen. Behavior must be flawless.

### On load

1. Read `coreOnboardTrial` (likely empty). Initialize all step states to defaults.
2. Render Step 0 (Promise). Progress dots show 5 dots, 1st active.
3. Auto-focus the Promise input.
4. Start the 8-second hesitation timer for the hint tooltip.

### State subscription

Local component state for steps. Save to `coreOnboardTrial` after each step completion.

### Interactions

#### Step 0 — Promise
- User types into Promise input. Each keystroke checked:
  - Allowed: letters typed individually.
  - Blocked: paste event → preventDefault + toast "Type it. Don't paste."
  - Validation: matches "PROMISE", "I PROMISE", "I DO" (case-sensitive uppercase).
- On match: Promise input transforms to a "signed" state (gold accent), CTA "Next" enables.
- 8s timer: if no characters typed → show hint tooltip "Take your time. This part isn't a test — it's a signature."
- "Next" tap → save `coreOnboardTrial.committed = true` + `coreOnboardTrial.signedAt = Date.now()`. Animate transition to Step 1.
- Analytics: `trial_step_view {step:0}` on enter, `promise_typed`, `promise_hint_shown` if shown, `promise_signed`, `trial_step_complete {step:0}` on Next.

#### Step 1 — Name
- Text input, max 40 chars, no special chars except spaces and hyphens.
- "Next" disables until name has 2+ chars.
- On next: save `name` to coreOnboardTrial.

#### Step 2 — Coach tone
- 4 tone cards (gentle/balanced/direct/drill) in 2x2 grid.
- Each card: title + 2-word vibe tag + "preview ›" link.
- Below: "Not sure? Take the test →" link.
- Tap card → selects (visual highlight). Tap preview link → opens `tone-detail.html?tone=X`. Tap "Take the test" → opens `coach-tone-test.html`.
- "Next" disables until tone selected.

#### Step 3 — Check-in time
- 3 cards: Morning / Evening / Both (marked "Recommended").
- "Recommended" badge on Both lights up after 1.5s (subtle attention).
- Selection saves `checkin` value.
- "Next" disables until selection.

#### Step 3.5 — Permissions preflight (NEW)
- Single screen: "We'll ask for notifications in a sec. Here's why."
- Icon + 1-sentence value.
- "Got it" CTA (no permission yet — that's at end of onboarding).

#### Step 4 — Trial pitch
- Card showing: "7 days. Free. No charge until day 8. Cancel any time."
- New: "On day 7, Coach will write you a letter." (Promise Letter teaser)
- Primary CTA: "Start my 7-day free trial."
- Secondary: "How does this work?" → opens FAQ modal.
- On CTA tap: save `coreOnboardTrial.trialStartedAt = Date.now()`. Fire `trial_started` analytics. Route to `quiz.html`.

#### Cross-cutting
- Back button: works on every step (decrements, doesn't lose data).
- Exit intent (swipe down past top / cursor toward top on desktop): show bottom sheet "Skip your free trial? You'll be charged $7.99/mo immediately when you return." Analytics: `exit_intent_shown`. Choices: "Stay" / "Leave anyway."

### Transitions out

- Step 4 complete → `quiz.html`.
- Exit intent → user choice; "Leave anyway" → `index.html`.

### Empty state

N/A — every step has content.

### Error state

If a step fails to save state (storage full): toast "Something's stuck. Try again." + retry button.

### Accessibility

- Each step's container has `role="region"` + `aria-labelledby` pointing to step title.
- Progress dots have aria-label like "Step 1 of 5."
- Promise input has `aria-required="true"`.
- Tone cards have `role="radio"` and `aria-checked`.

### Analytics (full)

- `trial_viewed`
- `trial_step_view {step}` on each step enter
- `promise_typed` (debounced 500ms)
- `promise_paste_attempted` (rejected)
- `promise_hint_shown`
- `promise_signed`
- `name_entered {length}`
- `coach_tone_test_tapped`
- `coach_tone_selected {tone, viaTest}`
- `tone_preview_tapped {tone}`
- `checkin_time_selected {time}`
- `trial_step_complete {step, durationMs}`
- `trial_back_tapped {fromStep}`
- `exit_intent_shown {atStep}`
- `exit_intent_dismissed`
- `exit_intent_left`
- `trial_started`
- `trial_skipped`

### Animations

- Step transitions: slide left 400ms ease-out.
- Promise input "signed" state: gold flicker + scale 1.02 briefly.
- Tone cards: subtle hover lift (desktop) / press-down (mobile).
- "Recommended" badge attention: 800ms shimmer at 1.5s into step.
- Exit intent bottom sheet: spring up 350ms.

### Edge cases

- **User pastes valid PROMISE:** still rejected — typing required.
- **User has device autocomplete suggesting "PROMISE":** acceptable to tap suggestion. Tab/Enter to commit.
- **User uses a name with emoji:** strip emoji on save. Show inline note "Letters only."
- **Tone test recommends X but user picks Y:** Y wins. Analytics records discrepancy.
- **User force-closes app mid-trial:** state persists per-step. On reopen, returns to last incomplete step.
- **Slow 8-second hint after fast typing:** hint should NOT show if user has typed any chars before 8s.

---

## §4. Quiz (`quiz.html` / `app/(auth)/onboarding/quiz.tsx`)

### On load

1. Read `coreOnboardTrial.name`, `tone` — prefill greeting on step 1.
2. Read `coreQuizAnswers` (if any from previous attempt) — resume from last step.
3. Render Step 1.

### State subscription

Each step writes to `coreQuizAnswers[stepKey]` on Next.

### Interactions per step

(See `02_EXISTING_FILES_AUDIT.md` quiz audit for full 9-step list.)

- Each step: render question, render input(s), Next CTA.
- Multi-select: tap each option to toggle; selected highlighted.
- Slider: drag with haptic ticks at major values.
- Text input: validate per question (e.g., age 18+).
- Vape questions (steps 4-6): record to `vapeProfile` sub-object.

### Final step (Review)

- Show all answers as a summary list.
- "Edit" link per row → jumps back to that step preserving other answers.
- "Looks right" CTA → save `coreOnboardComplete = 1`, route to `dashboard.html`.

### Transitions out

- Step 9 Review complete → `dashboard.html`.
- Step skipped (if Skip allowed) → next step.
- Age < 18 → `pages/age-gate.html` (new) with "Come back when you're 18+" message.

### Empty state

N/A.

### Error state

State save failure → retry toast.

### Accessibility

- Sliders have keyboard support (arrow keys).
- All inputs have proper labels.

### Analytics

- `quiz_step_view {step, key}`
- `quiz_step_complete {step, key, answer}`
- `quiz_answer_edited {step, oldAnswer, newAnswer}`
- `quiz_completed {duration, age, mainGoal}`
- `quiz_abandoned {atStep, duration}` (on app close before completion)

### Animations

- Step transitions: same slide pattern as trial.
- Progress bar: animated fill from previous to new step.

### Edge cases

- **User selects "All-in-one" as goal:** dynamic Q1/Q2 use the "all-in-one" branch (per memory).
- **User enters non-numeric age:** input rejects non-digits.
- **Age 17:** show age gate; user can choose to wait or fake.
- **Vape question step 4 "<1 hour":** Coach later uses this signal — they're in early withdrawal.

---

## §5. Pick-habits (`pick-habits.html` / RN equivalent)

### On load

1. Pre-select "Quit Vaping" with "★ Your focus" pill.
2. Compute streak.days. If >= 30, unlock bonus habits visually.
3. Render list.

### State subscription

Re-render if `coreState.streak.days` changes (rare during this view).

### Interactions

- Tap "Quit Vaping" → no-op (it's fixed).
- Tap bonus habit (pre day-30): toast "Unlocks at day 30 of your streak."
- Tap bonus habit (post day-30): toggles selection.
- Tap "Why only vape at first?" → modal.
- Continue → save `coreSelectedHabits` array (vape always included) + route to `dashboard.html`.

### Transitions out

- Continue → `dashboard.html` (post-spec; bypass baseline).
- Back → `permissions.html`.

### Empty state

N/A — vape always present.

### Accessibility

- Locked habits have `aria-disabled="true"` + tooltip explaining unlock.

### Analytics

- `pick_habits_viewed`
- `pick_habits_attempt_locked {habit}` (tapped pre-day-30)
- `pick_habits_completed {selectedHabits}`

### Animations

- Locked habits at low opacity. Tap → shake briefly.
- Unlocked habits: subtle highlight on selection.

### Edge cases

- **Day 30 reached during view:** subscribe to coreStateChange; on the moment streak ticks to 30, unlock animation plays.

---

## §6. Permissions (`permissions.html`)

### On load

1. Read current permission status (each: granted / denied / not-determined).
2. Render the 5 permission cards with current status.

### State subscription

When permission status changes (system event), re-render the affected card.

### Interactions

- Tap "Allow" → fire native permission prompt. On grant, fire `permissions_granted`. On deny, fire `permissions_denied`. Either way, card updates status.
- Tap "Maybe later" → marks skipped. Can be revisited.
- Tap "Why?" link on each card → modal with longer explanation.

### Transitions out

- All cards addressed (granted, denied, or skipped) → Next CTA enables.
- Next → `dashboard.html`.

### Empty state

N/A.

### Error state

If permission prompt fails (rare): show inline "Try again" link.

### Accessibility

- Each card has clear heading + body + action button structure.

### Analytics

- `permissions_viewed`
- `permissions_card_viewed {permission}`
- `permissions_why_tapped {permission}`
- `permissions_granted {permission}`
- `permissions_denied {permission}`
- `permissions_skipped {permission}`
- `permissions_completed {grantedCount, deniedCount, skippedCount}`

### Animations

- Card status badge: animates from "Asking" → "Granted" / "Denied" with color shift.

### Edge cases

- **Witness permissions cascade:** Screen Time grant → unlocks Witness apps picker. Location grant → unlocks Witness places picker.
- **Permission previously denied (system):** if status is `denied`, "Allow" button reads "Open Settings" and routes to system Settings app.

---

## §7. Dashboard (`dashboard.html` / `app/(tabs)/index.tsx`)

The most important screen in the app. Behavior must be precise.

### On load

1. Run dev gate: if `?preview=1`, set `coreDevBypass=1` (file:// or localhost only).
2. Check `coreOnboardComplete` — if missing AND no bypass, redirect to `index.html`.
3. Read all relevant coreState fields.
4. Compute derived values: `lifeScore`, current rank, today's deltas, trial day, milestone reached, recoverable streak, etc.
5. Check milestone redirect: if a milestone tier just hit (7/14/30/60/100/365) AND `coreMilestoneSeen.{tier}` is unset → set flag + redirect to `streak-celebration.html?days=N`.
6. Read pending bedtime/morning checkin → if applicable, route to those screens (handled by splash; dashboard double-checks).
7. Render layout (see `02_EXISTING_FILES_AUDIT.md` for layout priorities).

### State subscription

Subscribe to `coreStateChange` events. On change:
- Re-compute stats / lifeScore / rank.
- Re-render only the affected components (NOT full re-render).
- Animate value transitions (600ms tween).

### Interactions

Each interactive component on dashboard has its own behavior:

#### Top bar
- Tap greeting → opens `morning-brief.html` or `bedtime.html` based on time-of-day relevance.
- Tap rank chip → `ranks.html`.
- Tap trial pill ("DAY 3/7") → modal: "Day 3 of your free trial. 4 days left. We'll only charge if you choose to continue."
- Tap notification bell → `notifications.html`. Bell shows red dot if unread > 0.
- Tap settings gear → `settings.html`.

#### Witness ping card (if active)
- "Walk me through it" → `coach-during-craving.html`.
- "I'm steady" → dismiss card + `witness_ping_engaged {action: 'dismissed'}`.
- "Not a real pattern" → expand to single-question mute → `witness_pattern_muted`.

#### Restore banner (if streak lost in last 48h)
- "Restore for $0.99" → `restore-streak.html`.
- Dismiss arrow → hide banner this session only.

#### Promise Letter teaser (day 7 / 30 / 60 / 100)
- Tap → `promise-letter.html`. Marks `resurfacedAt` event.

#### Life Score ring
- Tap → `stat.html` (no hash — overview).
- Long-press → reveals "Today's deltas" floating panel.

#### 5 stat cards
- Each card tap → `stat.html#x` (where x is lungs/brain/wallet/willpower/body).
- Trend chip on each: shows green ▲ / red ▼ / amber — / colors based on 24hr deltas.

#### Streak strip
- Tap streak (outer) → `streak-board.html`.
- Tap FREEZE pill (inner) → confirm modal "Use freeze? You have N this week." → `coreState.useFreeze()`.
- Tap "N SLIPS TODAY" amber pill (inner) → `habit.html#vape` (or first habit with today slips).

#### Pact strip (if active)
- Tap any Pact card → `pact-detail.html?id={pactId}`.

#### Today's quest
- Tap → opens the quest screen (varies).
- "Mark done" → +5 XP, hide.

#### Coach line of the day
- Tap → `coach.html` with the line as starter context.

#### Quick actions row (SOS large + Post + Body Receipt + Calm)
- SOS → `panic.html`.
- Post → `compose.html`.
- Body Receipt → `body-receipt.html` (or `body-receipt-history.html` if recent).
- Calm → `calm-library.html`.

#### Achievement teaser
- Tap → `achievements.html`.

#### Body Receipt prompt (weekend)
- Yes → `body-receipt.html`.
- Later → hide for 24 hours.

#### Lifetime offer (day 30 / 90)
- Tap → `lifetime-offer.html`.
- Dismiss → hide; record `lifetime.offeredAt`.

### Transitions out

All driven by interactions above.

Automatic transitions:
- Milestone hit → `streak-celebration.html` (one-time per tier).
- Witness ping (high-confidence) → no redirect; renders as card.

### Empty state

For a brand-new user (day 0), the dashboard:
- Greeting: tone-appropriate first-time copy.
- Life Score: starts at 50.
- All 5 stats: start at 50.
- Streak: 1 day.
- No pacts, no body receipts, no insights.
- Coach line: "First day. Just be here."
- Today's quest: "Tell me one thing about your day." → Coach intro.

### Error state

If coreState fails to load (corrupted):
- Show "Something's stuck. Reset?" with the option to clear state.
- Continue to render header so user can navigate away.

### Accessibility

- Each section has heading hierarchy.
- Stat cards have aria-label including stat value + delta.
- Streak count announced as "Day 14 streak."
- SOS button has aria-label "Crisis SOS. Opens immediate help."

### Analytics

- `dashboard_viewed`
- `dashboard_quickaction {action}`
- `stat_card_tapped {stat}`
- `streak_strip_tapped`
- `freeze_pill_tapped`
- `freeze_confirmed`
- `freeze_cancelled`
- `today_slips_pill_tapped`
- `restore_banner_viewed`
- `restore_banner_dismissed`
- `restore_banner_tapped`
- `witness_ping_viewed`
- `witness_ping_engaged`
- `promise_letter_teaser_viewed`
- `promise_letter_teaser_tapped`
- `lifetime_offer_viewed`
- `lifetime_offer_tapped`
- `lifetime_offer_dismissed`
- `pact_strip_viewed`
- `pact_card_tapped {pactId}`
- `body_receipt_prompt_viewed`
- `body_receipt_prompt_yes`
- `body_receipt_prompt_later`
- `coach_line_tapped`
- `achievement_teaser_tapped`

### Animations

- Initial load: staggered fade-in (top → bottom) over 600ms.
- Stat card value changes: tween 600ms.
- Streak count changes: scale 1.0 → 1.15 → 1.0 (200ms bounce).
- Witness ping arrival: slide down from top 400ms.
- Promise Letter teaser arrival: gold accent shimmer.

### Edge cases

- **User in Crisis mode:** dashboard top adds persistent pill, Coach is muted, Witness disabled. Layout otherwise normal.
- **User in Lockdown:** top bar adds amber chip "Lockdown · Day 4/7." Settings tap shows blocked notice.
- **Trial expired but no subscription:** dashboard auto-redirects to `trial-expired.html`.
- **All stats at 0 (massive slip catastrophe):** Coach replies in Gentle tone regardless of setting; insight card shows reset offer.
- **Streak at 999+:** number formats as "999d" with a small ∞ glyph next to it.

---

## §8. Habit (`habit.html`)

### On load

1. Read URL hash → determine habit (`#vape`, `#doomscroll`, etc.).
2. Read `coreSelectedHabits`. If requested habit not in list AND not unlocked → redirect to dashboard with toast.
3. Render habit-specific theme (avatar, color, particle).
4. Subscribe to coreState.

### State subscription

- Stats: re-render primary stat indicator.
- Streak: re-render habit-specific streak.
- Slips: re-render triggers log.

### Interactions

- **Slip button:** tap → `slip-confirm.html?habit={hash}`.
- **Recent triggers section:** tap any item → opens `slip-detail.html?id=X` (small view of that slip + recovery).
- **Body Receipt mini (vape only):** tap → `body-receipt-history.html`.
- **Witness panel:** tap → `witness-setup.html` to edit.
- **Coach quick-prompt:** tap → opens Coach with habit context preloaded.

### Transitions out

- Slip button → slip-confirm.
- Coach prompt → coach.html.
- Back button → dashboard.

### Empty state

For day 0 of a habit:
- Slip button enabled.
- "Recent triggers" shows "Your triggers will appear here."
- Stat shows baseline value.

### Accessibility

- Slip button has aria-label "Mark a [habit-action]. Hold to confirm."
- Triggers list announced as list.

### Analytics

- `habit_viewed {habit}`
- `habit_slip_button_pressed {habit}`
- `habit_trigger_tapped {triggerId}`
- `habit_body_receipt_mini_tapped`
- `habit_witness_panel_tapped`
- `habit_coach_prompt_tapped`

### Animations

- Habit avatar: subtle breathing animation (e.g., vape avatar puffs).
- Slip button: pulses softly to draw attention if no slip in 24h (gentle reminder it's there).
- Particle theme idle: ambient drift (smoke particles for vape).

### Edge cases

- **Habit unlocked while on this page:** re-render in unlocked state.
- **No slips ever:** "Recent triggers" empty state.

---

## §9. Slip-confirm (`slip-confirm.html`)

### On load

1. Read URL `?habit=` param.
2. Initialize 2-second hold ring at 0.
3. Tone-aware title rendering.
4. If Promise Letter exists, render banner at top.

### State subscription

None during view (decisions made within page state).

### Interactions

- **Hold the "Mark a puff" button:**
  - Touch start → start ring animation + fire `slip_confirm_hold_start`.
  - Hold for full 2s → fire `slip_confirmed` + `coreState.logSlip(habit, {magnitude: 1, triggers: []})` + transition to trigger picker step.
  - Release early → ring resets + fire `slip_confirm_hold_release {duration}`.
- **"I almost did but didn't" link:** open Reflect Panel (5 mood emoji + textarea) → on submit, fire `willpower_win {mood, hasNote}` + grant +8 XP, willpower +2 → return to habit.
- **Promise Letter banner tap:** open letter in modal overlay.

### Trigger picker step (after 2s hold)

- 8 trigger chips: Stress / Boredom / Drinking / After meal / Driving / Phone / Wake-up / Other.
- Multi-select up to 3.
- Optional 1-line "anything else?" text input (max 30 chars).
- "Save" → updates the just-logged slip with metadata. → routes to `recovery-quest.html`.
- "Skip" → routes to `recovery-quest.html` without metadata.

### Transitions out

- Hold complete → trigger picker → `recovery-quest.html`.
- Almost-but-didn't → `habit.html#X` with success toast.
- Cancel/back → `habit.html#X`.

### Empty state

N/A.

### Error state

If slip log fails (storage full): toast + retry. Slip is queued in memory.

### Accessibility

- Hold button: `aria-label="Hold to mark a puff. Two-second hold required."` + role="button" + aria-pressed.

### Analytics

- `slip_confirm_viewed {habit}`
- `slip_confirm_hold_start`
- `slip_confirm_hold_release {duration}`
- `slip_confirmed {habit, magnitude}`
- `slip_almost {mood, hasNote}`
- `slip_trigger_logged {triggers, hasNote}`
- `slip_trigger_skipped`
- `promise_letter_banner_tapped`

### Animations

- Hold ring: stroke-dasharray fills over 2s. Color pulses red as it nears 2s.
- Release early: snap back to 0.
- Hold complete: brief flash + transition.
- Trigger chips: stagger fade-in 100ms each.

### Edge cases

- **User holds for 1.99s:** doesn't count. Ring resets.
- **Multiple slips in rapid succession:** each goes through full flow. No batching.
- **Network issue during slip log:** logs locally first, syncs later.

---

## §10. Recovery-quest (`recovery-quest.html`)

### On load

1. Read most recent slip from `coreState.slips[0]`.
2. Render Step 1 (trigger confirmation).
3. Tone-aware title.

### State subscription

None during view.

### Interactions

- **Step 1 — Triggers confirmation:** show selected triggers from slip-confirm, allow edit.
- **Step 2 — Mood:** 5 emoji.
- **Step 3 — What would have helped:** Coach offers 3 suggestions based on triggers. User picks one or "other."
- **Final CTA:** "Lock in your reset" → grants +25 XP, returns to dashboard with subtle success.

### Transitions out

- Lock in → dashboard with success toast.
- Skip from any step → dashboard with neutral toast (no XP).
- "Talk to Coach" link → coach.html with context.

### Empty state

N/A — only enters from a slip.

### Error state

State failure → retry.

### Accessibility

- Steps numbered.
- Mood emoji have aria-labels (e.g., "Sad", "Steady").

### Analytics

- `recovery_started {slipId}`
- `recovery_step_completed {step}`
- `recovery_completed {duration, hasReflection, suggestion}`
- `recovery_skipped {atStep}`
- `recovery_coach_redirect`

### Animations

- Steps slide left between.
- Mood emoji: select bounces.
- Coach suggestions: typed-in animation.
- Final CTA: gradient shimmer.

### Edge cases

- **User skips immediately:** still counts as recovery_skipped. No XP.

---

## §11. Coach (`coach.html`)

### On load

1. Read `coreOnboardTrial.tone`.
2. Read `coreState.coachConversations[0]` (active conversation).
3. Read insight rules → render insight cards if applicable.
4. Read Witness state for header badge.
5. Render greeting if no recent message.

### State subscription

- `coreStateChange` → re-render insight cards.
- New messages → append + scroll.
- Tone change → update greeting / header.

### Interactions

- **Suggested prompt chips:** tap → fills input AND auto-submits.
- **Type in input:** standard text input.
- **Send button:** sends user message → fires `coach_msg_sent` → Coach response generated (local rules + agentic action proposal).
- **Action cards in Coach messages:** tap → confirmation modal → execute.
- **Voice mode toggle:** tap mic → opens `assistant.html`.
- **Tone switcher chip in header:** tap → switcher modal → select new tone → next message uses new tone.
- **Witness badge in header:** tap → opens Witness settings.
- **Insight card actions:** tap → routes per insight type.

### Transitions out

- Voice mode → `assistant.html`.
- Witness badge → `witness-setup.html`.
- Action card execution → varies (calm-library, etc.).

### Empty state

For first-time Coach view:
- Greeting from Coach.
- 3 suggested prompts: "Tell me about cravings." / "What's a Witness ping?" / "Help me start a session."

### Error state

If response fails (rare for local rules): show "Coach is thinking..." then "Let me try again." with retry button.

### Accessibility

- Chat messages have proper roles (`role="log"` on container; each message is an `article`).
- Auto-scroll respectful (don't yank focus mid-typing).

### Analytics

- `coach_viewed`
- `coach_msg_sent {len, isFollowup}`
- `coach_msg_received {tone, isInsight, isAgentic, hasActionCard}`
- `coach_action_proposed {action}`
- `coach_action_tapped {action}`
- `coach_action_confirmed {action}`
- `coach_action_cancelled {action}`
- `coach_tone_chip_tapped`
- `coach_tone_changed {oldTone, newTone}`
- `coach_voice_mode_tapped`
- `coach_witness_badge_tapped`
- `coach_suggested_prompt_tapped {prompt}`
- `coach_insight_card_viewed {type}`
- `coach_insight_card_tapped {type}`
- `coach_insight_card_dismissed {type}`

### Animations

- Message bubbles: slide up + fade in (400ms).
- "Coach is typing" indicator: 3 dots pulse.
- Action cards: render with subtle blue underline + scale-in.
- Input grows with content.

### Edge cases

- **Conversation too long (>50 msgs):** show "Load earlier" pagination.
- **User offline:** local rules still work. Send queue persists; flush on reconnect.
- **Witness fires during Coach screen:** insight card appears at top, Coach acknowledges.
- **Streak lost during Coach view:** takeover banner appears + first reply switches to recovery copy.

---

## §12. Crisis (`crisis.html`)

### On load

1. Detect locale → set default crisis line region.
2. Render numbered list of crisis lines for region.
3. Render breath ring.
4. Render Coach intro line (Gentle tone forced).

### State subscription

None during view — designed for offline operation.

### Interactions

- **Crisis line tap:** opens phone dialer with number.
- **"Try a 60-second breath"** → starts breath ring (4-7-8 pattern here, more parasympathetic than panic's 4-4-4-4).
- **"Talk to Coach"** → opens Coach in Crisis mode.
- **"Trusted contact"** (if set) → opens phone with contact.
- **"I need to step away"** → activates Crisis mode (24h, see `03_NEW_FEATURES.md` §16).

### Transitions out

- Phone call: leaves app.
- Coach → coach.html.
- Step away → confirms → dashboard with persistent Crisis pill.

### Empty state

N/A.

### Error state

Crisis is a safety screen; must always render. If state fails, fall back to hardcoded crisis lines + 60s breath.

### Accessibility

- All crisis lines prominent and readable.
- Breath ring has text alternative.
- VoiceOver reads lines clearly.

### Analytics

- `crisis_viewed`
- `crisis_line_tapped {region, lineId}`
- `crisis_breath_started`
- `crisis_breath_completed`
- `crisis_coach_tapped`
- `crisis_trusted_contact_tapped`
- `crisis_mode_activated`

### Animations

- Breath ring: 4-7-8 cadence with phase labels.
- Coach line: gentle fade in.
- No celebratory animations.

### Edge cases

- **No network:** crisis lines still callable.
- **Locale unknown:** show US + AU + UK as default fallback.
- **User repeatedly enters Crisis:** Coach adjusts tone, suggests speaking to a professional, surfaces resources more prominently.

---

## §13. Panic (`panic.html`)

### On load

1. Render breath ring at 4-4-4-4.
2. Start 60-second total timer.
3. Show 3 prompts: walk / water / message friend.

### State subscription

None.

### Interactions

- **Breath ring:** breathes 4-4-4-4 with phase labels.
- **Prompts:** tap any → marks done (visual checkmark) + +2 XP each.
- **"I'm okay" exit:** confirmation if duration < 30s ("Are you sure? You've got 30 more seconds.").
- **60s timer ends:** auto-routes to `coach-craving-result.html` with +10 XP, willpower +2.
- **"I'm spiraling" red button (new):** routes immediately to `crisis.html`.

### Transitions out

- 60s complete → `coach-craving-result.html`.
- "I'm okay" exit → dashboard.
- "I'm spiraling" → `crisis.html`.

### Empty state

N/A.

### Error state

State failure → still complete locally.

### Accessibility

- Breath phases announced via aria-live.

### Analytics

- `panic_started`
- `panic_prompt_tapped {prompt}`
- `panic_completed`
- `panic_aborted {duration}`
- `panic_spiraling_tapped`

### Animations

- Breath ring scale: 1.0 ↔ 1.4.
- Phase labels: fade in/out per phase.
- Prompts: checkmark animates.

### Edge cases

- **User backgrounds app mid-panic:** timer continues. On return, picks up where left off.
- **App killed:** state lost (panic is meant to be in-the-moment).

---

## §14. Streak-celebration (`streak-celebration.html`)

### On load

1. Read `?days=` URL param → look up tier in `MILESTONE_TIERS` map.
2. Apply tier-specific copy + colors + XP bonus.
3. Add XP via `coreState.update`.
4. Set `coreMilestoneSeen.{tier} = 1`.
5. Trigger confetti.

### State subscription

None during view.

### Interactions

- **"Post to feed"** → `share-options.html`.
- **"Customize share card"** → `share-card-generator.html` with prefilled.
- **"Just take me home"** → dashboard.
- **Day 7 only — "Open the letter"** → `promise-letter.html`.
- **Day 30+ only — "Pick my next mountain"** (appears if `!coreNextGoalPicked`) → `goal-set.html`.

### Transitions out

- Per CTA.

### Empty state

N/A.

### Accessibility

- Celebration is announced via aria-live polite.
- Confetti has decorative role (not announced).

### Analytics

- `milestone_reached {tier, days}`
- `milestone_celebration_viewed {tier}`
- `milestone_post_tapped {tier}`
- `milestone_share_card_tapped`
- `milestone_home_tapped`
- `milestone_promise_letter_tapped` (day 7)
- `milestone_next_goal_tapped` (day 30+)

### Animations

- Confetti: 60 pieces, 5 colors, 2s burst.
- Spinning conic-gradient aurora rays.
- Number-pop: scale 0 → 1.2 → 1.0 (800ms).
- Day-7 special: gold particles + letter envelope animation.

### Edge cases

- **User reaches multiple tiers in one session (lost streak + rebuilt quickly):** only the highest current tier celebration shows. Lower-tier flags are not re-fired.
- **User dismisses celebration before XP is added:** XP still added in background.

---

## §15. Promise Letter (`promise-letter.html`)

### On load

1. Read `coreState.promiseLetter`.
2. If `generated: false`, this should not be reachable. Show error.
3. Render envelope.
4. Trigger reveal animation.

### State subscription

None during view.

### Interactions

- **Tap envelope to open:** unfolds.
- **Read letter:** scrollable if long.
- **"Close":** folds back. Records `closedAt` + `durationRead`.
- **"Re-read at day 30/60/100" indicator** — shown if past those tiers.

### Transitions out

- Close → dashboard.
- Re-read marker → no action (informational).

### Empty state

If letter not generated → "Your letter unlocks at day 7." with countdown.

### Accessibility

- Letter has reading order: salutation → body → signoff → signature.
- Slow text reveal works with VoiceOver (no race conditions).

### Analytics

- `promise_letter_opened`
- `promise_letter_closed {durationRead, context}`
- `promise_letter_scrolled` (if long enough)

### Animations

- Paper unfold: 1.2s envelope-to-letter.
- Text reveal: paragraph-by-paragraph fade-in (600ms each, staggered).
- Close: 1.2s fold.
- Background subtle gold glow.

### Edge cases

- **First read after day 7:** uses streak-celebration flow.
- **Re-read:** opens directly from dashboard teaser.
- **Letter content empty (state bug):** show error + offer to regenerate (admin only).

---

## §16. Witness setup (`witness-setup.html`)

### On load

1. Read `coreState.witness`.
2. Render explainer (Step 1).

### State subscription

None during setup.

### Interactions

Per `03_NEW_FEATURES.md` §1 user flow — 6 steps:
1. Explainer → Next
2. Permission toggles → Next (triggers iOS permission prompts as needed)
3. Apps multi-select (if Screen Time enabled)
4. Places picker (if Location enabled)
5. Volume slider (whisper/calm/steady)
6. Done → `dashboard.html`

### Transitions out

- Done → dashboard.
- Back → dashboard with no save.

### Empty state

N/A.

### Accessibility

- Each step has clear heading.
- Sliders have keyboard arrow support.

### Analytics

- `witness_setup_viewed`
- `witness_setup_step {step}`
- `witness_app_added {app}`
- `witness_app_removed {app}`
- `witness_place_added`
- `witness_place_removed`
- `witness_volume_set {volume}`
- `witness_setup_completed`

### Animations

- Steps slide.
- Toggles animate state.

### Edge cases

- **Screen Time permission denied:** apps step skipped with notice.
- **Location permission denied:** places step skipped.

---

## §17. Witness ping (`witness-ping.html` — standalone preview)

This is a preview-only page. In production, the ping is a card rendered on dashboard, not a dedicated page.

### On load

Show example ping with three actions visible.

### Interactions

Demonstrate all three actions.

---

## §18. Pact (`pacts.html`, `pact-draft.html`, `pact-invite.html`, `pact-detail.html`, `pact-complete.html`, `pact-failed.html`)

See `03_NEW_FEATURES.md` §3 for flow. Per-screen behavior:

### `pacts.html` — list of all Pacts

- On load: read `coreState.pacts[]`.
- Render Active, Pending, Completed sections.
- Tap Pact → `pact-detail.html?id=X`.
- "+ New Pact" CTA → `pact-draft.html`.

### `pact-draft.html` — 5-step draft flow

- Steps: friend / duration / stake / note / review.
- "Send invitation" → API call → analytics.
- Back/cancel preserves state.

### `pact-invite.html` — receiver view

- Renders inviter profile + Pact terms.
- "Accept" → Stripe charge → analytics.
- "Decline" → analytics + return to feed.

### `pact-detail.html` — active Pact

- Both users' streaks side-by-side.
- "Send cheer" → template picker → fire.
- Pulls real-time partner status (polling or websocket; for v1, polling every 60s when active).

### `pact-complete.html` — win celebration

- Confetti + outcome display.
- "Share win" → share-options.
- Stripe settlement displayed.

### `pact-failed.html` — loss screen

- Tactful copy. No shaming.
- "Try again with a new Pact" CTA.

### Analytics

See `03_NEW_FEATURES.md` §3.

---

## §19. Body Receipt (`body-receipt.html`, `body-receipt-detail.html`, `body-receipt-history.html`)

### `body-receipt.html` — 6-step flow

Per `03_NEW_FEATURES.md` §4 user flow. Each step is a separate component within the page.

- Step 1: welcome screen.
- Step 2: breath-hold timer (separate sub-component).
- Step 3: Apple Health sync (if connected).
- Step 4: optional photo.
- Step 5: 3 reflection questions.
- Step 6: summary screen.

### `body-receipt-detail.html` — view single receipt

- Displays all data for that week + delta from previous.
- Share button.

### `body-receipt-history.html` — full history grid

- 26 weeks max.
- Tap any cell → detail view.

### Analytics

See `03_NEW_FEATURES.md` §4.

---

## §20. Calm Library (`calm-library.html`, `calm-session.html`, `calm-complete.html`)

### `calm-library.html` — main

- 6 trigger buttons.
- Tap → reveal 3 script cards matched to user.
- "Yours" tab → favorites + recent.

### `calm-session.html` — playback

- TTS playback.
- Breathing orb in background.
- Controls: Pause / Restart / Exit.

### `calm-complete.html` — completion

- "+5 XP. Good."
- Favorite button.
- Return to dashboard.

### Analytics

See `03_NEW_FEATURES.md` §5.

---

## §21. Sessions (`session-start.html`, `session-active.html`, `session-complete.html`)

### `session-start.html` — pick + configure

- Per `03_NEW_FEATURES.md` §7 flow.

### `session-active.html` — the during-session screen

- Bare layout. Timer is dominant.
- Controls vary by intensity.

### `session-complete.html` — celebration

- XP earned.
- Return to dashboard.

### Analytics

See `03_NEW_FEATURES.md` §7.

---

## §22. Shield (`shield-setup.html`, `shield-active.html`, `shield-themes.html`, `lockdown.html`)

### `shield-setup.html` — initial flow

- Per `03_NEW_FEATURES.md` §8 flow.

### `shield-active.html` — when blocking is happening

- The user sees this when they try to open a blocked app.
- iOS Screen Time API renders this.

### `shield-themes.html` — theme picker

- 4 themes with previews.

### `lockdown.html` — extreme mode

- Confirmation gate.
- During Lockdown: shows days remaining + emergency exit.

### Analytics

See `03_NEW_FEATURES.md` §8.

---

## §23. Settings (`settings.html`)

### On load

1. Read all relevant settings sections.
2. Render rows with current values.

### State subscription

`coreStateChange` → re-render affected rows.

### Interactions

Each row is tappable. Routes to:
- Account → `account-settings.html` (new)
- Coach tone → quick switcher
- Notifications → `notifications-settings.html`
- Witness → `witness-setup.html`
- Shield → `shield-setup.html` or `shield-settings.html`
- Permissions → `permissions-review.html` (new)
- Body Receipts settings → modal
- Pact settings → modal
- Data export → triggers download
- Coach memory → `coach-memory.html`
- Refer a friend → `referral.html`
- Subscription → manage tier or cancel
- Cancel subscription → `cancel.html`
- Help → support page
- Legal → `legal.html`
- About → version, build info

### Analytics

- `settings_viewed`
- `settings_row_tapped {row}`
- `settings_data_export`
- `settings_account_deletion_initiated`

### Animations

- Smooth row reveal.
- Modal transitions for settings sub-screens.

### Edge cases

- **Lockdown active:** sensitive rows (Shield, Subscription, Account deletion) show locked icon.

---

## §24. Notifications inbox (`notifications.html`)

### On load

1. Read `coreState.notifications[]`.
2. Render reverse-chronological.
3. Mark all viewed.

### State subscription

Re-render if new notification arrives.

### Interactions

- Tap notification → routes per its `target`.
- Swipe left → delete with confirm.
- "Mark all read" → bulk action.

### Empty state

"Quiet for now. Coach will reach when there's reason."

### Accessibility

- List role with proper aria.

### Analytics

- `notifications_viewed`
- `notification_tapped {id, type}`
- `notification_deleted {id, type}`
- `notifications_mark_all_read`

### Edge cases

- **Notification target is a screen that requires permission:** show inline notice.

---

## §25. End-of-file verification

After implementing all behaviors:

1. Walk every page above. Test each interaction.
2. Confirm all analytics fire (check `dev/metrics.html`).
3. Test reduce-motion preference — all pages behave.
4. Test VoiceOver on key flows — onboarding, slip flow, Coach.
5. Test at 320px and 1440px viewports.
6. Resume from background after 5 minutes on each page — no broken state.

Commit. Next file: `05_USER_JOURNEYS.md`.
