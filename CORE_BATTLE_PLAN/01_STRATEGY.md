# 01 — STRATEGY

> Read `00_README.md` first. This file assumes you have.

This is the **why** behind every feature, page, and pixel in CORE. When in doubt during implementation, return here. If a feature decision conflicts with this strategy, the strategy wins.

---

## §1. The five wedges

CORE wins against Reload and The Lock In on five wedges. Every feature must serve at least one. Features that serve none get cut.

### Wedge 1 — Niche specificity (Vape)

Reload addresses: "your phone addiction + bad habits + porn."
Lock In addresses: "your focus + productivity + discipline."
CORE addresses: **"the vape in your pocket."**

This is the smallest knife. Therefore it cuts deepest.

When a user opens the App Store, types "quit vaping," and sees:
- Reload: "Reset your life in 60 days" → sounds like a discipline app
- Lock In: "Discipline made simple" → sounds like a focus app
- CORE: **"Quit vape. Become your core."** → sounds like the answer to their exact search

CORE wins the install. Every screen below must reinforce that the user is on a vape-specific journey, not a generic discipline journey.

**Implementation rules:**
- Every screenshot in App Store listing shows a vape-related screen as primary (slip log, lung stat, panic during craving).
- The five-stat model leads with **LUNGS** as the first orb (visually largest in some compositions).
- The Coach's default opener references vape: "I'm Coach. I'll help you quit vape. Your way."
- The crisis flow includes a vape-specific question: "Are you craving right now?" before any other intervention.
- Onboarding quiz includes 3 vape-specific questions (last puff, how many per day, when you started) NEITHER competitor asks.
- Day 30 unlock: user can add a second habit, but the headline of CORE stays "Quit vape."

### Wedge 2 — Visceral feedback (Inverse gamification)

Reload and Lock In are **additive** — you do things, numbers go up.
CORE is **subtractive** — you slip, you visibly lose what you built.

This is psychologically more powerful for addiction recovery because addiction *is* a loss spiral. CORE's mechanic matches the user's lived experience.

Specifically: when a user logs a slip, they see:
- A smoke particle animation rising from the affected stat orb
- The orb fill drops in real time (animated, not jump-cut)
- The Life Score number decrements with a "drag" easing (not a clean tick)
- A subtle haptic "miss" pattern (warning, not pleasure)
- The Coach insight banner shifts to the slip-takeover tone within 200ms

This is **not** punishment. It is honest feedback. The user knows what they did; the app shows them what it cost. The Coach immediately reframes: "I saw you tap. No lecture. Walk me through the trigger when you're ready."

**Implementation rules:**
- The smoke animation is **never skippable**. It always plays at least 800ms.
- The XP loss number is **shown explicitly**: "-25 XP" with a downward arrow icon.
- The streak doesn't break instantly — there's a 5-second "are you sure" window where the user can mark it as a "tap but no inhale" (XP +5, no slip).
- The Coach takeover follows within 1 frame of slip confirmation.
- No achievement, badge, or notification can fire during the slip animation. The moment is sacred.

### Wedge 3 — AI Coach with personality (4 tones)

Reload's "Miro" is a generic chatbot with no personality system.
Lock In's "Bob" has personalization but a single voice — friendly-coach default.
CORE's Coach has **4 distinct voices** the user picks during onboarding:

| Tone | Voice | Example response to a slip |
|---|---|---|
| Gentle | Warm, parental, soft | "Hey. It's okay. Tell me when you're ready." |
| Balanced | Equal parts kind and direct | "Slip happened. Let's see what set it up." |
| Direct | Honest, no euphemism, no shame | "You slipped. Here's what I noticed in your patterns." |
| Drill | Sharp, accountability-coded | "Tap was on you. Reset your stance. What's the trigger?" |

The same data, four entirely different surfaces. Users who'd churn from Reload's saccharine coach can pick "Drill." Users who'd churn from a harsh coach can pick "Gentle."

