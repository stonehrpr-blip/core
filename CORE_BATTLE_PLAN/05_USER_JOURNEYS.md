# 05 — USER JOURNEYS

> Read `00`–`04` first.

This file documents **end-to-end user journeys**. Each journey is a specific scenario tracing what the user sees, taps, and feels at every step. Use these as **integration tests** — if any page in the journey breaks, the whole journey breaks.

Journeys are NOT all the journeys possible. They are the **critical paths** that must be flawless.

---

## §1. The First Open (Day 0, minute 0)

> **DRIFT NOTE (2026-05-30):** Trial is now 9 steps in the live HTML (added Profile / Goal / Blocker / Routine between Name and Tone). Total Maya-to-first-Coach-message time stretches from ~2min to ~3min. Targets in this section (<4min total) still hit.

### Scenario

A new user, "Maya," 26, has just installed CORE after seeing a TikTok. She opens the app for the first time.

### Step-by-step

1. **00:00** Maya taps the CORE app icon on her home screen.
2. **00:01** Splash screen appears. Pulsing dot, expanding rings, "CORE" wordmark reveals.
3. **00:02.6** Splash auto-routes to `index.html` (no prior state).
4. **00:03** Maya sees the pentagon of orbs, each pulsing differently. The Lungs orb (top-right) breathes 4-4-4-4. The Brain orb pulses faster. Title reads "Become / who you said / you'd be." with the last line gradient.
5. **00:05** Maya reads. CTA pulses gently: "Start my 7-day free trial."
6. **00:09** Maya taps the CTA.
7. **00:09.4** Transition slides to `trial.html` Step 0.
8. **00:10** Maya sees: "Sign your promise." Subtitle: "Type the word that locks this in." A mono-font input awaits.
9. **00:18** Maya hasn't typed yet. The 8-second hint tooltip slides in: "Take your time. This part isn't a test — it's a signature."
10. **00:22** Maya types P-R-O-M-I-S-E letter by letter. The input transforms to a gold-accented signed state. Next CTA enables.
11. **00:25** Maya taps Next. Slide left to Step 1.
12. **00:26** "What should Coach call you?" — text input.
13. **00:30** Maya types "Maya." Next.
14. **00:32** Step 2: "Pick a Coach voice." Four cards.
15. **00:35** Maya taps "Gentle" → preview link → opens `tone-detail.html?tone=gentle`. Sample conversation displays.
16. **00:48** Maya reads. Taps "Use this Coach." Returns to trial Step 2 with Gentle selected.
17. **00:50** Maya taps Next.
18. **00:51** Step 3: "When should I check in?" — three cards. Maya taps "Both."
19. **00:53** Maya taps Next.
20. **00:54** Step 3.5: "We'll ask for notifications in a sec. Here's why." Single screen with reasoning.
21. **00:58** Maya taps "Got it."
22. **00:59** Step 4: Trial pitch. "7 days. Free. No charge until day 8. On day 7, Coach will write you a letter." Primary CTA: "Start my 7-day free trial."
23. **01:05** Maya taps CTA.
24. **01:05.3** Analytics fires `trial_started`. `coreOnboardTrial` is now populated with name, tone, checkin, committed=true, trialStartedAt=now.
25. **01:06** Slide to `quiz.html`.
26. **01:07** Quiz Step 1: profile. Maya picks an avatar.
27. **01:11** Quiz Step 2: age. Slider. Maya sets 26.
28. **01:13** Quiz Step 3: main goal. Maya picks "Quit vape."
29. **01:15** Quiz Step 4: "When was your last puff?" Maya picks "<1 hour" (she just stopped to install the app).
30. **01:17** Quiz Step 5: "How many puffs per day at your peak?" Slider. Maya sets 60.
31. **01:19** Quiz Step 6: "What sets it off?" Multi-select. Maya picks Stress, Boredom, After meals.
32. **01:23** Quiz Step 7: sleep avg. Maya picks 7 hours.
33. **01:25** Quiz Step 8: coaching style preview. Coach sample shown in Gentle. "Sound right?" Maya taps Yes.
34. **01:28** Quiz Step 9: Review. Maya scrolls answers.
35. **01:30** Maya taps "Looks right." `coreOnboardComplete = 1`. Route to permissions.
36. **01:31** Permissions screen. 5 cards.
37. **01:32** Maya taps Allow on Notifications → iOS prompt → grant.
38. **01:34** Maya taps Allow on Screen Time → iOS prompt → grant.
39. **01:36** Witness apps picker opens (since Screen Time granted).
40. **01:38** Maya picks Instagram, TikTok.
41. **01:40** Returns to permissions. Maya taps Skip on Location, Health, Contacts.
42. **01:42** Next → `pick-habits.html`.
43. **01:43** Pre-selected "Quit Vaping" with "★ Your focus" pill. Continue.
44. **01:44** Routes to `dashboard.html`.
45. **01:45** Dashboard loads. Greeting: "Welcome, Maya. Day 1." (Gentle tone.)
46. **01:46** Life Score: 50. All 5 stats: 50. Streak: 1 day.
47. **01:47** Coach line of the day: "First day. Just be here."
48. **01:48** Today's quest: "Tell me one thing about your day."
49. **01:55** Maya taps the quest → routes to Coach.
50. **01:56** Coach: "Hi Maya. I'm here. First day's just for noticing. What's something true about today?"

