# 06 — EXECUTION PLAN

> Read `00`–`05` first.

This file is the **day-by-day build order**. It's the actual task list Claude executes from. Each day has a deliverable. Each deliverable has a commit. Each commit references the spec section that drove it.

The plan is structured as 6 weeks (30 working days) to TestFlight. After TestFlight, polish + launch sprint adds 2 more weeks.

**Total: 8 weeks (~40 working days) from spec read to public launch.**

Adjust pace based on actual progress — this is a target, not a contract. Honest scoping rules apply (see Stone's feedback preference in CLAUDE.md).

---

## Week 0 — Read + plan (1 day)

### Day 0 — Spec read + setup

**Morning:**
- Read all of `00_README.md` through `10_VERIFICATION.md`.
- Set up a working branch: `git checkout -b core-battle-plan`.
- Open `gallery.html` in browser. Walk all 91 existing previews. Note any that crash or have obvious bugs.
- Create a working notes file `WIP_NOTES.md` at the project root (gitignored) to track personal observations.

**Afternoon:**
- Open `02_EXISTING_FILES_AUDIT.md`. Verify the audit's "fixes required" claims by spot-checking 5 random files. Adjust spec if facts on the ground differ.
- Set up dev environment: ensure pnpm + Node + Expo CLI all current.
- Test the React Native build in a simulator.

**End of day deliverable:** spec fully read. Working branch ready. Dev environment verified.

**No commit.** (Reading isn't a commit.)

---

## Week 1 — Foundation (5 days)

### Day 1 — Shared assets cleanup

Spec sections: `02 §0`.

**Tasks:**
1. Refactor `core-state.js` to schema v2 per spec. Add migration function.
2. Update `analytics.js`: ring buffer to 500, session ID, throttling.
3. Standardize all event names per spec event list.
4. Consolidate color tokens into `core-theme.css`.
5. Update `core-buttons.css` — add `.btn.crisis`, `.btn.pact`, `.btn.coach`. Fix hover on touch.
6. Update `core-responsive.css` — tablet rule, landscape rule, prefers-reduced-motion.

**Commit:** `CORE: foundation — schema v2 + analytics standardization + color tokens`

**Verification:**
- `coreState.read().version === 2`
- All existing `data-core` bindings still work
- Open `dev/metrics.html` → analytics ring populating

---

### Day 2 — Splash + index + sign-in

Spec sections: `02 §1`, `04 §1, §2`.

**Tasks:**
1. Update `splash.html` per spec — routing fallback, pre-load critical assets, 30-day-idle route to `welcome-back-long.html`.
2. Update `index.html` — orb pulse animations per spec (each stat different), "60 seconds to first Coach message" tagline, optional social proof strip behind feature flag.
3. Update `sign-in.html`, `sign-in-email.html`, `sign-in-otp.html` per audit fixes — validation, OTP auto-advance, brand guideline compliance.

**Commit:** `CORE: splash + index + auth flow polish`

**Verification:**
- Splash routes correctly in all scenarios
- Index orbs each have unique pulse character
- Sign-in email validates

---

### Day 3 — Trial flow (PROMISE)

Spec sections: `02 §1 trial.html`, `04 §3`, `05 §1`.

**Tasks:**
1. Refactor `trial.html`. Step 0 PROMISE input rejects paste. Hint tooltip on 8s.
2. Step 1 name input.
3. Step 2 tone cards — shorten descriptions, link to tone-detail.
4. Step 3 check-in time picker with "Recommended" attention.
5. Step 3.5 permissions preflight (NEW).
6. Step 4 trial pitch — Promise Letter teaser line, updated pricing.
7. Exit-intent bottom sheet with updated pricing.
8. All analytics events per spec.
9. RN parallel: update `apps/mobile/app/(auth)/trial.tsx`.

**Commit:** `CORE: trial flow v4 — 5 steps with PROMISE + paste reject + permissions preflight`

**Verification:**
- Paste rejected on PROMISE input
- All 5 steps complete in ~60s
- Analytics ring shows all expected events
- RN screen matches HTML

---

### Day 4 — Quiz (trimmed to 9 steps)

Spec sections: `02 §1 quiz.html`, `04 §4`.

**Tasks:**
1. Trim quiz from 14 to 9 steps per spec.
2. Add vape-specific section (steps 4-6) — last puff / daily count / triggers.
3. Age gate — under 18 routes to "come back when you're ready."
4. Step 8 coaching style preview using `tone-detail.html` sample.
5. Quiz final saves `coreQuizAnswers` + `vapeProfile` + sets `coreOnboardComplete=1`.
6. RN parallel: `apps/mobile/app/(auth)/onboarding/quiz.tsx`.

**Commit:** `CORE: quiz v2 — 9 steps with vape-specific section`

**Verification:**
- Quiz completes in ~3 minutes
- Vape answers stored in `coreState.vapeProfile`
- Age gate works

---

### Day 5 — Permissions + pick-habits

Spec sections: `02 §1`, `04 §5, §6`.

**Tasks:**
1. Update `permissions.html` — 5 cards per spec (Notifications / Screen Time / Location / Health / Contacts).
2. Each card: title, body, value, "Allow" / "Maybe later" / "Why?" actions.
3. Screen Time grant → opens Witness apps picker.
4. Location grant → opens Witness places picker.
5. Update `pick-habits.html` — Quit Vape pre-selected, bonus habits locked pre-day-30, "Why only vape at first?" link.
6. Delete `baseline.html`. Remove all references.
7. RN parallel: update permissions + pick-habits screens.

**Commit:** `CORE: permissions + pick-habits + remove baseline`

**Verification:**
- All 5 permissions cards work
- Locked habits show toast on tap
- baseline.html fully removed (grep search)
- New user flow completes in <4 min total

---

## Week 2 — Main app + Coach (5 days)

### Day 6 — Dashboard (foundation)

Spec sections: `02 §2 dashboard.html`, `04 §7`.

**Tasks:**
1. Refactor `dashboard.html` layout per spec priorities.
2. Add Witness ping card slot at top.
3. Add Promise Letter teaser slot.
4. Add Pact strip below stats.
5. Add Body Receipt prompt (weekend conditional).
6. Add Lifetime offer slot (day 30 / 90 conditional).
7. Add Lockdown chip.
8. Add Coach line of the day.
9. Promote SOS to standalone large button.
10. Update trial day pill to be tappable (modal).
11. Time-of-day greeting variants.
12. Stat card animations on data change.
13. RN parallel: dashboard.

**Commit:** `CORE: dashboard v2 — new slots for Witness/Promise/Pact/Lifetime`

**Verification:**
- All slots hide correctly when not applicable
- Trigger a slip elsewhere — dashboard stats animate down
- Trigger a milestone — celebration redirect
- Resize 1440→320 viewport — no overflow

---

### Day 7 — Habit + slip-confirm + recovery

Spec sections: `02 §2 habit.html, slip-confirm.html, recovery-quest.html`, `04 §8, §9, §10`.

**Tasks:**
1. Update `habit.html` — unlock check, habit-specific copy, Body Receipt mini, Witness panel, triggers log, Coach quick-prompt.
2. Update `slip-confirm.html` — hold ring pulse red near end, "I almost did but didn't" XP bump to +8.
3. Add trigger picker step after slip confirmation.
4. Update `recovery-quest.html` — 3-step flow (triggers / mood / coach suggestions).
5. RN parallel.

**Commit:** `CORE: habit + slip flow v2 — trigger picker + recovery 3-step`

**Verification:**
- Slip flow from start to recovery in <2 min
- Slip metadata includes triggers
- Almost-but-didn't grants +8 XP, willpower +2
- Recovery grants +25 XP

---

### Day 8 — Coach (basic + insight cards)

Spec sections: `02 §2 coach.html`, `04 §11`, plus parts of `03 §6`.

**Tasks:**
1. Update `coach.html` — tone switcher chip, Witness toggle badge, suggested prompts auto-submit, Calm Library button.
2. Implement INSIGHT_RULES system (already partially per memory). Verify rules for: lungs≥80, willpower<30, brain≥85, wallet<40, streak day 6.
3. Each insight card dismissible.
4. Coach conversation persistence to `coreState.coachConversations[]`.
5. Tone-aware greeting based on `coreOnboardTrial.tone`.
6. Streak-broken takeover when `isStreakRecoverable()`.
7. RN parallel.

**Commit:** `CORE: coach v2 — tone switcher + insight cards + suggested prompts auto-submit`

**Verification:**
- All 4 tones render correct greeting
- Insight cards appear per rules
- Suggested prompts auto-submit
- Tone switcher works mid-conversation

---

### Day 9 — Coach agentic actions

Spec sections: `03 §6`.

**Tasks:**
1. Build the action proposal layer in `core-ai.js`.
2. Define COACH_ACTION_TYPES enum.
3. Build action card render in Coach message bubbles.
4. Build confirmation modal for actions (except Crisis).
5. Build execution handlers for each action type.
6. Special case: Crisis intent → no confirmation, direct route.
7. Analytics for proposed/tapped/confirmed/cancelled/executed.

**Commit:** `CORE: coach agentic — 10 action types with confirmation gates`

**Verification:**
- Type "I'm bored" → Coach proposes Calm Library card
- Tap card → confirmation modal → execute → Calm Library opens
- Type crisis intent → Crisis card → no confirmation → routes to `crisis.html`

---

### Day 10 — Calm Library

Spec sections: `03 §5`.

**Tasks:**
1. Build `calm-library.html` — 6 trigger buttons + script picker.
2. Build `calm-session.html` — TTS playback + breathing orb.
3. Build `calm-complete.html` — completion celebration.
4. Define `CALM_SCRIPTS` data with at least 12 scripts in all 4 tones (24 total per category; build out 36 total over time).
5. Web Speech API integration for TTS.
6. Favorites system.
7. Analytics events.

**Commit:** `CORE: calm-library — 12 scripts + TTS playback + favorites`

**Verification:**
- Open Calm Library from Coach action.
- Pick trigger → 3 scripts surface.
- Play one → TTS plays + orb breathes.
- Complete → +5 XP, favorite option.

---

## Week 3 — Differentiating features (5 days)

### Day 11 — Witness setup + permissions

Spec sections: `03 §1`.

**Tasks:**
1. Build `witness-setup.html` — 6-step flow.
2. Build `witness-places.html` — location pin picker.
3. Initialize `coreState.witness` data shape.
4. iOS Screen Time API integration for apps list.
5. iOS Location API integration for places.
6. RN parallel.

**Commit:** `CORE: witness setup — 6-step flow with iOS permission integration`

**Verification:**
- Setup completes in <3 min.
- coreState.witness populated correctly.
- Apps picker only opens if Screen Time granted.

---

### Day 12 — Witness pattern matching + ping

Spec sections: `03 §1`.

**Tasks:**
1. Implement the matching algorithm in `core-ai.js` or new `witness-engine.js`.
2. Pattern learning on slip: Bayesian update of patterns.
3. Background tick (every 30 min when foregrounded) running confidence check.
4. Local notification scheduling for high-confidence pings.
5. Dashboard Witness ping card render.
6. "Walk me through it" / "I'm steady" / "Not a real pattern" actions.
7. Witness ping history page.
8. RN: background fetch + local notif.

**Commit:** `CORE: witness engine — deterministic pattern matching + dashboard ping card`

**Verification:**
- Mock 10 slips at 14:00 weekdays.
- Set time to 14:30 Wednesday.
- Confidence should compute >0.65 → ping fires.
- DND respected at night.

---

### Day 13 — Promise Letter

Spec sections: `03 §2`.

**Tasks:**
1. Build `promise-letter.html` — envelope unfold animation.
2. Build `promise-letter-write.html` — transition screen for day-7 generation.
3. Implement letter template assembler in JS.
4. All 4 tone variants in `08_COPY_LIBRARY.md`.
5. Generate on day 7 first celebration.
6. Re-surface on day 30/60/100 + near-slip (banner in slip-confirm).
7. Store in `coreState.promiseLetter`.
8. Special day-365 second letter.
9. RN parallel.

**Commit:** `CORE: promise-letter — day-7 generation + re-surface system`

**Verification:**
- Mock streak.days=7. Open celebration.
- "Coach wrote you a letter" card appears.
- Letter unfolds and reveals.
- Set streak.days=30. Dashboard shows teaser.
- Open slip-confirm. Banner shows.

---

### Day 14 — Body Receipts

Spec sections: `03 §4`.

**Tasks:**
1. Build `body-receipt.html` — 6-step flow.
2. Build `body-receipt-detail.html` — view single receipt.
3. Build `body-receipt-history.html` — full history grid.
4. Build `body-receipt-lung-test.html` — standalone breath-hold timer.
5. Implement breath-hold timer with ring fill + delta computation.
6. Optional Apple Health sync.
7. Optional photo capture (local-only).
8. Reflection 3 questions.
9. Receipt storage with 26-week cap.
10. Share Body Receipt card (redacted by default).
11. Sunday afternoon prompt on dashboard.
12. RN parallel.

**Commit:** `CORE: body-receipts — weekly evidence with lung test + Health sync`

**Verification:**
- Complete a receipt — saves correctly.
- Second receipt shows delta from first.
- Photo opt-in respected.
- Sunday prompt fires.

---

### Day 15 — Pact system (basic — local mock)

Spec sections: `03 §3`.

**Tasks:**
1. Build `pacts.html`, `pact-draft.html`, `pact-invite.html`, `pact-detail.html`, `pact-complete.html`, `pact-failed.html`.
2. Build `u/pact.html` public spectator landing.
3. For v1.0 SHIP: **use $0 stakes** with "Real-money Pacts coming soon" banner. Stripe backend not ready.
4. Implement Pact lifecycle locally (state + status transitions).
5. Cheer system with templated messages.
6. Pact strip on dashboard.
7. Pact achievement.
8. RN parallel.
9. **Defer:** Stripe Connect integration to Week 6.

**Commit:** `CORE: pact system — $0 stakes mock + full lifecycle UI`

**Verification:**
- Draft Pact → "send invitation" → mocked send works.
- Accept Pact (mocked partner) → status becomes active.
- Pact strip appears on dashboard.
- Pact completes correctly per rules.

---

## Week 4 — Sessions + Shield + Lockdown (5 days)

### Day 16 — CORE Sessions

Spec sections: `03 §7`.

**Tasks:**
1. Build `session-start.html`, `session-active.html`, `session-complete.html`, `session-history.html`, `session-end-confirm.html`.
2. 5 intensity levels with config.
3. Session-active is bare-screen with countdown + optional breath ring + Coach line.
4. Pause / end early per intensity rules.
5. Trenches typed-GO confirmation.
6. App backgrounding handled with background timer.
7. RN parallel — use react-native-background-timer or expo equivalent.

**Commit:** `CORE: sessions — 5 intensity levels with bare-screen + background timer`

**Verification:**
- Start a Steady 30-min session.
- Active screen renders.
- Try to pause → confirmation.
- Complete → +XP.
- Trenches requires typed "GO."

---

### Day 17 — CORE Shield

Spec sections: `03 §8`.

**Tasks:**
1. Build `shield-setup.html`, `shield-active.html`, `shield-settings.html`, `shield-themes.html`.
2. iOS Screen Time API integration for app/website blocking.
3. 4 shield themes — Coach face / Streak count / Promise / Black.
4. Mode picker — Always-on / Windowed / Session-based / Lockdown.
5. Blocklists — Vape default + Social risk + Custom.
6. Block attempt logging.
7. RN — Screen Time integration via `react-native-screen-time` or equivalent.

**Commit:** `CORE: shield — Screen Time API + 4 themes + 4 modes`

**Verification:**
- Setup Shield → Session mode.
- Start a Locked session.
- Try to open blocked app → Shield screen shows.

---

### Day 18 — Lockdown

Spec sections: `03 §8`.

**Tasks:**
1. Build `lockdown.html` setup + active state.
2. "LOCKED" typed confirmation.
3. Shield activates Always-on.
4. Settings access blocked during Lockdown.
5. "EMERGENCY" typed 3x escape with 30s cooldown → Crisis route.
6. 7-day duration.
7. Auto-exit at end + Coach celebration.
8. RN parallel.

**Commit:** `CORE: lockdown — 7-day extreme mode with EMERGENCY escape`

**Verification:**
- Type "LOCKED" → Lockdown activates.
- Try Settings → blocked.
- Type "EMERGENCY" 3x → Crisis screen.

---

### Day 19 — Bonus habits unlocks

Spec sections: `03 §9`.

**Tasks:**
1. Update `coreState.bonusHabits` shape.
2. Update `pick-habits.html` — bonus habits visible/lockable per streak.day.
3. Update `habit.html` — universal handling for all habit hashes.
4. Per-habit particle theme (smoke / pixelation / falling coins / etc.).
5. Day 30 unlock prompt on dashboard.
6. Day 90 unlock prompt.
7. RN parallel.

**Commit:** `CORE: bonus habits — earned slots at day 30/90 + per-habit theming`

**Verification:**
- Set streak.days=30 → bonus habit prompt.
- Pick "Doomscroll" → added.
- New card on dashboard.

---

### Day 20 — Expanded ranks (13 tiers)

Spec sections: `03 §10`.

**Tasks:**
1. Update `RANKS` config to 13 tiers.
2. Update `ranks.html` visual ladder.
3. Update `rank-detail.html` per-tier.
4. Update `rank-up.html` celebration.
5. Implement per-rank perks in `core-rank-perks.js`.
6. Update `leaderboard.html` to use 13 tiers + Recovery Quality ranking.
7. RN parallel.

**Commit:** `CORE: ranks — 13 tiers with perks + Recovery Quality ranking`

**Verification:**
- Set streak.days=7 → rank=Spark, Pact perk unlocked.
- Set streak.days=365 → rank=Core, Lifetime discount.

---

## Week 5 — Pricing + extras (5 days)

### Day 21 — Pricing updates

Spec sections: `01 §3`, `02 §2 pricing.html`.

**Tasks:**
1. Update `pricing.html` — $7.99/mo, $44.99/yr, $89 lifetime.
2. Update `paywall.html` with new prices.
3. Update `referral-paywall.html`.
4. Update `cancel.html` retain offers reflect new pricing.
5. Update `trial-expired.html` plan toggle.
6. Update `landing.html` (web/landing/).
7. Add Lifetime row with day-30 gate.
8. Stripe / RevenueCat product configuration.

**Commit:** `CORE: pricing v2 — $7.99/$44.99/$89 + day-30 lifetime gate`

**Verification:**
- All pricing surfaces show consistent prices.
- Lifetime row gated on day 30+.

---

### Day 22 — Lifetime offer flow

Spec sections: `03 §11`.

**Tasks:**
1. Build `lifetime-offer.html` dedicated screen.
2. Day 30 dashboard slot for first offer.
3. Day 90 dashboard slot for second offer.
4. After 2 declines, Lifetime available in Settings only (no further prompts).
5. Stripe payment processing for one-time charge.
6. Lifetime status display in Settings.
7. Rank "Core" unlocks $59 discount.

**Commit:** `CORE: lifetime — day-30 gate + $89 one-time + rank-based discount`

**Verification:**
- Day 30 → offer surfaces.
- Decline → record. Day 90 → re-surfaces.
- Purchase → Lifetime active in settings.

---

### Day 23 — Public profile + Recovery Quality

Spec sections: `03 §12`, plus parts of §10.

**Tasks:**
1. Build `profile-settings.html` — public/friends/private toggles.
2. Update `user-profile.html` to respect visibility.
3. Update `u/index.html` to respect visibility.
4. Build `u/pact.html` public Pact spectator.
5. Implement Recovery Quality scoring in leaderboard.
6. Friends-only leaderboard default + global toggle (Pro tier).

**Commit:** `CORE: public profile + recovery quality ranking`

**Verification:**
- Set profile public → public URL shows allowed data.
- Set private → public URL shows "Private."

---

### Day 24 — Crisis mode (system-wide)

Spec sections: `03 §16`.

**Tasks:**
1. Update `coreState.crisisMode` shape.
2. Crisis mode persistent pill on dashboard.
3. Witness disabled when active.
4. Notifications suppressed when active.
5. Coach tone forced to Gentle.
6. No gamification during crisis (XP, ranks muted).
7. 24h auto-expiry + extend option.
8. Update `crisis.html` to invoke crisis mode.
9. Update `coach.html` to detect crisis intent.

**Commit:** `CORE: crisis mode — system-wide 24h state with safety overrides`

**Verification:**
- Activate Crisis from `crisis.html` → state updates.
- Witness ping should NOT fire.
- Coach reply Gentle.
- 24h later → mode auto-exits.

---

### Day 25 — Reports + Sharing

Spec sections: `03 §17`, plus existing share screens.

**Tasks:**
1. Build `report-90.html` — full report.
2. Build `report-90-share.html` — share card generator.
3. PDF generation via html2canvas + jspdf.
4. Coach-written summary paragraph (tone-aware).
5. Update `share-options.html` to include 90-Day Report.
6. Welcome back screen evolutions (`welcome-back-long.html`).
7. RN: native share sheet for PDF + image.

**Commit:** `CORE: 90-day report + share card generator + welcome-back-long`

**Verification:**
- Set days=90 → report renders with real data.
- PDF downloads correctly.
- Share card 1290x1290 PNG.

---

## Week 6 — Polish + integrations (5 days)

### Day 26 — Coach memory + data export

Spec sections: `03 §13, §14`.

**Tasks:**
1. Build `coach-memory.html` viewer.
2. Settings link.
3. Editable fields.
4. Data export → `coreState.exportData()` JSON download.
5. Account deletion flow — 3-step confirm + wipe.
6. Privacy policy updates.

**Commit:** `CORE: coach memory + data export + account deletion`

**Verification:**
- Open viewer → fields populated.
- Edit → coreState updated.
- Export → JSON downloads.
- Delete → wipes localStorage.

---

### Day 27 — Widgets + notification settings

Spec sections: `02 §2 widgets.html`, plus updates.

**Tasks:**
1. Update `widgets.html` previews.
2. Add 4th widget (Promise Pin) and 5th (Pact Status).
3. iOS widget extension implementation in RN.
4. Update `notifications-settings.html` with Witness/Pact/Body Receipt categories.
5. DND enforcement.

**Commit:** `CORE: widgets — 5 sizes + iOS extension + notification categories`

**Verification:**
- iOS widget displays real coreState data.
- DND respected.

---

### Day 28 — Accessibility + i18n prep

Spec sections: `03 §20, §21`.

**Tasks:**
1. Audit every HTML page for aria-labels.
2. Add VoiceOver support to every interactive element.
3. Test with VoiceOver on iOS.
4. Implement reduced-motion CSS.
5. Refactor all strings to `data-i18n` keys.
6. Build `i18n.js` runtime translator.
7. Create `locales/en.json` with all strings.
8. RN: accessibility props on every component.

**Commit:** `CORE: accessibility + i18n preparation`

**Verification:**
- VoiceOver walks onboarding cleanly.
- Reduce motion disables animations.
- All strings via keys.

---

### Day 29 — Stripe Connect for Pacts (real money)

Spec sections: `03 §3`.

**Tasks:**
1. Backend service: `backend/pacts.js` (Express or Vercel serverless).
2. Stripe Connect onboarding for platform.
3. PaymentIntent hold for Pact stakes.
4. Webhook handlers for completion / settlement.
5. Update `pact-draft.html` flow to use real Stripe.
6. Test mode → live mode.
7. Refund flow for aborted Pacts.

**Commit:** `CORE: pact stripe connect — real money flow`

**Verification:**
- Draft Pact → Stripe hold $5.
- Complete Pact → settle correctly.
- Refund flow works.

---

### Day 30 — Testing + verification sprint

Spec sections: `10_VERIFICATION.md`.

**Tasks:**
1. Run all Playwright tests on HTML previews.
2. Run all Detox tests on RN app.
3. Lighthouse audit on every preview page.
4. axe-core accessibility audit.
5. Manual walk of all journeys in `05_USER_JOURNEYS.md`.
6. Fix bugs surfaced.
7. Cross-browser test (Safari iOS, Chrome Android, desktop).

**Commit:** `CORE: testing sprint — all suites green`

**Verification:**
- All tests pass.
- Lighthouse green.
- Accessibility no violations.
- Journeys walk cleanly.

---

## Week 7 — TestFlight beta (5 days)

### Day 31 — Build prep

**Tasks:**
1. Update bundle version + build number.
2. Generate App Store screenshots from `app-store-screenshots.html`.
3. Write App Store description from `docs/APP_STORE_LISTING.md`.
4. Prepare press kit.
5. Verify all required assets (icon, splash, screenshots).

---

### Day 32 — TestFlight upload

**Tasks:**
1. Build production iOS bundle.
2. Upload to App Store Connect.
3. Internal TestFlight distribution.
4. Beta invite to 10 hand-picked testers.

---

### Day 33-35 — Beta feedback cycle

**Tasks:**
1. Monitor TestFlight crashes.
2. Daily standup with feedback.
3. Hotfix critical bugs.
4. Iterate on feedback.

---

## Week 8 — Launch (5 days)

### Day 36 — App Store submission

**Tasks:**
1. Submit for App Store review.
2. Prepare for App Store rejection edge cases.
3. Write FAQ for review board.

---

### Day 37-38 — Marketing prep

**Tasks:**
1. Schedule TikTok launch videos (10 scripts ready per `docs/TIKTOK_PLAYBOOK.md`).
2. Schedule Reddit launch posts.
3. Schedule Product Hunt launch.
4. Coach platform outreach (B2B parallel path).
5. Press kit final.

---

### Day 39 — Launch day

**Tasks:**
1. Approval comes in (hopefully).
2. App live on App Store.
3. Launch TikTok video 1.
4. Reddit launch post.
5. Product Hunt launch.
6. Email waitlist.
7. Monitor metrics.

---

### Day 40 — Post-launch

**Tasks:**
1. Monitor metrics dashboard.
2. Respond to App Store reviews.
3. Hotfix any critical issues.
4. Plan v1.1 features (multi-language, Apple Watch).

---

## Parallel tracks

Some work can happen in parallel to the main timeline.

### Parallel A: B2B Coach platform

**Owner:** Stone (founder-led outreach).
**Timeline:** Weeks 3-8.

- Update `coach-signup.html` with new positioning.
- Update `coach-dashboard.html` with new client management.
- Manual outreach to 30 coaches per `docs/COACH_OUTREACH.md`.
- Target: 5 paying coaches by Day 40.

### Parallel B: Content production

**Owner:** Stone (or hired contractor).
**Timeline:** Weeks 4-8.

- 10 TikTok launch videos per `docs/TIKTOK_PLAYBOOK.md`.
- 30-day daily TikTok schedule.
- 3 Reddit launch posts.
- Product Hunt launch artifacts.

### Parallel C: Backend infrastructure

**Owner:** Claude (one weekend in week 4 or 5).
**Timeline:** Weeks 4-6.

- Stripe Connect integration.
- Optional: Coach platform backend (if needed for B2B users).
- Witness model server (deferred to v2).

---

## Definition of done — week-end checks

After every week, verify:

| Week | Check |
|---|---|
| Week 1 | New user can complete onboarding (trial + quiz + permissions + pick-habits → dashboard) in <4 minutes. |
| Week 2 | Maya journey through Day 0 → Day 2 (with slip + recovery) works end-to-end. Coach responds in chosen tone. |
| Week 3 | Witness pings correctly on synthetic data. Promise Letter generates on day 7. Body Receipt completes. Pact mocked lifecycle works. |
| Week 4 | Sessions / Shield / Lockdown all work. Bonus habits unlock. Ranks expanded. |
| Week 5 | Pricing updated. Lifetime offer flows. Public profile respects privacy. Crisis mode works. 90-Day Report renders. |
| Week 6 | Coach memory + data export + Stripe Connect + accessibility + i18n prep. All tests green. |
| Week 7 | TestFlight live. 10 beta users active. Hotfixes deployed. |
| Week 8 | App Store live. Launch day executed. Metrics tracking. |

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| App Store rejection (vape content) | Medium | Position as "quit smoking aid" not "vape app." No vape branding in screenshots. |
| Stripe Connect Pact escrow regulatory issues | Medium | Legal review before live. Defer to v1.1 if blocking. Ship Pact with $0 stake first. |
| Witness model false positives | High initially | Conservative threshold (0.65). "Not a real pattern" learning loop. |
| TestFlight beta finds critical UX issues | Medium | Buffer week 8 for hotfixes. |
| Coach AI hallucinates harmful advice | Low (local rules) | Safety pass on every Coach reply. Crisis intent detection. |
| Backend infrastructure overruns | Medium | Defer non-critical backend (Stripe Connect, server-side Witness) to v1.1. |
| User downloads on Android, no app exists | High | Marketing iOS-first. Android v1.1. |

---

## Commit frequency rules

- One commit per day MINIMUM.
- One commit per major feature within a day (often 2-3 per day).
- Never batch a feature commit with refactor or formatting commits.
- Commit messages: `CORE: <feature> — <one-line summary>`. Always include the scope.

---

## Branch strategy

- `main` — production, always shippable.
- `core-battle-plan` — this initiative branch.
- Feature branches off `core-battle-plan` for risky changes.
- Merge to `core-battle-plan` weekly. Merge to `main` at TestFlight prep (Day 31).

---

## End-of-file verification

After completing all 40 days:

1. App is live on App Store.
2. All journeys in `05_USER_JOURNEYS.md` work in production.
3. Metrics dashboard tracking all events from `09_DATA_MODELS.md`.
4. At least 100 downloads in first 48 hours.
5. NPS data starting to populate (day 30 trigger).

Next file: `07_AESTHETIC_BIBLE.md`.
