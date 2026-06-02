# 10 — VERIFICATION

> Read `00`–`09` first.

This file is the **definition of done**. After every section, run the verification checklist for that section. After every week, run the weekly smoke test. Before TestFlight ship, run the full release verification.

If verification fails, **stop**. Fix it. Don't ship the regression.

---

## §1. Per-section verification

### After `02_EXISTING_FILES_AUDIT.md` fixes

1. **State schema check.**
   ```js
   coreState.read().version === 2 // true
   ```
2. **Analytics check.** Open `dev/metrics.html`. After 30s on any page, ring should have ≥1 `screen_view` event.
3. **All bindings work.** Run in console: `[...document.querySelectorAll('[data-core]')].every(el => el.textContent.length > 0)` should be `true`.
4. **Color tokens.** Search codebase: `grep -rE "#[0-9a-fA-F]{6}" previews/*.css | grep -v core-theme.css` — output should be empty (no raw hex outside core-theme).
5. **Baseline.html removed.** `find previews -name "baseline.html"` — empty.
6. **Onboarding < 4 min.** Time the trial+quiz+permissions+pick-habits flow. Stopwatch.

### After `03_NEW_FEATURES.md` implementation

**Witness:**
1. Mock 10 slips at 14:00 weekdays via dev/state-mutator.
2. Set device time to 14:30 Wednesday.
3. Open dashboard. Witness ping card should appear within 30s of foreground.
4. Confidence in console: `coreState.witness.patterns` populated.
5. Tap "Not a real pattern" → mute follow-up appears.
6. Pick a signal → muted for 7 days.
7. Set device time to 02:00 — verify no ping (DND).

**Promise Letter:**
1. Set `coreState.streak.days = 7`.
2. Open `streak-celebration.html?days=7` directly.
3. "Coach wrote you a letter" card slides up at 3.5s.
4. Tap → letter unfolds.
5. Verify body contains user's name + reason + trigger.
6. Close → state.openedCount = 1.
7. Set days = 30 → dashboard shows re-read teaser.
8. Open slip-confirm — banner appears.

**Pact:**
1. (Mocked partner) Draft a 14-day Pact.
2. Stake $0 (v1 mock).
3. Send invitation — state.status = 'pending'.
4. Mock acceptance → status = 'active'.
5. Pact strip appears on dashboard.
6. Send a cheer → in history.
7. Mock pact completion at day 14 → status = 'won_both'.
8. Pact appears in completed history.

**Body Receipts:**
1. Set days = 22, today is Sunday afternoon.
2. Dashboard shows Body Receipt prompt.
3. Open `body-receipt.html`. Complete all 6 steps.
4. State.bodyReceipts.length = 1.
5. Profile → "Your evidence" shows the receipt.
6. Take a second receipt next week → delta computed.

**Calm Library:**
1. Open `calm-library.html`. Pick "Boredom."
2. 3 scripts surface.
3. Tap one → TTS plays + breath orb.
4. Complete → +5 XP toast.
5. Favorite → appears in "Yours" tab.

**Coach agentic:**
1. Open Coach. Type "I'm bored, trying not to vape."
2. Coach reply contains 2-3 action cards.
3. Tap Calm Library card → confirmation modal.
4. Confirm → Calm Library opens with boredom pre-selected.
5. Type "I don't want to be here anymore" → Crisis card → no confirm → routes to crisis.html.

**Sessions:**
1. Open `session-start.html`. Pick Steady, 30 min. Start.
2. Session-active screen renders with 30:00 countdown.
3. Try pause → confirmation modal.
4. Complete → +XP, state.sessions.length = 1.
5. Try Trenches → requires typed "GO."

**Shield:**
1. Setup Shield → Session mode.
2. Start a Locked session with Instagram in blocklist.
3. Try to open Instagram → Shield screen (theme: Coach face).
4. State.shield.attempts logs the block.

**Lockdown:**
1. Setup Lockdown → type "LOCKED."
2. Try Settings → blocked.
3. Type "EMERGENCY" 3x → Crisis screen routes.

**Bonus habits:**
1. Set days = 30 → bonus habit prompt.
2. Pick Doomscroll → added to state.bonusHabits.
3. New card on dashboard.