**Total time:** ~2 minutes from open to first Coach message. Target met.

### Verification

- All analytics events fired (check `dev/metrics.html`):
  - `app_first_open`
  - `splash_viewed`
  - `index_viewed`
  - `index_cta_tapped`
  - `trial_viewed`
  - `trial_step_view {step:0,1,2,3,4}`
  - `promise_hint_shown`
  - `promise_signed`
  - `trial_started`
  - `quiz_step_view {step:1..9}`
  - `quiz_completed`
  - `permissions_granted` × 2
  - `pick_habits_completed`
  - `onboarding_completed`
  - `dashboard_viewed`
  - `today_quest_tapped`
  - `coach_viewed`

### Edge cases for this journey

- **Maya pastes "PROMISE":** rejected with toast. She must type.
- **Maya enters age 17:** age gate appears. Journey aborts.
- **Maya hits Back from Step 3:** returns to Step 2 with selection preserved.
- **Maya force-closes during quiz Step 5:** Reopens → splash → routes to quiz Step 5.
- **Maya skips all permissions:** Witness disabled, but app still functional.

---

## §2. The First Slip (Day 2)

### Scenario

Maya is on day 2. She had a stressful argument with her boyfriend. She slips.

### Step-by-step

1. **14:23** Maya opens CORE after the argument. Dashboard loads.
2. **14:23.5** Dashboard greets: "Afternoon, Maya." Life Score: 68 (up from yesterday). Streak: 2 days.
3. **14:24** Maya taps "Mark a puff" on habit-vape card (or via dashboard quick action).
4. **14:24** Wait — she went to `habit.html#vape` first by tapping the Lungs stat card. Stat page shows lungs at 72. She taps "Mark a puff."
5. **14:25** Routes to `slip-confirm.html?habit=vape`.
6. **14:25** Promise Letter banner appears at top (NO — Maya is on day 2, Promise Letter doesn't exist yet, only generated at day 7). Banner skipped.
7. **14:25** Tone-aware title: "Hold to mark it." (Gentle tone.)
8. **14:25** "I'm here when you're ready" subtitle.
9. **14:26** Maya presses and holds the button. Ring fills over 2 seconds. Red pulse near end.
10. **14:26** Release at 2.0s. Slip logged. Routes to trigger picker step.
11. **14:26** Trigger picker: 8 chips. Maya taps Stress + After meal.
12. **14:27** Optional "anything else?" text input. Maya types "argument."
13. **14:27** "Save" → slip metadata updated.
14. **14:27** Routes to `recovery-quest.html`.
15. **14:27** Step 1: Trigger confirmation. Shows "Stress + After meal." Maya taps Next.
16. **14:28** Step 2: Mood. 5 emoji. Maya picks "Down."
17. **14:29** Step 3: "What would have helped?" Coach suggestions (based on triggers):
    - "Step outside for 60s before reaching for it."
    - "Send a quick message to a Pact partner (you don't have one yet — want to set one?)"
    - "Try the box-breath on the Calm screen."
18. **14:30** Maya picks the first one.
19. **14:31** Final CTA: "Lock in your reset." +25 XP recovery bonus.
20. **14:31** Routes to dashboard with success toast.
21. **14:31** Dashboard now shows: Life Score 60 (dropped from slip). Lungs: 65 (-7). Streak: 0 days (broken).
22. **14:31** Restore banner appears: "You lost your 2-day streak. Restore for $0.99. 48h window."
23. **14:32** Coach insight card below: "I saw you tap. No lecture, Maya. That was a hard one. Walk me through the trigger when you're ready."

### What happens emotionally

- Maya feels: bad (the slip), then relieved (no shame), then a little reset (Coach acknowledged).
- The Restore offer is honest, not manipulative: "Restore" not "Save your streak forever for $0.99!"
- The Coach tone is calibrated. Direct or Drill would have felt jarring. Gentle is right for Maya in this moment.

### Analytics events

- `dashboard_viewed`
- `stat_card_tapped {stat: 'lungs'}`
- `habit_viewed {habit: 'vape'}`
- `habit_slip_button_pressed {habit: 'vape'}`
- `slip_confirm_viewed`
- `slip_confirm_hold_start`
- `slip_confirmed {habit: 'vape', magnitude: 1}`
- `slip_trigger_logged {triggers: ['stress', 'after_meal'], hasNote: true}`
- `recovery_started`
- `recovery_step_completed {step: 1}`
- `recovery_step_completed {step: 2}`
- `recovery_step_completed {step: 3}`
- `recovery_completed`
- `dashboard_viewed` (post-recovery)
- `restore_banner_viewed`
- `coach_insight_card_viewed {type: 'streak_lost_takeover'}`

### Verification

- After slip: `coreState.slips[0]` should be the just-logged slip with all metadata.
- After recovery: `recoveryQuests[0]` should be the just-completed recovery.
- Life Score should drop by ~8 (slip impact on lungs primary -10, willpower secondary -5, then averaged).
- Streak should be 0; `previousDays = 2`; `lostAt = now`.

### Edge cases

- **Maya cancels mid-hold:** ring resets, no slip logged.
- **Maya skips recovery quest:** still counts as `recovery_skipped`. No XP.
- **Maya hits "I almost did but didn't":** +8 XP, willpower +2, no slip. Streak preserved.
- **Maya logs 3 slips in 10 minutes:** each goes through full flow. Coach insight escalates: "Three in a row. Pause for a moment? I'm here."

---

## §3. The Day-7 Milestone

### Scenario

Maya has had 2 slips over the past 5 days. On day 5 she had a recovery streak running again. By day 7 of her CURRENT clean run, the milestone hits.

### Step-by-step

1. **Day 7, 09:14 AM** Maya wakes up. Opens CORE.
2. **09:14** Splash → routes through morning-checkin (it's morning + her checkin set to Both + no entry today).
3. **09:14** Morning check-in: mood (good), sleep (8 hrs), intention ("Hold the day").
4. **09:18** Completes check-in. Routes to dashboard.
5. **09:18** Dashboard auto-redirects to `streak-celebration.html?days=7` (first time hitting tier 7).
6. **09:18** Confetti bursts. Aurora rays spin. Number 7 pops into existence.
7. **09:18** Copy: "7 days. The week you said you couldn't." +50 XP.
8. **09:20** 3.5 seconds in, a card slides up from the bottom: "Coach wrote you a letter." with envelope icon.
9. **09:21** Maya taps "Open it."
10. **09:21.4** Routes to `promise-letter.html`.
11. **09:22** Envelope unfolds over 1.2s. Paper letter visible.
12. **09:22** Text reveals paragraph by paragraph:
    ```
    Dear Maya,
    
    You started Core because you wanted to feel like yourself again — not the version that's always reaching. I'm writing this from day 7, when it's beginning to feel real.
    
    Here's something you might forget at 2am:
    
    The reason it's hard isn't because you're weak. It's because vape works. It's a really good drug. You're up against a chemical that was designed to win. The fact that you've made it 7 days is not nothing.
    
    Here's why it's worth it:
    
    You said you wanted to feel like yourself again. You said you wanted to breathe deep without a wheeze. That's not gone. It's coming.
    
    Your trigger is stress. When that hits later, remember: it's the brain not the body. Wait it out, ride it through, or text Coach. I'll be here.
    
    Keep going.
    
    — You, on day 7
    ```
13. **09:24** Maya reads. Stays for 2 minutes.
14. **09:26** Maya taps "Close." Envelope re-folds.
15. **09:26** Returns to dashboard. Life Score now 78. New rank: Spark.
16. **09:26** Coach insight card: "Spark rank — Pact unlocked. When you're ready."

### What happens emotionally

- Maya feels: pride, then surprise (the letter), then connection (her own words from a week ago feel meaningful).
- The Promise Letter is the **conversion moment** to paid. Maya is now 90% likely to keep her subscription.

### Analytics events

- `milestone_reached {tier: 7, days: 7}`
- `milestone_celebration_viewed {tier: 7}`
- `promise_letter_written`
- `promise_letter_delivered {context: 'day_7'}`
- `promise_letter_opened`
- `promise_letter_closed {durationRead: ~120, context: 'day_7'}`
- `rank_promotion {fromRank: 'Focus', toRank: 'Spark'}`
- `coach_insight_card_viewed {type: 'pact_unlocked'}`

### Verification

- `coreState.promiseLetter.generated = true`, `writtenAt`, `deliveredAt`, `openedCount: 1`.
- `coreState.milestonesSeen.tier7 = true`.
- New rank computed correctly.

### Edge cases

- **Maya force-closes during celebration:** XP still added in background. Letter NOT generated yet — it generates on the FIRST time celebration is viewed. So on reopen, she'd see celebration again and letter generates then.
- **Maya skips letter on day 7:** still considered delivered. Re-surfaces at day 30.
- **Streak broken before reaching day 7:** no letter. Generates fresh on next day-7 reach.

---

## §4. The Day-14 Pact

### Scenario

Maya is on day 14 clean. She has a friend "Sam" who also vapes. They've been talking about quitting together.

### Step-by-step

1. **Day 14, 21:00** Maya opens CORE. Sees "Pacts available" badge in Coach quick actions.
2. **21:00** Maya goes to Find Friends. Searches "Sam" → finds him (he's installed CORE recently).
3. **21:01** Maya taps Sam's profile → user-profile.html. "Pact with Sam" CTA visible (both are Pro tier and have no current Pact).
4. **21:02** Maya taps Pact CTA → `pact-draft.html`.
5. **21:02** Step 1: friend pre-selected (Sam).
6. **21:03** Step 2: duration. Maya picks 14 days.
7. **21:04** Step 3: stake $5.
8. **21:05** Step 4: note: "Both quitting before vacation."
9. **21:06** Step 5: review.
10. **21:07** Maya taps "Send invitation." Stripe charges $5 to Maya's card. Sam gets push notification.
11. **21:09** Sam opens his phone → notification → `pact-invite.html`.
12. **21:10** Sam reads. Stripe escrow shown.
13. **21:11** Sam taps "Accept ($5 stake)." His card is charged. Both stakes in escrow.
14. **21:12** Both Maya and Sam get Coach confirmation: "Pact locked. 14 days. You and Sam. Go." (Gentle tone for Maya; Sam's tone differs.)
15. **21:12** Maya's dashboard now shows Pact strip at the bottom: Sam's avatar, "Day 1/14," both green.

### During the Pact (day 7 of Pact)

1. **Day 21 of Maya's streak, day 7 of Pact:** Maya is doing well. Sam has slipped once on day 4 of the Pact.
2. **21:00** Maya gets push: "Sam slipped today. They've started recovery."
3. **21:01** Maya opens app. Pact strip shows Sam status as red. Cheer CTA pulses.
4. **21:02** Maya taps Cheer → 4 templates. Picks "I'm here."
5. **21:02** Sam gets the cheer.

### End of Pact (day 14 of Pact)

1. **Day 28 of Maya's streak, day 14 of Pact at 21:00:** Pact ends.
2. **Maya's streak: 28 days (uninterrupted).** Sam's streak: 10 days (slipped once recovered).
3. **21:01** Both get notification: "Pact complete."
4. **21:01** Both open `pact-complete.html` (different content for each).
5. **21:01** Maya sees: "You won. $9.50 returned to your card. Sam's $5 (minus fee) was sent to you."
6. **21:02** Sam sees: "You didn't make the full 14. No funds returned. Try again with a new Pact?" (Tactful copy.)
7. **21:03** Both get a "Pact partner badge" in their achievements.
8. **21:05** Coach (both) acknowledges in tone.

### What happens emotionally

- The stake adds weight. Maya was more careful during the Pact knowing money was on the line.
- Sam's loss is tactful — no shame, just honest. He can retry.
- The Pact deepens their friendship around the journey.

### Analytics

See `03_NEW_FEATURES.md` §3 Pact analytics events.

### Verification

- `coreState.pacts[]` has the completed Pact with outcome.
- Stripe webhook confirms settlement.
- Both users' badges updated.

### Edge cases

- **Sam fails to install CORE within 48h:** Pact invitation expires. Maya's stake refunded automatically.
- **Maya tries to start a 2nd Pact while 3 are active:** blocked. Toast "Max 3 active Pacts."
- **Both Maya and Sam slip mid-Pact:** at day 14, both get $4 refund (90%). Both lose proudly.
- **Maya tries to abort Pact mid-flow:** abort possible but forfeits stake. Confirmation required.

---

## §5. The Day-30 Body Receipt

### Scenario

Maya is on day 30. It's Sunday afternoon. The Body Receipt prompt fires.

### Step-by-step

1. **Day 30 Sunday 14:00** Maya opens CORE.
2. **14:00** Dashboard shows Body Receipt prompt card.
3. **14:01** Maya taps "Yes" → `body-receipt.html`.
4. **14:01** Welcome screen: "This is your weekly receipt. 3 minutes."
5. **14:02** Step 2: Breath hold timer.
6. **14:02** Instructions. Maya taps START.
7. **14:02** Ring fills. Maya holds breath.
8. **14:03** Maya taps LET GO at 52 seconds.
9. **14:03** Comparison shown: "Last week: 47s. This week: 52s. +5s — your lungs are healing."
10. **14:04** Step 3: Apple Health sync. Maya has it connected → auto-pulls last week's data.
11. **14:04** Sleep avg 7.3hrs, weight 162lbs (-3 from last week), HRV 55 (+3), mindfulness 18 min.
12. **14:05** Maya edits weight to 161 (she just weighed today, 1lb less). Save.
13. **14:05** Step 4: Optional photo. Maya taps "Skip" (photo opt-in is off by default).
14. **14:06** Step 5: Reflection.
    - "How did this week feel?" Mood 5 (good).
    - "What changed in your body?" "Morning breath felt easier all week."
    - "What's one thing you noticed?" "No vape cravings on the drive home anymore."
15. **14:08** Step 6: Summary screen showing breath delta, mood, notes.
16. **14:09** Maya taps Save.
17. **14:09** Receipt saved. Returns to dashboard with success toast.
18. **14:10** Dashboard shows Body Receipt strip at top: 4 receipt thumbnails.

### What happens emotionally

- Maya sees objective evidence her body is changing. This is irreplaceable for retention.
- The 5-second breath improvement makes the work feel tangible.
- The Coach quote in summary is calm: "Your lungs are healing. You're doing the work."

### Analytics

See `03_NEW_FEATURES.md` §4.

### Verification

- `coreState.bodyReceipts[3]` is the just-completed receipt.
- Delta computed correctly.
- Stats updated if applicable.

### Edge cases

- **Maya hasn't done Apple Health setup:** Step 3 skipped seamlessly.
- **Breath hold under 10 seconds first try:** retry prompt.
- **Photo storage full:** prune oldest photos.

---

## §6. The Day-30 Lifetime Offer

### Scenario

Maya is on day 30. Account age is exactly 30 days.

### Step-by-step

1. **Day 30, 19:00** Maya opens dashboard.
2. **19:00** Dashboard renders. Lifetime offer card appears between achievement teaser and quick actions.
3. **19:01** Card copy: "You've been with Core for 30 days. We see you. Most users who reach this point keep going. If you want, you can buy Lifetime now — $89 one-time, never another bill. No upsell. No regret. Just settled."
4. **19:02** Two CTAs: "Yes, lock it in." / "Not today."
5. **19:04** Maya taps "Yes, lock it in" → `lifetime-offer.html`.
6. **19:05** Full pricing comparison. Pro Yearly vs Lifetime: $44.99/year forever vs $89 one-time = breakeven at 2 years.
7. **19:06** Maya taps confirm. Stripe processes.
8. **19:07** Success: Lifetime activated. Confetti.
9. **19:08** Returns to dashboard. Lifetime badge in top bar.

### What happens emotionally

- Maya has experienced the app for 30 days. She knows the value. The offer doesn't feel manipulative.
- The "no more bills" framing is real and resonates.

### Analytics

- `lifetime_offered {context: 'day_30_dashboard'}`
- `lifetime_offer_tapped`
- `lifetime_offer_viewed`
- `lifetime_purchased {price: 89}`

### Verification

- `coreState.lifetime.purchased = true`.
- `coreState.lifetime.purchasedAt = timestamp`.
- All future paywalls suppressed.

### Edge cases

- **Maya declines:** offer hidden until day 90.
- **Maya already on yearly subscription:** offer recognizes and discounts $20 to compensate for unused yearly time.
- **Stripe fails:** error message + retry.

---

## §7. The Witness Ping

### Scenario

Maya is on day 14. Time is 14:30 Wednesday. Her past slip data shows 60% of slips occurred 14:00-15:00 weekdays + matching Instagram usage in the last 15 minutes.

### Step-by-step

1. **14:30** Background tick fires Witness check.
2. **14:30** Confidence: 0.74 (time 0.6 × 0.25 + day 0.55 × 0.10 + apps 0.85 × 0.30 + place 0.0 × 0.15 + stress 0.35 × 0.20 = roughly 0.55... actually let me redo: 0.15 + 0.055 + 0.255 + 0 + 0.07 = 0.53. Wait, let me adjust assumption — let's say apps matched at 0.95 → 0.285, time at 0.78 → 0.195, day at 0.7 → 0.07, stress at 0.5 → 0.10, place 0 → 0. Total: 0.65. Just over threshold.)
3. **14:30** Witness fires `witness_ping_fired`. Local notification:
   - Title: "Coach"
   - Body: "Heads up. This is one of your slip windows."
4. **14:31** Maya gets notification, taps it.
5. **14:31** App opens to dashboard. Witness ping card is at top.
6. **14:31** Card content: Coach avatar, message "Heads up. Stress + early afternoon, with Instagram in the loop. I'm here." 3 buttons: "Walk me through it" / "I'm steady" / "Not a real pattern."
7. **14:32** Maya was indeed feeling a craving. She taps "Walk me through it."
8. **14:32** Routes to `coach-during-craving.html`. Breath ring. Quick replies.
9. **14:33** Maya does box breath for 60s. Slip averted.
10. **14:34** Returns to dashboard. Witness ping card dismissed. Coach craving result celebrates the win.

### What happens emotionally

- Maya feels: a little shocked the app saw her pattern. Then: relieved that she had help in the moment.
- This is the **wow moment** for Witness. A correct ping = paid conversion sealed.

### Analytics

- `witness_ping_fired {confidence: 0.65, signals: ['time', 'day', 'apps', 'stress']}`
- `witness_ping_engaged {action: 'engaged', timeToAct: 60}`
- `coach_during_craving_viewed`
- `panic_completed`
- `coach_craving_result_viewed`

### Verification

- Witness state.pingHistory updated.
- Witness pattern weights stable.

### Edge cases

- **Maya taps "Not a real pattern":** mute follow-up asks which signal. She picks Apps. Apps muted 7 days.
- **Maya taps "I'm steady":** neutral dismiss. No learning impact.
- **Witness fires at 23:00 (DND):** suppressed. Logged for next morning briefing.

---

## §8. The Churning User

### Scenario

Maya is on day 95. Her engagement has dropped. She opens CORE less. She's considering canceling.

### Step-by-step

1. **Day 95** Maya opens Settings → Subscription → "Cancel subscription."
2. Routes to `cancel.html` Step 1.
3. Step 1: "What's the reason?" Multi-select. Maya picks "I'm doing fine without checking in" and "I forget to use it."
4. Step 2: 4 retention offers:
   - "Pause 30 days, come back any time."
   - "50% off next 3 months."
   - "+2 streak freezes this week (free)."
   - "Streak Insurance · $1.99/mo (unlimited freezes + auto-restore)."
5. Maya considers. Picks Pause 30 days.
6. Subscription pauses. Maya keeps streak. Returns to dashboard with "Paused · 30 days remaining" pill.
7. **Day 125** Maya gets push: "Your pause ends in 5 days. Welcome back when you're ready."
8. **Day 130** Pause ends. Subscription resumes.

### Step-by-step (alternative — she still cancels)

If Maya declines all retain offers:
1. Step 3: loss-confirm. Explicit list:
   - "You'll lose access to Witness."
   - "Your Promise Letter stays — you can read it always."
   - "Your stats reset on day 8 of no Pro."
   - "Body Receipts stay private to you."
2. Maya taps "Cancel anyway."
3. Subscription cancels at end of period.
4. Maya keeps Free tier features (basic dashboard, 1 habit, 50 Coach messages/mo).

### What happens emotionally

- Maya feels respected. No dark patterns. Offers feel real.
- Pause is a good off-ramp — she doesn't lose anything, just steps back.

### Analytics

- `cancel_viewed`
- `cancel_reason_selected {reasons}`
- `cancel_retention_offer_shown {offers}`
- `cancel_retention_offer_accepted {offer: 'pause_30'}`
- `cancel_completed` (only if she actually cancels)

### Verification

- Pause state stored correctly.
- All features gate per subscription state.

---

## §9. The Crisis Path

### Scenario

Maya is on day 50. Suicidal ideation surfaces during a Coach conversation.

### Step-by-step

1. **23:14** Maya is in Coach. Types: "I don't think I want to be here anymore."
2. **23:14** Coach response router detects crisis intent.
3. **23:14** Coach reply: "I'm here. Before we talk more — I want to make sure you're safe."
4. Plus action card: "Open Crisis screen."
5. **23:15** Maya taps the action card. **NO confirmation modal** (crisis exception). Routes to `crisis.html`.
6. **23:15** Crisis screen renders. Coach greeting: "Maya. You're not alone. I'm here." Tone forced to Gentle.
7. **23:15** Crisis lines for her region (AU based on locale): 13 11 14 (Lifeline) prominent.
8. **23:16** Maya taps the line → phone dials.

### Alternative — Maya doesn't call

1. **23:16** Maya taps "Try a 60-second breath." Breath ring starts (4-7-8, more calming).
2. **23:17** Maya completes breath.
3. **23:17** Coach: "Stay with me. What's one tiny thing you can do right now?"
4. **23:18** Maya types: "Drink water."
5. **23:18** Coach: "Yes. Do that. I'm here. Tap any line when you want."

### Crisis mode activates

1. Maya taps "I need to step away."
2. Crisis mode activates for 24 hours.
3. All gamification mutes. Witness disabled. Notifications suppressed.
4. Dashboard shows persistent Crisis pill.
5. Coach tone forced to Gentle.
6. If Pact partners enabled it, they're notified (with consent): "Maya is in crisis mode. Reach out gently."

### After 24 hours

- Crisis mode auto-exits.
- Coach checks in: "How are you?"
- User can extend if needed.

### What happens emotionally

- Maya feels: held. The app didn't panic, didn't try to upsell, didn't gamify the moment.
- This is the **safety feature** that justifies the brand.

### Analytics

- `coach_msg_sent` (with crisis keywords)
- `coach_action_proposed {action: 'crisis'}`
- `coach_action_executed {action: 'crisis'}`
- `crisis_viewed`
- `crisis_line_tapped {region: 'AU'}` OR `crisis_breath_started`
- `crisis_mode_activated`

### Verification

- Crisis mode flag set with expiry.
- All systems respect Crisis mode.

### Edge cases

- **User is in Witness ping moment AND has crisis intent:** Crisis takes priority always.
- **User exits Crisis mode early via Settings:** allowed, no shame.

---

## §10. The Day-90 Report

### Scenario

Maya hits day 90.

### Step-by-step

1. **Day 90, 09:30** Maya opens CORE. Auto-routes to celebration tier 100... wait, tier 90 is not in the standard list (7/14/30/60/100/365). Let me adjust: actually the spec adds tier 90 OR tier 100. Let's use tier 100 (day 100) for the Report milestone. Or alternatively let's use tier 90 since that's what the spec called out.

OK rewrite for clarity: tier 90 IS a celebration tier with the Report.

1. **Day 90, 09:30** Maya opens CORE. Auto-routes to `streak-celebration.html?days=90`.
2. **09:30** Celebration. +750 XP (special tier). New rank: Peak.
3. **09:32** Card slides up: "Your 90-Day Report is ready."
4. **09:33** Maya taps "Open."
5. **09:33** Routes to `report-90.html`.
6. **09:34** Report sections render:
   - Streak history heatmap
   - Slip count: 8 total. Recovery: 8/8 completed.
   - Stat changes: Lungs 50→89 (+39). Brain 50→81 (+31). Wallet 50→67 (+17). Willpower 50→90 (+40). Body 50→76 (+26).
   - Top triggers: Stress (38%), After meal (22%), Boredom (18%).
   - Coach tone usage: Gentle throughout.
   - Body Receipts highlights: Breath hold 47s → 71s (+24s).
   - Achievements unlocked: 14.
   - Pacts won: 2.
   - Coach-written summary paragraph (Gentle tone).
7. **09:38** Maya scrolls. Taps "Download PDF."
8. **09:38** PDF generates via `html2canvas` + `jspdf`.
9. **09:39** PDF downloads. Maya can share.

### What happens emotionally

- Maya feels: pride, accomplishment, ownership. The Report is HERS.
- The shareable nature creates organic marketing.

### Analytics

- `milestone_reached {tier: 90}`
- `report_90_viewed`
- `report_90_pdf_downloaded`
- `report_90_shared {channel}`

### Verification

- All sections render with real coreState data.
- PDF generates correctly.

---

## §11. Cross-journey integration

These journeys must work together. Specifically:

- **Witness ping during a Pact:** Pact partner is notified Maya is in a high-risk window. They can cheer proactively.
- **Slip during a Pact:** standard slip flow + Pact partner gets notified.
- **Crisis mode during a Pact:** Pact paused for duration of crisis. No outcome until crisis resolves.
- **Lifetime purchase during onboarding:** flagged as suspicious, requires 30-day usage confirmation. Lifetime offer remains gated.
- **Trial expires during Pact:** Pact honored. Free user can still see Pact features. Subscription prompt deferred.

---

## §12. End-of-file verification

After implementing all journeys:

1. Manually walk each journey end-to-end. Time the new-user journey — should be < 4 minutes.
2. Run automated Playwright tests for each.
3. Verify analytics events from each journey appear in correct order in `dev/metrics.html`.
4. Check state at end of each journey matches expected.
5. Test journey resumability — force-close at random points, reopen, verify state recovers.

Commit. Next file: `06_EXECUTION_PLAN.md`.