**Implementation rules:**
- Every Coach string in `08_COPY_LIBRARY.md` has 4 variants. **No exceptions.**
- The user can switch tone any time in Settings, but the switch is logged as `coach_tone_changed` with both old and new.
- A free 1-minute "tone test" (3 question quiz) is offered in onboarding for users who don't know which to pick.
- The tone is **never hidden** — the Coach screen header always shows the current tone label as a small chip ("Direct" / etc.) so the user knows the lens they're hearing through.

### Wedge 4 — Predictive Witness (Slip prevention, not just slip response)

Reload and Lock In are **reactive** — you log a slip, they respond.
CORE is **predictive** — the Coach watches behavioral patterns and pings BEFORE the slip.

This is the Witness feature (see `03_NEW_FEATURES.md` §1). It uses:
- Time-of-day patterns (slips cluster at specific hours per user)
- App-usage patterns (with permission: Screen Time API in iOS)
- Location patterns (with permission: "you're near the petrol station where you slipped twice")
- Streak-stress patterns (slips often follow 2+ days of declining stats)
- Self-reported triggers from past slips

When a pattern matches, the Coach sends a calm, tone-aware ping: "Heads up — this is one of your slip windows. Want a 60-second panic flow, or are you already steady?"

The user can accept the help, dismiss, or mark it as "not relevant" (which improves the model).

**Implementation rules:**
- Witness is **off by default**. User opts in during onboarding step 4 (Permissions) with a clear explanation of what it watches.
- Witness pings are **rate-limited to 3/day max**.
- Witness pings **never fire** between 11pm–7am unless the user is in self-declared Crisis mode.
- Each ping has a "Not relevant" button that teaches the model. Three "Not relevant" responses in a category temporarily mute that pattern.
- The model is **fully local** for v1. No server. No cloud LLM in the loop. (Server-side prediction is a v2 upgrade.)

### Wedge 5 — Pact System (Social with money on the line)

Reload removed its social features (replaced by passive leaderboard).
Lock In removed its "Duo" mode (real-time co-focus).
Both retreated from social because social-without-stakes is noise.

CORE adds **social with stakes**: the Pact System.

A Pact is:
- Two users mutually commit to a shared challenge (e.g., 14 days clean)
- Each stakes $5 (held by the app via Stripe / RevenueCat)
- If both complete: each gets their $5 back + a Pact badge
- If one slips and the other doesn't: the slipper's $5 goes to the partner (minus 10% platform fee)
- If both slip: both get a $4 refund (10% goes to platform)

This converts friendship into a commitment device. It's also viral by design — a user can't Pact alone, so every Pact is one new user invitation.

**Implementation rules:**
- Pacts are **opt-in only** and not promoted until day 14 of a user's own streak.
- Maximum **3 active Pacts** at once (avoid social overload).
- Pact invitations expire in 48 hours (urgency, not pressure).
- The Pact screen shows the **psychological frame**: "This isn't about the money. The money makes you mean it."
- All Pact transactions are recorded immutably for transparency.
- Stripe / RevenueCat handles the funds — CORE never holds user money directly.
- Users in financial hardship can opt for a $1 Pact (still meaningful, lower friction).

---

## §2. The competitor parity matrix

Below is every notable feature in Reload and The Lock In and what CORE does about it.