**Ranks 13 tiers:**
1. Set days = 365 → rank = Core.
2. `coreState.lifetime.eligibleAt` set and Lifetime $59 discount available.

**Lifetime:**
1. Set `coreState.installedAt` to 30 days ago.
2. Dashboard shows lifetime offer.
3. Decline → state.lifetime.offeredAt updated.
4. Set installedAt to 90 days → offer re-surfaces.

**Crisis mode:**
1. Open `crisis.html` → tap "I need to step away."
2. Crisis mode activates.
3. Dashboard shows persistent pill.
4. Witness should NOT fire pings.
5. Coach replies in Gentle regardless of setting.
6. 24h later → mode auto-exits.

### After `04_PAGE_BEHAVIORS.md`

Manual walk every page. For each:
1. Open page directly via URL.
2. Verify all UI elements render.
3. Tap every interactive element. Verify analytics fired.
4. Tab through with keyboard. Focus order sensible.
5. Test at 320px width.

### After `05_USER_JOURNEYS.md`

Walk every journey end-to-end:
1. **First Open** — under 4 min from install to first Coach message.
2. **First Slip** — under 5 min from slip button to back on dashboard.
3. **Day 7 Milestone + Letter** — celebration + letter appear correctly.
4. **Day 14 Pact** — mock partner, full Pact lifecycle.
5. **Day 30 Body Receipt** — Sunday prompt → complete → history.
6. **Day 30 Lifetime Offer** — appears + decline + re-surface at day 90.
7. **Witness Ping** — synthetic slips → ping fires at right time.
8. **Churning User** — cancel.html with retain offers.
9. **Crisis Path** — crisis intent → crisis screen.
10. **Day 90 Report** — generates with real data.

### After `07_AESTHETIC_BIBLE.md`

1. Color audit: every hex in codebase comes from `core-theme.css`.
2. Animation performance: Chrome DevTools Performance recording on dashboard during idle → 60fps.
3. Glass surfaces render on Safari (backdrop-filter support).
4. Accessibility audit with axe-core → zero color contrast failures.

### After `08_COPY_LIBRARY.md`

1. Grep for forbidden words: `grep -irE "journey|wellness|mindfulness|empower|crush it|game.?changer" previews/*.html` — should match only `08_COPY_LIBRARY.md` reference.
2. Every Coach string has 4 tone variants in `locales/en.json`.
3. Tone consistency: open Coach with each tone, sample 5 different copy strings. Verify tone matches.

### After `09_DATA_MODELS.md`

1. Migration test: load a v1 state object → run `migrate()` → verify v2 output structure.
2. Pruning test: simulate 600 slips → state.slips.length = 500 after prune.
3. Computed values: verify `lifeScore`, `currentRank`, `recoveryQualityScore` on a known state.
4. Storage quota: fill with all max-sized data → < 10MB total.

---

## §2. Weekly smoke tests

After each week of `06_EXECUTION_PLAN.md`:

### Week 1 — Foundation

1. New user completes onboarding in <4 min.
2. coreState v2 in localStorage after onboarding.
3. All analytics events from onboarding present in ring.
4. No JS errors in console.
5. Responsive: 320px, 390px, 768px, 1440px all work.

### Week 2 — Main app + Coach

1. Day 0 → Day 2 → slip → recovery → back to dashboard.
2. All 4 Coach tones render correctly.
3. Suggested prompts auto-submit.
4. Insight cards appear per rules.

### Week 3 — Differentiating features

1. Witness setup + pattern matching working.
2. Promise Letter generates on day 7.
3. Body Receipt full flow works.
4. Pact mock lifecycle works.
5. Calm Library plays a session via TTS.

### Week 4 — Sessions + Shield + Lockdown

1. Each session intensity behaves correctly.
2. Shield blocks attempts (mocked or real).
3. Lockdown enforces restrictions.
4. Bonus habits unlock at day 30.
5. 13-tier ranks compute correctly.

### Week 5 — Pricing + extras

1. New pricing surfaces consistently.
2. Lifetime offer flows at day 30 + 90.
3. Public profile respects privacy.
4. Crisis mode 24h cycle works.
5. 90-Day Report renders with real data.

### Week 6 — Polish + integrations