Legend:
- ✅ = CORE matches or beats
- 🚧 = CORE matches partially, must close gap
- ❌ = CORE doesn't have, this spec adds
- ⤴ = CORE leapfrogs (has something they don't)

| Feature | Reload | Lock In | CORE today | CORE after spec |
|---|---|---|---|---|
| 60-day custom plan from onboarding | ✅ | — | 🚧 (14-step quiz, no plan output) | ✅ (quiz outputs personalized 90-day plan) |
| App/website blocking | ✅ (unbypassable) | ✅ (per session) | ❌ | ✅ (CORE Shield — vape-trigger sites, custom windows, unbypassable) |
| NSFW content blocker | ✅ | — | ❌ | 🚧 (v2 — out of vape niche, deferred) |
| Scheduled blocking | ✅ | — | ❌ | ✅ (built into CORE Shield) |
| Extreme / Trenches mode | ✅ ("Extreme") | ✅ ("Trenches") | ❌ | ✅ (CORE's "Lockdown" — 7 days, no settings access) |
| Multi-intensity focus sessions | — | ✅ (3 levels) | ❌ | ✅ (CORE Sessions — 5 levels, with breath ring) |
| Per-session app blocking | — | ✅ | ❌ | ✅ (CORE Sessions enforce via Shield) |
| Custom shield screens | ✅ | — | ❌ | ✅ (4 themes — Coach face / streak count / Promise / black) |
| Recovery Goals | ✅ (text) | — | 🚧 (recovery-quest.html) | ✅ (Recovery Quests with rewards, multi-step) |
| Focus Score / Discipline Score | ✅ | ✅ | 🚧 (Life Score) | ⤴ (Life Score from 5 stats, more meaningful) |
| XP + leveling | ✅ | ✅ | ✅ | ✅ |
| Ranked tier system | ✅ | ✅ (14 tiers) | 🚧 (7 tiers) | ✅ (expanded to 13 tiers with unlocks) |
| Leaderboards | ✅ (open) | — | 🚧 (basic) | ⤴ (Recovery Quality ranking, friends-only) |
| Attribute stats / multi-stat | ✅ (basic) | — | ✅ (5-stat) | ⤴ (5-stat with cross-links: TDEE, sleep→willpower, etc.) |
| Habit heatmap | ✅ | ✅ | ✅ (streak-board.html) | ⤴ (with slip overlay + freeze cyan) |
| Personal stats profile | ✅ | ✅ | ✅ | ✅ |
| Journal | ✅ | ✅ (with mood/energy tags) | ❌ | ✅ (Body Receipts include reflection journal) |
| Book summaries library | ✅ | — | ❌ | 🚧 (CORE Library — curated 20 books, vape-relevant) |
| Brain-power games | ✅ | — | ❌ | — (skip — not aligned with niche) |
| Relaxation sounds | ✅ | — | ❌ | ⤴ (Calm Library — Coach-voiced custom scripts) |
| Mindful affirmations | ✅ (generic) | — | ❌ | ⤴ (Promise Letter — Coach writes user's own affirmation) |
| AI coach | ✅ (Miro) | ✅ (Bob) | ✅ (Coach) | ⤴ (4-tone Coach + Witness + Promise Letter) |
| Agentic AI (does tasks) | — | ✅ | ❌ | ✅ (Coach can start sessions, set Witness windows, draft Pacts) |
| Deep user profile / "Brain" | — | ✅ (Bob's Brain) | 🚧 (quiz answers stored) | ✅ (Core Profile — deeper, updates over time) |
| Real-time predictive coaching | — | — | ❌ | ⤴ (Witness — neither competitor has this) |
| Pact / money-stake commitment | — | — | ❌ | ⤴ (entirely novel to category) |
| Body / lung scan | — | — | 🚧 (scan-body.html exists) | ⤴ (weekly Body Receipts with lung function timer) |
| Crisis / panic flow | — | — | ✅ (crisis.html, panic.html) | ✅ |
| Social feed | — (community section) | — (removed) | ✅ (feed.html) | ⤴ (friends-default, public opt-in) |
| Pact-style social | — | — (removed Duo) | ❌ | ⤴ |
| Streak insurance | — | — | ✅ ($1.99 addon) | ✅ |
| Streak restore | — | — | ✅ ($0.99 one-shot) | ✅ |
| Streak freeze | — | — | ✅ (weekly free) | ✅ |
| 7-day free trial | ✅ | ✅ | ✅ | ✅ |
| Lifetime pricing tier | ✅ ($24-49) | — | ❌ | ✅ ($89 one-time, after 30-day usage) |
| Sub price (yearly) | $39.99–$49.99 | $44.99 | $59.99 | $44.99 (match Lock In) |
| Multi-language | ✅ (10) | ✅ (7) | ❌ (en only) | 🚧 (en + es + pt for v1, more deferred) |
| Widgets | ✅ | ✅ | 🚧 (widgets.html preview only) | ✅ (3 widget sizes — streak, stats, Coach line of the day) |
| Apple Watch | — | — | ❌ | 🚧 (deferred to v1.1) |
| Onboarding customization | ✅ | ✅ | ✅ | ✅ |
| Sign in with Apple/Google | ✅ | ✅ | ✅ | ✅ |
| Referral / give-month-get-month | — | — | ✅ | ✅ |
| B2B coach platform | — | — | 🚧 (preview only) | ✅ (full coach dashboard, $399/mo) |
| Press kit / ASO assets | — | — | ✅ (previews) | ✅ |

**Net result after this spec:** CORE has 11 features neither competitor has (⤴), matches them on 22 features, and trails on 3 (NSFW blocker — deliberate, deferred), language count (deferred), Apple Watch (deferred).

---

## §3. Pricing strategy

Current CORE pricing: $7.99/mo · $44.99/yr.
Reload: $39.99–$49.99/yr + lifetime.
Lock In: $44.99/yr.

**Resolved:** CORE now prices at $7.99/mo · $44.99/yr — matching Lock In's annual anchor while (after this spec) carrying the most features. No longer the most expensive.

**New CORE pricing:**

| Tier | Price | What's included |
|---|---|---|
| Free | $0 | First 7 days of streak data, basic dashboard, 1 habit (vape), basic Coach (50 messages/mo), no Witness, no Pacts |
| **Pro Monthly** | $7.99/mo | Everything |
| **Pro Yearly** | $44.99/yr ($3.75/mo, save 53%) | Everything |
| **Pro Lifetime** | $89 one-time (offered only after day 30 of usage) | Everything, forever |
| Streak Insurance addon | $1.99/mo | Unlimited freezes + auto-restore on first slip + chains across habits |
| Pact stake | $5 (or $1 hardship) | Per Pact, refundable |

**Why these numbers:**

- Monthly $7.99 vs Lock In $5.99 — we're $2 more, justified by 11 ⤴ features. Don't drop monthly; trial-to-yearly conversion is the play.
- Yearly $44.99 — exact match to Lock In. We don't undercut (signals desperation), we match and out-feature.
- Lifetime $89 — undercuts Reload's $49 dramatically? **No.** Reload's $49 is suspicious (high CAC reclaim) and 10x worse-priced for them long-term. We anchor at $89 with the 30-day usage gate, meaning every lifetime user is a committed user with low refund risk.
- The 30-day usage gate is **critical** — it means Lifetime is a reward for proven habit, not an impulse purchase. This is unique in the category.
- Streak Insurance addon at $1.99 is the same as today. Unchanged.
- Pact at $5 is held by Stripe, not us. We earn 10% on losing-pact payouts. Pure upside, no float risk.

**The Lifetime gate copy:**

> "You've been with Core for 30 days. We see you. Most users who reach this point keep going. If you want, you can buy Lifetime now — $89 one-time, never another bill. No upsell. No regret. Just settled."

**No dark patterns:** Lifetime is offered **once** at day 30. If declined, it's offered again at day 90 with a "still here, still serious" framing. If declined again, it's available in Settings but never popped up unprompted again. Reload would offer it 17 times. We offer it 2.

---

## §4. The brand voice

The Coach speaks. The app, in marketing and in non-Coach UI, speaks too. The brand voice is:

- **Calm, never urgent.** Urgency is for crisis. Everything else is steady.
- **Honest, never euphemistic.** "Slip" not "lapse." "Lost streak" not "streak ended." "Owe" not "owe yourself."
- **Specific, never generic.** Not "build better habits" — "quit vape, then add what matters."
- **Adult, never patronizing.** Users are not children. They know what vape does.
- **Earned, never given.** Features unlock with commitment. Praise unlocks with progress. Lifetime unlocks with 30 days.

**Forbidden words in CORE copy:**
- "Journey" (overused, vague — use "first 30 days," "second month," "this stretch")
- "Wellness" (insurance-coded — use "health" or skip)
- "Mindfulness" (over-marketed — use "calm," "presence," "minute")
- "Empower" (corporate — use "give you" or skip)
- "Crush it" / "level up" (gym-bro — use "make it" or "step up")
- "Bestie" / "friend" (when not literal — use "Coach" or the user's name)
- "Game-changer" (banned)
- Any phrase ending in "!!" (single ! permitted in celebrations only)

**Required words in CORE copy (use often):**
- "You" (second person dominant)
- "Steady" (calm modifier)
- "Witness" / "Watch" (Coach observational)
- "Promise" (the commitment)
- "Mean it" (the verb of intention)
- "Become" (the brand verb — "Become your core")

---

## §5. The aesthetic principles

See `07_AESTHETIC_BIBLE.md` for the full system. Strategic summary:

- **Jarvis × Apple Vision Pro** — deep black, soft glow, glass surfaces, electric blue accent.
- **Motion as evidence** — every state change has a motion that *means* something. Stats fade in (build), drop out (slip). The streak number pulses on milestone days. The Coach's reply bubble breathes (subtle vertical 0.5px float).
- **Sound is a feature.** Slips have a sound. Recoveries have a sound. Milestones have a sound. The sounds are *muted by default* and re-enabled deliberately by the user — but the assets exist and are designed.
- **Haptics are emotion.** A miss haptic on slip. A confirm haptic on Promise. A celebration haptic on milestone. A breath haptic on panic (4-4-4-4 pulse).
- **Type is structure.** SF Pro Display for headers, SF Pro Text for body. No serif anywhere. Numerics use tabular figures (`font-variant-numeric: tabular-nums`).
- **Color discipline.** Electric blue `#2F8FFF` for primary CTAs. Red `#FF4F6B` for slip/loss. Amber `#FFC857` for warning/today-deltas. Violet `#9F8FFF` for celebration/milestones. Cyan `#5BB1FF` for breath/calm. Six colors, used consistently, no exceptions.
- **No drop shadows on text.** Glow only (via filter).
- **No gradients on body text.** Gradients reserved for: brand wordmark, primary CTA, milestone numbers, and the "you'd be" emphasis on the index hero.

---

## §6. The user we're building for

The CORE user is:

- **22–38 years old** (the vape addiction demographic peak)
- **Tried to quit before** (sometimes 5+ times)
- **Knows vaping is bad for them** (we don't need to convince them)
- **Skeptical of quit apps** (most "quit smoking" apps feel medical; CORE feels personal)
- **Phone-fluent** (will tolerate complexity if it earns its keep)
- **Lonely in their attempt** (most quit alone; CORE adds witness without judgment)
- **In some form of pain** (anxiety / boredom / sleep / weight / relationship strain that vape is masking)

**They don't want:**
- Lectures about cancer
- Calculators showing money saved (they know; it's not the issue)
- Bro-coded discipline content
- Pastel "wellness" aesthetics
- 50-step onboarding

**They do want:**
- A reason to believe **this** attempt is different
- Someone calmly in their corner who knows what they did and doesn't shame them
- Visual evidence they're changing
- A way to mean it that costs them something (Promise + Pact)
- Out of the loneliness without joining a forum

**Implementation rules:**
- Don't show "Money saved" on dashboard by default. It's available in Settings → Insights but not surfaced.
- Don't show cancer/disease stats. The Coach references "your lungs working better" not "your reduced cancer risk."
- Don't reward "perfection." Reward consistency (which includes slips + recovery).
- Don't gamify in ways that feel arbitrary — every XP gain has a reason in copy.
- Don't add features that increase admin (more forms, more tags, more configuration). The user is here to quit vape, not manage an app.

---

## §7. The narrative arc per user

A CORE user's first 90 days have a deliberate narrative shape. Every page must serve this arc.

### Days 0–1: The Promise

- User downloads. Splash → trial.html.
- Types the literal word PROMISE.
- Picks a Coach tone (or takes the test).
- Picks a check-in time.
- Sees the 7-day free trial pitch.
- First Coach message lands within 60 seconds: "Got it. We start now."

**Emotional state:** Tentative belief. Most have failed before.

### Days 2–6: The Honeymoon

- Streak counter climbs.
- Coach is encouraging but not effusive.
- Witness fires its first ping (typically day 3-4).
- User may slip — recovery flow proves the system is honest, not punitive.
- Day 6: Coach mentions "day 7 is tomorrow."

**Emotional state:** Cautious optimism. Watching for the catch.

### Day 7: The Milestone

- Streak celebration with confetti, aurora rays, +50 XP.
- **The Promise Letter is delivered** — Coach writes user a letter "from the version of you who made day 365."
- Letter is stored. Resurfaces at 30, 60, 100, and near-slips.
- Pricing screen offers yearly conversion ($44.99). No lifetime yet.

**Emotional state:** Real belief. "I might actually do this."

### Days 8–14: The First Test

- Honeymoon dopamine fades. Real cravings hit.
- Witness is calibrated by now and fires meaningfully.
- Coach insight cards appear ("you missed a check-in") with no shame.
- Slips, if they happen, are 2-3 in this window. Each is met with recovery.
- Day 14: Pact System unlocks. First friend invite prompt.

**Emotional state:** Frustration + commitment. "This is harder than I thought."

### Days 15–29: The Grind

- Stats stabilize. Life Score in 60-75 range typical.
- Friends invited via Pact have either joined or not.
- Coach starts referencing data patterns ("your morning slips have dropped 60%").
- Body Receipts begin (week 3) showing breath-hold time improvement.

**Emotional state:** Identity shift starting. "I'm someone who's quitting."

### Day 30: The First Mountain

- Streak celebration (250 XP, ranked badge).
- **Lifetime offer first appears.** "$89 once, never again."
- First bonus habit slot unlocks. Coach asks: "Want to add one? You don't have to."
- Body Receipt week 4 — visible lung function improvement.

**Emotional state:** Pride + commitment. "I'm doing it."

### Days 31–60: The Steady

- Rhythm. Daily check-ins. Occasional slips. Quick recoveries.
- The Promise Letter resurfaces day 30 and 60.
- New Pacts. Some Pacts close (won or lost).
- Coach starts talking about "what's next" — the post-vape identity.

**Emotional state:** Settled. "This is who I am now."

### Day 60: The Second Mountain

- Streak celebration (500 XP).
- Coach: "Halfway to 4 months. Want to share your story?" → opt-in to public profile.
- Second bonus habit slot unlocks (only available if first one was used consistently).

**Emotional state:** Confident. "I can help others."

### Days 61–89: The Maintenance

- Slips, if any, are rare and recover fast.
- Pact streak partners may have churned. Coach addresses this: "Some friends drop off. Yours is yours."
- Life Score stabilizes in 80-90 range.

**Emotional state:** Quiet. "I'm not the person who used to vape."

### Day 90: The Third Mountain

- Streak celebration (1000 XP).
- **The 90-Day Report** generated — PDF + shareable card.
- Coach offers: "Want to mentor a new user?" → B2C-to-coach pathway (advanced).
- Lifetime offer reappears with "still here" framing.

**Emotional state:** Mastery. "I did this."

### Days 91+: The Long Game

- Streak passes 100 → 365 → multi-year.
- Coach mode shifts to "maintenance + new habits."
- User may invite their own friends → Pacts → potential coach platform usage.

---

## §8. Anti-strategy — what we explicitly reject

Some patterns are common in the category and CORE will not use them.

- **Loss-aversion rage notifications.** "Don't lose your streak! You haven't logged today!" → No. Notifications inform, never coerce.
- **Fake social proof.** "5,000 people quit this week!" → No. We show real numbers (which start small) and trust the user.
- **Streak loss as guilt.** Slip = honest event, not moral failing. Copy never reads "you let yourself down." It reads "slip happened."
- **Subscription dark patterns.** Cancellation is one tap from Settings. The cancel flow offers retention (pause, freeze, switch tone) but never hides the exit.
- **Permission-creep.** We ask for Notifications + Screen Time when needed, with clear value statements. We never bundle permissions or pre-check boxes.
- **Engagement-for-engagement's-sake.** Daily login streaks for *using the app* are forbidden. We reward the *real-world* streak, not the app-open streak.
- **Selling user data.** The privacy policy explicitly forbids it. Analytics are anonymous events. Coach conversations are stored locally + encrypted in transit.
- **AI hallucination.** Coach responses go through a "safety pass" before display. Never invents medical advice. Never references specific drugs. Always defers to the Crisis screen for self-harm content.

---

## §9. The naming bible

Some terms are sacred. Use these exactly, everywhere.

| Concept | Use this | Never use |
|---|---|---|
| The app | "Core" or "CORE" (caps in logo, lowercase in copy after first mention) | "the app," "Quit Vape app" |
| The AI | "Coach" (capitalized always) | "AI," "assistant," "chatbot," "Miro," "Bob" |
| A vape incident | "slip" | "lapse," "relapse," "fall," "mistake" |
| The commitment | "Promise" (capitalized) | "pledge," "contract," "commitment" |
| The recovery flow | "Recovery" (capitalized when referring to the named flow) | "comeback," "redemption" |
| The 5 stats | "Lungs / Brain / Wallet / Willpower / Body" exactly | "stat 1," anything else |
| The overall metric | "Life Score" | "score," "rating," "Discipline Score," "Focus Score" |
| The streak | "streak" | "run," "chain," "row" |
| The rank | "rank" (lowercase) or "Rank" (when standalone label) | "tier," "level" |
| The ranks themselves | "Focus / Spark / Flow / Forge / Edge / Peak / Apex / [expansions]" | anything else |
| The friend stake | "Pact" (capitalized) | "bet," "wager," "challenge" |
| The body snapshot | "Body Receipt" (capitalized) | "scan," "check," "report" |
| The Coach letter | "Promise Letter" (capitalized) | "note," "message," "letter from future you" (in UI; can be marketing) |
| The predictive ping | "Witness ping" or just "Witness" | "alert," "warning," "notification" |
| The block feature | "Shield" (Coach's voice) or "CORE Shield" (marketing) | "blocker," "lock," "wall" |

---

## §10. The metrics we care about

CORE's success is not measured in MAU or DAU alone. Those are vanity. We measure:

1. **D30 retention** — what % of installs are still active after 30 days. Target: 35% (industry: 10-15%).
2. **Median streak length at D30** — for active D30 users, how many clean days? Target: 18+.
3. **Slip-to-recovery time** — median minutes between slip and recovery-quest completion. Target: <10 minutes.
4. **Lifetime conversion rate** — % of D30 users who buy lifetime. Target: 8%.
5. **Pact completion rate** — % of started Pacts that complete with both partners clean. Target: 55%.
6. **Witness ping accept rate** — % of Witness pings the user engages with (not dismisses). Target: 40%.
7. **Coach message volume** — median Coach messages per active user per week. Target: 4 (high engagement, not flooding).
8. **NPS** — at day 30, "How likely are you to recommend Core?" Target: 60+.

**Not tracked:**
- App open count (rewards opening for no reason)
- Time in app (rewards being on phone, which is anti-mission)
- Notification CTR (rewards spam)

---

## §11. Closing

This is the strategy. Everything in `02_` through `10_` is downstream of it. When you implement, refer back here. When you're stuck, ask: "Which wedge does this serve?" If none — cut it.

Read `02_EXISTING_FILES_AUDIT.md` next.