1. Coach memory viewer renders.
2. Data export downloads JSON.
3. Stripe Connect test mode works.
4. Accessibility audit clean.
5. i18n keys all defined.

### Week 7 — TestFlight

1. TestFlight build uploads cleanly.
2. 10 beta testers can install + onboard.
3. Critical paths work in production build.
4. Crash-free rate > 99%.

### Week 8 — Launch

1. App Store approved.
2. Day-1 metrics: install conversion, onboarding completion, trial start rate.
3. Day-2 metrics: D1 retention.
4. Day-7 metrics: trial-to-paid conversion.

---

## §3. Critical-path smoke test (must run before every TestFlight push)

15-minute test. If anything fails, do not push.

1. **Install + first open:** fresh state. Splash → index.
2. **Onboarding:** complete in <4 min. Verify state.
3. **Day 1 dashboard:** loads. All slots correct.
4. **Slip flow:** hold button 2s → trigger picker → recovery → dashboard.
5. **Coach:** open, type "hi" → Coach replies in chosen tone.
6. **Witness setup:** complete the 6-step flow.
7. **Pact draft:** complete the 5-step flow (mocked partner).
8. **Body Receipt:** complete the 6-step flow.
9. **Calm Library:** play one session.
10. **Settings:** all rows tappable. No crashes.
11. **Cancel flow:** all 3 steps. Retain offers visible.
12. **Crisis:** open, tap a crisis line (verify it dials).
13. **Logout / sign-in:** works without state corruption.
14. **Force-close + reopen:** state persists.
15. **Background 5 min, reopen:** session resumes correctly.

---

## §4. Performance verification

Before TestFlight ship:

| Metric | Target | Test |
|---|---|---|
| App cold start | < 2s | iPhone 12, fresh install |
| First Coach message after install | < 4 min | Manual flow |
| Splash → dashboard | < 3s | Existing user |
| Screen transition | < 250ms | Any screen change |
| Stat tween on data change | 600ms | Slip → dashboard |
| TTS load + play | < 1s | Calm Library |
| Lighthouse PWA score | > 90 | Any preview HTML |
| Memory footprint | < 200MB | Active session |
| Battery drain | < 5%/hour active | iOS Energy Impact |

---

## §5. Accessibility verification

| Check | Tool | Pass |
|---|---|---|
| Zero color contrast failures | axe-core | All pages |
| VoiceOver completes onboarding | manual | Maya journey |
| Larger Text up to 200% | manual | No overflow |
| Reduce Motion respected | manual | All animations stop |
| Dark mode only enforced | manual | iOS light mode → still dark |
| Keyboard nav (desktop preview) | manual | Tab order sensible |
| Touch targets ≥ 44x44 | manual | All buttons |
| ARIA labels on every interactive | linter | Pass |

---

## §6. Privacy verification

Before App Store submission:

1. **No PII in analytics.** Inspect `coreAnalyticsRing` — no names, emails, phone numbers.
2. **Photos local-only.** Search filesystem after Body Receipt with photo → only in app sandbox.
3. **Coach conversations encrypted.** If synced to server, verify encryption at rest.
4. **No location coordinates stored.** Only bucketed place IDs.
5. **No contacts stored.** Match is ephemeral.
6. **Privacy policy accurate.** Read it against actual data handling.
7. **Data export complete.** Download JSON → contains all coreState.
8. **Data deletion complete.** Delete account → localStorage cleared.

---

## §7. App Store submission checklist

1. **App icon** — 1024x1024, no transparency, no alpha.
2. **Screenshots** — 5 per device size, vertical 1290x2796 (6.7"), 1242x2688 (6.5"), 1242x2208 (5.5"), 2048x2732 (12.9" iPad).
3. **App preview video** — optional, 15-30s, vertical.
4. **Description** — 4000 chars max. Focus on vape quitting.
5. **Keywords** — 100 chars. "quit vape, quit vaping, vape quitting, stop vape, vape free, quit smoking, vape app, vape tracker, addiction, recovery."
6. **Promotional text** — 170 chars. Current campaign.
7. **Privacy nutrition label** — accurate. Categories used: Health & Fitness, Contact Info, User Content, Usage Data, Diagnostics.
8. **Age rating** — 17+ (due to vape content references).
9. **Category** — Health & Fitness (primary), Lifestyle (secondary).
10. **Support URL** — core.app/support.
11. **Marketing URL** — core.app.
12. **Privacy policy URL** — core.app/privacy.

---

## §8. Anti-regression tests

For features in production, automated tests must catch:

- **Coach tone consistency:** all 4 tones must render distinct strings on the same prompt.
- **Slip flow integrity:** slip → trigger picker → recovery → state update. Never lose the slip.
- **Witness DND:** simulate 23:00 → confidence > threshold → no ping fired.
- **Pact escrow:** when Pact fails, Stripe refund processes correctly.
- **Body Receipt photo privacy:** if photoOptIn = false, photo step is skipped.
- **Crisis mode overrides:** Witness disabled, Coach forced Gentle.
- **Promise Letter idempotency:** generates once, even if dashboard re-routes to celebration multiple times.
- **Lifetime gate:** offer surfaces only at day 30 and day 90.

---

## §9. Manual QA scenarios

Beyond automated tests, manually verify these less common paths:

1. **User loses all 5 stats to 0** (catastrophic slip):
   - Coach forced to Gentle.
   - Insight card shows reset offer.
   - Dashboard renders gracefully.

2. **User in trial expires AND has active Pact:**
   - Pact features remain accessible.
   - Other paid features lock.
   - Subscription prompt deferred to post-Pact.

3. **User on day 7 + slip occurs same day:**
   - Slip processed correctly.
   - Streak resets.
   - Letter does NOT generate (slip broke streak before celebration).
   - On next day-7 reach, letter generates fresh.

4. **User in Lockdown attempts subscription cancel:**
   - Cancel access blocked.
   - Coach line: "Lockdown's still on. Subscription's safe."

5. **User toggles Coach tone every day for a week:**
   - All tones render correctly.
   - History logged.
   - No state corruption.

6. **User logs 20 slips in one day:**
   - Stats degrade incrementally.
   - Coach escalates support tone.
   - Crisis mode auto-suggested if no recovery between slips.

7. **User completes a Body Receipt then logs slip 2 minutes later:**
   - Receipt persists.
   - Slip recorded.
   - State integrity maintained.

8. **Two users with same name and tone do parallel onboarding:**
   - States isolated per device.
   - No cross-contamination.

---

## §10. Beta testing protocol

For TestFlight beta:

1. **10 hand-picked users** matching CORE persona.
2. **Daily check-in** — short survey via in-app feedback.
3. **Bug reports** routed to a shared Notion / Linear.
4. **Critical bug SLA:** fix within 24h.
5. **Major bug SLA:** fix within 3 days.
6. **Minor bug SLA:** fix within 1 week.
7. **Beta duration:** 5 days minimum.
8. **Beta exit criteria:** zero critical, no more than 3 major open, all journeys walkable.

---

## §11. Launch day metrics

Track in real time on `dev/metrics.html` (or production analytics dashboard):

| Metric | Target Day 1 | Target Day 7 | Target Day 30 |
|---|---|---|---|
| Installs | 100 | 1000 | 5000 |
| Onboarding completion rate | 70% | 75% | 75% |
| Trial start rate | 90% (of onboarded) | 90% | 90% |
| Day 7 streak rate | — | 40% | 35% |
| Trial-to-paid conversion | — | 35% | 35% |
| D7 retention | 60% | — | — |
| D30 retention | — | — | 35% |
| Median streak length at D30 | — | — | 18 days |
| App Store rating | — | 4.0+ | 4.5+ |
| NPS (at day 30) | — | — | 60+ |
| Crash-free rate | 99% | 99.5% | 99.5% |

---

## §12. End-of-file verification

After reading this entire file:

1. Print the critical-path smoke test (§3) and tape it to your monitor.
2. Set up the analytics dashboard alerts for launch day metrics (§11).
3. Schedule weekly smoke tests on calendar.
4. Run the critical-path smoke test once now to confirm baseline.

This is the last numbered file. After this:
1. Commit the entire `CORE_BATTLE_PLAN/` directory.
2. Push to a feature branch.
3. Open a PR titled "CORE Battle Plan v1 — full implementation spec."
4. Stone reviews + approves.
5. Begin Day 0 of `06_EXECUTION_PLAN.md`.

Become.
