# 08 — COPY LIBRARY

> Read `00`–`07` first.

This file is the **canonical source for every user-facing string**. When implementing UI, never write strings inline. Pull from here. If a string isn't here yet, add it here first, then implement.

Strings are organized by **screen → element**. Each Coach string has 4 tone variants. Every variant uses the brand voice rules from `01_STRATEGY.md` §4.

---

## §0. Voice rules (recap)

- **Calm, never urgent.**
- **Honest, never euphemistic.**
- **Specific, never generic.**
- **Adult, never patronizing.**
- **Earned, never given.**

Forbidden words: "journey," "wellness," "mindfulness," "empower," "crush it," "level up," "bestie," "game-changer," any phrase ending in "!!".

Required words: "you," "steady," "witness," "watch," "promise," "mean it," "become."

---

## §1. Top-level brand strings

### Wordmark
- "core" (lowercase in copy)
- "CORE" (caps in logo)

### Tagline
- Primary: "Become your core."
- Secondary: "Quit vape. Become your core."

### Brand promise (3-line hero)
- "Become / who you said / you'd be."

### App Store one-liner
- "Quit vape with a Coach who watches with you."

### App Store subtitle
- "5 stats. 4 voices. 1 Promise."

---

## §2. Onboarding strings

### Splash
- (No copy — visual only.)

### `index.html` (welcome)
- Title (3-line): "Become / who you said / you'd be."
- CTA: "Start my 7-day free trial"
- Sub-CTA below: "60 seconds to your first Coach message"
- Alt-row 1: "I have an account" → "Sign in"
- Alt-row 2: "See it first" → "5-minute walkthrough"

### Orb taglines
- **Brain:** "Clarity · Calm · Focus"
- **Lungs:** "Breathe · Rinse · Reset"
- **Wallet:** "Earn · Save · Grow"
- **Willpower:** "Discipline · Habits · Drive"
- **Body:** "Move · Fuel · Recover"

### `walkthrough.html`
- Tab labels: "Home" / "Slip" / "Coach" / "Pact"
- Tab 1 (Home) caption: "Your day at a glance. 5 stats. Today's quest. Coach in your ear."
- Tab 2 (Slip) caption: "Hold to log. The app sees you slip. Coach catches you, no lecture."
- Tab 3 (Coach) caption: "Pick a voice. Type or talk. Coach watches your patterns."
- Tab 4 (Pact) caption: "Quit with a friend. $5 on the line. Both win, both lose, both honest."
- Footer CTA: "Start my 7-day free trial"
- Footer secondary: "Back to welcome"
- Exit intent: "Want to skip this and just start?" / "Start now" / "Keep watching"

### `trial.html`

> **DRIFT NOTE (2026-05-30):** Live HTML is 9-step. Copy below covers the 5-step variant. The additional 4 steps (Profile / Goal / Blocker / Routine) live in the current source — when implementing, read the live file for their exact copy. Pricing updated: $7.99/mo, $44.99/yr, 7-day trial.

#### Step 0 — Promise

- Title: "Sign your promise."
- Subtitle: "Type the word that locks this in."
- Input placeholder: "PROMISE"
- Hint tooltip (8s): "Take your time. This part isn't a test — it's a signature."
- Paste rejected toast: "Type it. Don't paste."
- Next CTA disabled: (greyed)
- Next CTA enabled: "Next →"
- Helper text (below input): "It can be 'PROMISE,' 'I PROMISE,' or 'I DO.' Whatever you mean."

#### Step 1 — Name

- Title: "What should Coach call you?"
- Input placeholder: "Your name"
- Input max 40 chars, letters/spaces/hyphens only.
- Inline error: "Letters only."
- Next CTA: "Next →"

#### Step 2 — Coach tone

- Title: "Pick a Coach voice."
- Subtitle: "You can change this any time. Pick what feels right today."
- Card 1: "Gentle" — vibe tag: "Warm, soft" — preview link: "preview ›"
- Card 2: "Balanced" — vibe tag: "Kind, direct"
- Card 3: "Direct" — vibe tag: "Honest, plain"
- Card 4: "Drill" — vibe tag: "Sharp, no shame"
- Below cards: "Not sure? Take the test →" → opens coach-tone-test
- Next CTA: "Next →"

#### Step 3 — Check-in time

- Title: "When should I check in?"
- Card 1: "Morning" — subtitle: "8:30am — Coach + Today's quest."
- Card 2: "Evening" — subtitle: "9pm — Reflect on the day."
- Card 3: "Both" — subtitle: "8:30am + 9pm." Badge: "Recommended"
- Next CTA: "Next →"

#### Step 3.5 — Permissions preflight

- Title: "Quick note."
- Body: "Coach can do more if we ask iOS for a few permissions. Each one's optional. We'll explain each."
- Single CTA: "Got it"

#### Step 4 — Trial pitch

- Title: "7 days. Free."
- Body line 1: "No charge until day 8. Cancel any time, even after you start."
- Body line 2: "On day 7, Coach will write you a letter."
- Primary CTA: "Start my 7-day free trial"
- Secondary link: "How does this work?"
- Below CTA: "$7.99/mo after trial · or $44.99/year (save 53%)"

#### Exit intent

- Title: "Skip your free trial?"
- Body: "You'll be charged $7.99/mo immediately when you return."
- Primary: "Stay"
- Secondary: "Leave anyway"

### `quiz.html`

#### Step 1 — Profile

- Title: "Quick setup. 9 questions."
- Subtitle: "Three minutes."
- Avatar upload prompt: "Pick an avatar"
- Skip link: "Skip — use initials"

#### Step 2 — Age

- Title: "How old are you?"
- Subtitle: "Core is built for adults 18+."
- Slider min: 18, max: 99
- Under-18 redirect screen: "Core is built for adults 18+. Come back when you're ready."

#### Step 3 — Main goal

- Title: "What's your main goal?"
- Options:
  - "Quit vape"
  - "Quit vape + build other habits"
  - "Generally improve myself"
  - "Try the app first"

#### Step 4 — Last puff

- Title: "When was your last puff?"
- Options:
  - "Less than an hour ago"
  - "1–24 hours ago"
  - "1–3 days"
  - "4+ days"
  - "I haven't started vaping yet"

#### Step 5 — Daily count

- Title: "At your peak, how many puffs / pods per day?"
- Slider: 0 — 100+ (with steps)

#### Step 6 — Triggers

- Title: "What sets it off?"
- Subtitle: "Pick all that apply."
- Multi-select:
  - "Stress"
  - "Boredom"
  - "Drinking"
  - "After meals"
  - "Driving"
  - "On phone"
  - "Wake-up"
  - "Other"

#### Step 7 — Sleep

- Title: "How many hours do you sleep?"
- Slider: 3 — 12

#### Step 8 — Coaching style preview

- Title: "Here's how I'd speak to you."
- Sample message displayed (tone-specific).
- Question: "Sound right?"
- Yes CTA: "Yes — keep going"
- No CTA: "Change tone" → opens tone-test

#### Step 9 — Review

- Title: "Quick review."
- Each answer with "Edit" link.
- Final CTA: "Looks right"

### `permissions.html`

#### Notifications

- Title: "Coach can reach you"
- Body: "Morning check-ins, milestone celebrations, Witness pings. Never spam. Never overnight."
- Allow CTA: "Allow notifications"
- Skip CTA: "Maybe later"
- Why link: "Why do I need this?" → modal:
  - "Coach uses local notifications for check-ins and Witness alerts. Without these, Witness won't be able to ping you before slip windows. You can adjust each category in Settings."

#### Screen Time

- Title: "Witness watches with you"
- Body: "Core checks for slip-pattern usage on apps you flag. Only those apps. Nothing else."
- Reassurance: "You pick the apps. You can revoke any time."
- Allow CTA: "Set this up"
- Skip CTA: "Maybe later"

#### Location (optional)

- Title: "Pattern your places"
- Body: "Core can ping you when you're near a place you've slipped before. Off by default. Choose places explicitly."
- Allow CTA: "Set up places"
- Skip CTA: "Skip"

#### Health

- Title: "Track your lungs"
- Body: "Weekly breath-hold timer + optional Apple Health sync. Your lungs heal; you should see it."
- Allow CTA: "Connect Health"
- Skip CTA: "Skip"

#### Contacts

- Title: "Find your Pact partner"
- Body: "Match you with a friend already on Core. We never store contacts after the match."
- Allow CTA: "Allow once"
- Skip CTA: "Skip"

### `pick-habits.html`

- Title: "Pick your focus."
- Quit Vaping pre-selected with: "★ Your focus"
- Footer: "Quit Vaping · add more anytime"
- Locked habit toast: "Unlocks at day 30 of your streak."
- "Why only vape at first?" link → modal:
  - "Vape is the wedge. We start where you started. On day 30, you unlock one more habit. On day 90, another. The order matters. We give you focus by giving you less."
- Continue CTA: "Continue"

---

## §3. Dashboard strings

### Greetings (4 tones × 4 time-of-day = 16 variants)

#### Morning (5am — 12pm)

| Tone | Greeting |
|---|---|
| Gentle | "Good morning, {name}." |
| Balanced | "Morning, {name}." |
| Direct | "Morning. Day {N}." |
| Drill | "Up. Day {N}, {name}." |

#### Afternoon (12pm — 5pm)

| Tone | Greeting |
|---|---|
| Gentle | "Afternoon, {name}." |
| Balanced | "Afternoon, {name}." |
| Direct | "Afternoon. Steady, {name}." |
| Drill | "Mid-day, {name}. Hold." |

#### Evening (5pm — 10pm)

| Tone | Greeting |
|---|---|
| Gentle | "Evening, {name}." |
| Balanced | "Evening, {name}." |
| Direct | "Evening, {name}. End strong." |
| Drill | "Evening. Don't drop now, {name}." |

#### Late (10pm — 5am)

| Tone | Greeting |
|---|---|
| Gentle | "Hi {name}. Late one tonight?" |
| Balanced | "Late, {name}. I'm still here." |
| Direct | "Late. You okay, {name}?" |
| Drill | "Late, {name}. What's up." |

### Trial pill

- "DAY {N}/7"
- Tapped → modal: "Day {N} of your free trial. {7-N} days left. We'll only charge if you choose to continue."

### Streak strip

- "{N} DAY STREAK"
- Freeze pill: "FREEZE {available}/1"
- Today's slip pill: "{N} SLIP TODAY"
- Today's quest label: "TODAY"

### Quick actions (4)

- SOS (big): "SOS"
- Post: "Post"
- Body Receipt: "Body Receipt" (or "Receipts" if has history)
- Calm: "Calm"

### Restore banner (when streak lost in last 48h)

- Title: "You lost your {N}-day streak."
- Body: "Restore for $0.99. {hrs}h window."
- CTA: "Restore"
- Coach tone-aware reassurance line:
  - Gentle: "It's okay. You can have it back."
  - Balanced: "Slip happens. Restore if you want."
  - Direct: "You slipped. Restore or don't."
  - Drill: "Slip's logged. Restore or start clean."

### Today's quest examples (rotate daily)

- "Try the 60-second box breath."
- "Open Calm Library for 90s."
- "Tell Coach one true thing about today."
- "Take a Body Receipt." (Sunday only)
- "Reach out to a friend."
- "Take a walk. Anywhere. 5 minutes."

### Coach line of the day (daily, tone-aware, updates 3am local)

Examples (Gentle tone):
- "Just being here counts."
- "Today doesn't need to be perfect."
- "Your lungs are working better than yesterday."
- "I see you, {name}."

(Direct tone equivalents)
- "Show up. That's all."
- "Today's just today. No drama."
- "Lung function up. Keep going."
- "{name}. Steady."

---

## §4. Habit page strings (per habit)

### Vape (`habit.html#vape`)

- Habit title: "Quit Vape"
- Slip button: "Mark a puff"
- Almost-but-didn't: "I almost did but didn't"
- Witness panel header: "Coach is watching for"
- Coach quick prompt: "Talk to Coach about vape"
- Triggers log header: "Triggers this week"
- Body Receipt mini header: "Lung-hold this week"

### Doomscroll

- Habit title: "Quit Doomscroll"
- Slip button: "Mark a scroll"

### Spend

- Habit title: "Quit Impulse Spend"
- Slip button: "Mark a spend"

### (Other bonus habits — similar pattern.)

---

## §5. Slip-confirm strings

### Tone-aware titles

| Tone | Title |
|---|---|
| Gentle | "Hold to mark it." |
| Balanced | "Hold to log." |
| Direct | "Hold. Confirm the slip." |
| Drill | "Hold. Log the slip." |

### Subtitles

| Tone | Subtitle |
|---|---|
| Gentle | "I'm here when you're ready." |
| Balanced | "Take a breath. 2 seconds." |
| Direct | "No shame. 2 seconds." |
| Drill | "Lock it in. 2 seconds." |

### Almost-but-didn't escape

- Link: "I almost did but didn't"
- Reflect panel title: "What stopped you?"
- Mood options: "Proud", "Lucky", "Strong", "Calm", "Surprised"
- Optional text: "Anything else?" (placeholder)
- Save CTA: "Save the win"
- Result toast: "+8 XP. Willpower +2. Nice."

### Trigger picker step

- Title: "What set it off?"
- Subtitle: "Pick up to 3."
- Chips: "Stress" / "Boredom" / "Drinking" / "After meal" / "Driving" / "Phone" / "Wake-up" / "Other"
- Optional text: "Anything else?" (max 30 chars)
- Save CTA: "Save"
- Skip CTA: "Skip"

### Promise Letter banner (if exists)

- "Letter from you, day 7. Read in 30s before deciding."

---

## §6. Recovery quest strings

### Step 1 — Triggers confirmation

| Tone | Question |
|---|---|
| Gentle | "These triggers feel right?" |
| Balanced | "Quick check — these triggers right?" |
| Direct | "Confirm triggers." |
| Drill | "Triggers logged. Anything to add?" |

### Step 2 — Mood

| Tone | Question |
|---|---|
| Gentle | "How are you feeling right now?" |
| Balanced | "How's the mood?" |
| Direct | "What's the feeling?" |
| Drill | "Mood?" |

Emoji options: "Steady" / "Down" / "Restless" / "Numb" / "Angry"

### Step 3 — What would have helped

| Tone | Question |
|---|---|
| Gentle | "What would have helped just before?" |
| Balanced | "What might have helped?" |
| Direct | "What would have caught this?" |
| Drill | "What was missing?" |

Coach suggestions (based on triggers):
- Stress + After meal: "Step outside for 60s after eating."
- Boredom: "Open Calm Library next time it hits."
- Phone: "Move TikTok off your home screen."
- (etc., 8-10 trigger × suggestion mappings)

### Final CTA

| Tone | CTA |
|---|---|
| Gentle | "Lock in your reset" |
| Balanced | "Save and move on" |
| Direct | "Reset." |
| Drill | "Move." |

### Result toast

| Tone | Toast |
|---|---|
| Gentle | "+25 XP. You showed up." |
| Balanced | "+25 XP. Recovery counts." |
| Direct | "+25 XP. On." |
| Drill | "+25 XP. Go." |

---

## §7. Coach screen strings

### Header

- Title: "Coach"
- Sub-pill (tone): "Gentle" / "Balanced" / "Direct" / "Drill"
- Witness badge: "Witness: On" / "Witness: Off"

### Greeting (first time)

| Tone | Greeting |
|---|---|
| Gentle | "Hi {name}. I'm here. First day's just for noticing. What's something true about today?" |
| Balanced | "{name}. Welcome. I'll help you quit vape. Want to start with what's going on right now?" |
| Direct | "{name}. Coach here. You set the topic. I bring the lens." |
| Drill | "{name}. Coach. Talk straight. What's the situation." |

### Greeting (returning, no recent slip)

| Tone | Greeting |
|---|---|
| Gentle | "{name}. Good to see you." |
| Balanced | "Back. What's up." |
| Direct | "{name}. Steady. Topic?" |
| Drill | "Back. Talk." |

### Streak-broken takeover (when isStreakRecoverable())

| Tone | Greeting |
|---|---|
| Gentle | "I saw you tap. No lecture, {name}. Walk me through the trigger when you're ready." |
| Balanced | "Saw the slip. Take a beat. We pick this up when you want." |
| Direct | "Slip's logged. What set it up?" |
| Drill | "Saw it. Trigger." |

### Suggested prompt chips

- "Tell me about cravings"
- "What's a Witness ping?"
- "Help me start a session"
- "Why is my Lungs stat down?"
- "I'm feeling restless"
- "Talk me through this craving"

### Action card titles

- Calm Library: "Open Calm Library — {trigger} · {duration}s"
- Focus Session: "Start a {duration}-min focus session"
- Pact Draft: "Draft a Pact with {partner suggestion}"
- Witness Window: "Set Witness for tonight at {time}"
- Body Receipt: "Schedule a Body Receipt for Sunday"
- Promise Letter: "Open your Promise Letter"
- Check-in Schedule: "Adjust check-in times"
- Witness Mute: "Mute Witness category: {category}"
- Pause Coach: "Pause me for {hours}h"
- Crisis: "Open Crisis screen"

### Action confirmation modal

- Title: "Do this now?"
- Body: "{action description}"
- Confirm: "Yes"
- Cancel: "Cancel"

### Crisis case (no confirmation)

- (No copy — direct route to crisis.html.)

---

## §8. Crisis strings (`crisis.html`)

### Header

- Title: "Crisis support"
- Subtitle: "You're not alone. We're here."

### Coach line (forced Gentle)

- "{name}. You're not alone. I'm here. Take a breath if you can. Or call. Or tap me."

### Crisis lines (region-specific)

Australia:
- Lifeline: "13 11 14"
- Beyond Blue: "1300 22 4636"
- Suicide Call Back: "1300 659 467"

US:
- 988 Suicide & Crisis Lifeline: "988"
- Crisis Text Line: "Text HOME to 741741"

UK:
- Samaritans: "116 123"

Canada: "988"
NZ: "1737"
Ireland: "116 123"

### Quick actions

- "Try a 60-second breath" — opens breath ring (4-7-8)
- "Talk to Coach" — opens coach.html in Crisis mode
- "Trusted contact" (if set) — opens phone with contact

### Step away

- "I need to step away" → activates Crisis mode 24h
- Confirmation: "Crisis mode pauses the app's gamification for 24 hours. Coach stays in Gentle. You're still here. Sure?"
- Confirm: "Yes, pause"
- Cancel: "Not yet"

### Crisis mode pill (on dashboard)

- "Crisis mode · We're here"
- Tap → opens settings to extend / exit

---

## §9. Panic strings (`panic.html`)

### Header

- "Hold."

### Breath ring labels

- "Breathe in" (4s)
- "Hold" (4s)
- "Breathe out" (4s)
- "Hold" (4s)

### Quick prompts

- "Walk 60 seconds. Anywhere."
- "Get water. Cold."
- "Text someone safe."

### Timer label

- "{N}s · You're 60s from steady."

### Exit options

- "I'm okay" (with confirmation if <30s)
- "I'm spiraling" → routes to crisis.html

### Completion

- (Routes to coach-craving-result.html automatically.)

### `coach-craving-result.html`

- Title: "You did it."
- Subtitle: "60 seconds. Steady."
- Chips: "+10 XP" / "Willpower +2" / "Streak safe"
- Coach quote (tone-aware):
  - Gentle: "That was real. You held. I see you."
  - Balanced: "Strong move. The craving passes."
  - Direct: "You held. Move on."
  - Drill: "Held. Next."
- Share CTA: "Share this win" → streak-share.html

---

## §10. Milestone strings (`streak-celebration.html`)

### Tier 7 (Spark)

- Title: "7 days. The week you said you couldn't."
- XP chip: "+50 XP"
- Rank chip: "Spark"
- CTAs: "Post to feed" / "Customize share card" / "Just take me home"
- Plus: "Coach wrote you a letter." (Promise Letter card)

### Tier 14 (Steady)

- Title: "14 days. Two weeks of you."
- XP chip: "+100 XP"
- Rank chip: "Steady"
- CTAs: same

### Tier 30 (Forge)

- Title: "30 days. Habit threshold."
- XP chip: "+250 XP"
- Rank chip: "Forge"
- CTAs: same + "Pick my next mountain →"

### Tier 60 (Edge)

- Title: "60 days. Halfway to three months."
- XP chip: "+500 XP"
- Rank chip: "Edge"

### Tier 90

- Title: "90 days. You. Did. It."
- XP chip: "+750 XP"
- Rank chip: "Peak"
- Plus: "Your 90-Day Report is ready."

### Tier 100 (Peak)

- Title: "100 days. Triple-digit."
- XP chip: "+1000 XP"

### Tier 365 (Core)

- Title: "365. A year. Of you."
- XP chip: "+5000 XP"
- Rank chip: "Core"
- Plus: "Coach wrote you a second letter."

### Confetti haptic event copy

- (No copy.)

---

## §11. Promise Letter strings (`promise-letter.html`)

### Day-7 letter (Gentle tone — example)

```
Dear {name},

You started Core because {reason_paraphrase}. I'm writing this from day 7, when it's beginning to feel real.

Here's something you might forget at 2am:

{whatYouMightForget}

Here's why it's worth it:

{whyItsWorthIt}

Your trigger is {trigger}. When that hits later, remember: it's the brain not the body. Wait it out, ride it through, or text Coach. I'll be here.

Keep going.

— You, on day 7
```

### Day-7 letter (Direct tone — example)

```
{name},

You started Core because {reason_paraphrase}. I'm writing on day 7, where it's beginning to be real.

Forget this at 2am:

{whatYouMightForget}

Worth it because:

{whyItsWorthIt}

Trigger is {trigger}. Brain not body. Wait, ride, or text me.

Don't back down.

— You. Day 7.
```

### Day-7 letter (Drill tone — example)

```
{name}.

You started this because {reason_paraphrase}. Day 7. Real now.

Remember:

{whatYouMightForget}

Worth it:

{whyItsWorthIt}

{trigger}. Brain. Not body. Wait. Ride. Text me.

Stay locked.

— Day 7 You
```

### "What you might forget" bank

15 options, picked randomly per user:

1. "The reason it's hard isn't because you're weak. It's because vape works. It's a really good drug. You're up against a chemical that was designed to win. The fact that you've made it 7 days is not nothing."

2. "Your brain will tell you a story about how this isn't worth it. The story is wrong. Your brain wants the dopamine. Your life wants you back. Pick the second one."

3. "Cravings last 90 seconds. Time it. They peak, they fade, they pass. Every single one. You don't fight a craving — you outlast it."

4. "You're not the version of you that vapes. You're the version that doesn't. The other version had a story that worked for a while. This story is yours now."

5. "When you slip — and you might — slip is data, not failure. Recovery is the actual skill. You can be good at recovery."

6. "Vape is not relaxing. Vape is RELIEVING. The relief is from the craving vape itself caused. You're stepping out of the loop."

7. "You're not quitting forever. You're quitting today. Tomorrow's you handles tomorrow."

8. "The first three weeks are the hardest. By week 6, you'll wonder what the fuss was."

9. "Coach is here at 2am. Use Coach at 2am."

10. "Sleep matters more than you think for this. Get the 7 hours when you can."

11. "Movement helps every craving. Walk. Anywhere. Any pace."

12. "The pact you made wasn't with us. It was with you. You are honoring it by being here."

13. "Some friends will quit too. Some will drift. Some will think it's weird. None of that changes who you're becoming."

14. "Three months from now, you'll be different in ways you can't predict. Trust the version of you who's been waiting."

15. "The reason you started was real. The reason you keep going can be different. That's fine. Both are yours."

### "Why it's worth it" bank (tailored to quiz goals)

For goal "Quit vape":
1. "You said you wanted to feel like yourself again. You said you wanted to breathe deep without a wheeze. That's not gone. It's coming."
2. "Your lungs heal faster than you'd believe. By month 3 your breath capacity climbs noticeably. By month 9 you're not coughing in the cold."
3. "Money you save buys time. Time off the chain."
4. "Kissing is better. Tasting is better. Smelling is better. Your senses come back."

(More options per goal type.)

### Tone-specific signoffs

- Gentle: "Keep going."
- Balanced: "Hold the line."
- Direct: "Don't back down."
- Drill: "Stay locked."

### Tone-specific signatures

- Gentle: "— You, on day 7."
- Balanced: "— You, day 7."
- Direct: "— You. Day 7."
- Drill: "— Day 7 You"

### Day-365 second letter

Generated similarly with tier-appropriate content. Reflects on the year.

---

## §12. Witness strings

### Setup (`witness-setup.html`)

#### Step 1 — Explainer

- Title: "Meet Witness."
- Body: "Witness is Coach watching for your slip patterns — quietly. It learns from your slips. When patterns line up, it pings."
- Subtitle: "Optional. Off by default."
- Next CTA: "Show me how"

#### Step 2 — Permissions

- Title: "What can it watch?"
- Toggles:
  - "Streak patterns" (always on, no permission)
  - "App usage" (requires Screen Time)
  - "Locations" (requires Location)
- Save CTA: "Next"

#### Step 3 — Apps

- Title: "Which apps?"
- Subtitle: "Pick apps that line up with your slips. Max 8."
- Common: Instagram, TikTok, Reddit, Twitter, Discord, YouTube
- Add custom: "+ Add app"
- Save CTA: "Next"

#### Step 4 — Places

- Title: "Which places?"
- Subtitle: "Add places where you've slipped. 50m radius around each. Max 5."
- Add CTA: "+ Add place"
- Save CTA: "Next"

#### Step 5 — Volume

- Title: "How loud should I be?"
- Slider with 3 stops:
  - "Whisper · 1/day max"
  - "Calm · 3/day max" (default)
  - "Steady · 5/day max"
- Save CTA: "Lock it in"

#### Step 6 — Done

- Title: "Witness on."
- Body: "I'll watch quietly. Adjust any time."
- CTA: "Done"

### Witness ping card (on dashboard)

- Title prefix: "Coach"
- Body: "Heads up. This is one of your slip windows."
- Why link: "Why this ping?" → modal with signal breakdown.
- Actions:
  - "Walk me through it"
  - "I'm steady"
  - "Not a real pattern"

### Tone-aware ping body variants

- Gentle: "Hey. This is one of your slip windows. I'm here if you want a minute."
- Balanced: "Heads up. Slip window. How are we?"
- Direct: "Slip pattern lined up. Tell me how you're doing."
- Drill: "Pattern match. Status?"

### "Not a real pattern" follow-up

- Title: "Which signal was off?"
- Options:
  - "Time of day"
  - "Apps I was using"
  - "Place"
  - "Stress / streak signals"
- Save → mutes signal for 7 days.

---

## §13. Pact strings

### Pacts list (`pacts.html`)

- Empty state title: "No Pacts yet."
- Empty state body: "Start one when you're ready. Quit with a friend, with $5 on the line."
- New Pact CTA: "+ New Pact"
- Active section heading: "Active"
- Pending section heading: "Pending"
- Completed section heading: "Completed"

### Pact draft (`pact-draft.html`)

#### Step 1 — Friend

- Title: "Who's your partner?"
- Friend list filtered to eligible (day 14+, no current Pact with them, Pro tier).
- Empty state: "No eligible friends yet. Invite one."

#### Step 2 — Duration

- Title: "How long?"
- Options: "7 days" / "14 days" / "30 days"
- Note: "Both partners need to complete the duration to win."

#### Step 3 — Stake

- Title: "Stake amount?"
- Options: "$5" / "$1 (hardship)"
- Sub-note: "Held by Stripe. Returned if you both make it."

#### Step 4 — Note (optional)

- Title: "Why this Pact?"
- Placeholder: "Both quitting before vacation"
- Skip CTA: "Skip"

#### Step 5 — Review

- Title: "Review."
- Summary card.
- CTA: "Send invitation"

#### Sent confirmation

- Title: "Invitation sent."
- Body: "{partner} has 48 hours to accept."
- CTA: "Back to dashboard"

### Pact invite (`pact-invite.html` — receiver view)

- Title: "{inviter} invited you to a Pact."
- Body: Pact details + inviter profile.
- Stake reminder: "$5 stake. Held by Stripe. Returned if you both complete."
- Accept CTA: "Accept ($5 stake)"
- Decline CTA: "Decline"
- Note: "Invitation expires in {hrs}h."

### Pact detail (`pact-detail.html`)

- Header: "Pact with {partner}"
- Day counter: "Day {N}/{total}"
- Both status indicators (avatars + day-clean counts)
- Cheer CTA: "Send cheer"
- Cheer templates:
  - "Proud of you"
  - "I'm here"
  - "You got this"
  - "Walk with me?"
- Pact rules summary collapsible.
- Coach line at top (tone-aware): "Day {N} of {total}. You + {partner}. Steady."

### Pact complete — both win (`pact-complete.html`)

- Title: "Pact complete. You both made it."
- XP chip: "+200 XP"
- Stake: "$5 returned to your card. Badge unlocked."
- Coach quote: tone-aware celebration.
- CTAs: "Share win" / "Just take me home"

### Pact complete — you win, partner lost

- Title: "Pact complete. You held."
- XP chip: "+200 XP"
- Stake: "$5 + ${stake from partner minus 10%} returned to your card."
- Coach quote (Gentle default): "{partner} slipped. They tried. Send a kind note when you can."

### Pact complete — you lost, partner won

- Title: "Pact complete. Honest end."
- Body: "{partner} made it. You didn't. Both are valid."
- Stake: "Stake forfeited."
- CTAs: "Try again with a new Pact" / "Just take me home"
- Coach quote: tone-aware (Gentle): "It happens. Pacts are practice. Try again when you're ready."

### Pact complete — both lost

- Title: "Pact complete. Both honest."
- Body: "Neither made it. 90% refunds out. Try again when you're ready."

---

## §14. Body Receipt strings

### Receipt flow (`body-receipt.html`)

#### Welcome

- Title: "Your weekly Receipt."
- Body: "Three minutes. Breath test, optional health, three questions."
- CTA: "Start"

#### Breath hold

- Title: "Take a deep breath. Hold. Tap LET GO when you exhale."
- Start CTA: "START"
- During: "{N}s"
- Stop CTA: "LET GO"
- Result (no prior): "{N} seconds. We'll watch this grow."
- Result (with prior): "Last week: {prev}s. This week: {N}s. {delta} — your lungs are healing."

#### Apple Health (if connected)

- Title: "Last week's data."
- Editable: Sleep avg, weight, HRV, mindfulness min.
- CTAs: "Looks right" / "Skip"

#### Photo (optional)

- Title: "Quick body shot?"
- Subtitle: "Private. Local-only by default."
- CTAs: "Take photo" / "Skip"

#### Reflection

- Q1: "How did this week feel?" — 5 emoji
- Q2: "What changed in your body?" — 1-line text
- Q3: "What's one thing you noticed?" — 1-line text

#### Summary

- Title: "Done."
- Recap chips.
- Save CTA: "Save Body Receipt"

### Receipt prompt on dashboard

- Title: "Your week is wrapping up."
- Body: "Quick Body Receipt? 3 minutes."
- CTAs: "Yes" / "Later"

### Receipt detail view

- Header: "Week of {date}"
- Sections: breath, health, photo, reflection
- Share CTA: "Share Receipt"

---

## §15. Calm Library strings

### Trigger buttons

- "Boredom"
- "Stress"
- "Loneliness"
- "After-meal"
- "Nighttime"
- "Driving"

### Special sections

- "First night without it"
- "Day 30 reflection"
- "After a slip"
- "Before bed"
- "When you can't sleep"
- "You did it" (day 365 only)

### Empty favorites

- "No favorites yet. Save what works."

### Script samples (3 of 36, all 4 tones)

#### `boredom_1` — Gentle (90 seconds)

```
You're here because nothing else fit. That's okay. Sometimes the brain just wants something — anything — to fill a quiet moment.

I want you to try something. Set down whatever's in your hand. Look up. Look at one specific thing in your room. Just one thing. The corner of a doorframe. A book. A wall.

Breathe in for four. Hold for four. Breathe out for four.

You don't have to do anything. The craving is asking you to do something. Just notice it.

Boredom isn't a problem to solve. It's a feeling to ride. Vape used to ride boredom for you. Now you ride boredom yourself.

In a minute, you'll find something to do. Maybe walk. Maybe make a drink of water. Maybe just stay here, sitting, doing nothing.

The boredom passes. It always does. You're learning to wait it out.

Breathe in. Hold. Breathe out. Hold.

That's it. You're already past the worst part.

— Coach.
```

#### `stress_1` — Direct (90 seconds)

```
Stress is here. Vape used to be the answer. Now it isn't.

This isn't going to feel easier than it does right now. The stress is real. The craving is real. The lack of vape is real. All three are happening at once.

Here's what you can do:

Breathe in for four. Hold for four. Out for four.

Now — name the stress out loud or in your head. Just three words. "Money. Boss. Tired." Whatever it is.

The stress isn't going away because you named it. But it's smaller now.

Now — one thing you can do in the next ten minutes that helps. Not solves. Helps. Drink water. Step outside. Send a text. Stand up.

Do that thing.

Stress passes when you give it somewhere to go. Vape gave it nowhere — it just delayed. You're giving it somewhere.

Done.

— Coach.
```

#### `nighttime_1` — Drill (90 seconds)

```
End of day. Bed is the goal.

Phone down. Lights low. One slow breath in. Hold. Out.

You did the day. The day's over. Vape doesn't end the day. Sleep ends the day.

Body's tired. Mind's wired. That's the trade vape used to fix. Vape didn't fix it — it postponed it.

Lie down. Don't scroll. Don't reach.

Breathe in four. Hold four. Out four.

Tomorrow's a new day. Right now is just sleep.

Eyes close.

— Coach.
```

(Continue for all 36 scripts × 4 tones. Each script: tone-aware language but same structure.)

---

## §16. Settings strings

### Section headings

- "Account"
- "Coach"
- "Notifications"
- "Witness"
- "Shield"
- "Pacts"
- "Body Receipts"
- "Permissions"
- "Subscription"
- "Privacy"
- "Help"
- "About"

### Row labels

- "Account name & email"
- "Coach tone" (with current value)
- "Coach memory" (what Coach knows about you)
- "Check-in times" (with current value)
- "Notification categories"
- "Set up / Edit Witness"
- "Set up / Edit Shield"
- "Manage Pacts"
- "Body Receipt frequency" (with value)
- "Permissions review"
- "Manage Subscription"
- "Cancel subscription"
- "Download your data"
- "Privacy Policy" → legal.html
- "Terms of Use" → legal.html
- "Community Guidelines" → community-guidelines.html
- "Help & FAQ" → support.html
- "Contact support"
- "Version" (with build number)
- "Delete account"

### Account deletion confirmation

- Title: "Are you sure?"
- Body: "This wipes everything. Your stats. Your Promise Letter. Your Pacts. Your Body Receipts. We can't bring them back."
- Confirm CTA: "Delete everything"
- Cancel CTA: "Keep my account"
- Second confirmation: "Type DELETE to confirm."
- Final confirmation toast: "Account deleted. Take care, {name}."

---

## §17. Subscription / Pricing strings

### `pricing.html`

#### Hero

- Title: "Pick your plan."
- Subtitle: "7 days free. Cancel any time."

#### Free tier

- Title: "Free"
- Price: "$0"
- Features list:
  - "First 7 days of streak data"
  - "Basic dashboard"
  - "1 habit (vape)"
  - "Basic Coach (50 messages/mo)"
  - "No Witness, no Pacts"

#### Pro Monthly

- Title: "Pro Monthly"
- Price: "$7.99/mo"
- Features list:
  - "Everything in Pro"
  - "Cancel any time"
- CTA: "Start free trial"

#### Pro Yearly (badge: "Best value")

- Title: "Pro Yearly"
- Price: "$44.99/yr"
- Sub: "$3.75/mo — save 53%"
- CTA: "Start free trial"

#### Pro Lifetime (gated)

- Title: "Pro Lifetime"
- Price: "$89 one-time"
- Body: "Available at day 30."
- Gated CTA (pre-day-30): "Locked"
- Active CTA (post-day-30): "Buy Lifetime"
- Discount note (rank Core): "Lifetime discount: $59 (saved $30)."

#### Comparison table

| Feature | Free | Pro Monthly | Pro Yearly | Lifetime |
|---|---|---|---|---|
| Coach (tone-aware) | Basic | ✓ | ✓ | ✓ |
| Witness | — | ✓ | ✓ | ✓ |
| Pacts | — | ✓ | ✓ | ✓ |
| Body Receipts | — | ✓ | ✓ | ✓ |
| Promise Letter | — | ✓ | ✓ | ✓ |
| Calm Library | Limited | ✓ | ✓ | ✓ |
| All habits | — | ✓ | ✓ | ✓ |
| Streak Insurance addon | — | $1.99/mo | $1.99/mo | $1.99/mo |
| 90-Day Report | — | ✓ | ✓ | ✓ |
| Data export | ✓ | ✓ | ✓ | ✓ |

#### Streak Insurance addon

- Title: "Streak Insurance"
- Price: "$1.99/mo"
- Body: "Unlimited freezes · auto-restore on first slip · chains across habits"

### `paywall.html`

- Title: "Pro unlocks this."
- Body (contextual to feature): "Witness needs Pro to listen to your patterns."
- CTAs: "Start free trial" / "Compare plans"

### Lifetime offer (`lifetime-offer.html`)

- Title: "You've been with Core for 30 days."
- Body: "We see you. Most users who reach this point keep going. If you want, you can buy Lifetime now — $89 one-time, never another bill. No upsell. No regret. Just settled."
- Pricing comparison breakdown.
- CTA: "Yes, lock it in"
- Decline: "Not today"

### Cancel flow (`cancel.html`)

#### Step 1 — Reason

- Title: "What's the reason?"
- Multi-select:
  - "Too expensive"
  - "Don't use it enough"
  - "Found a better app"
  - "Goal complete"
  - "Bug or issue"
  - "Other"
- Continue CTA: "Continue"

#### Step 2 — Retain offers

- Title: "Before you go — these might fit."
- Offer 1: "Pause 30 days · Come back any time."
- Offer 2: "50% off next 3 months."
- Offer 3: "+2 streak freezes this week (free)."
- Offer 4: "Streak Insurance · $1.99/mo · Unlimited freezes."
- Decline CTA: "No thanks, cancel anyway"

#### Step 3 — Loss confirm

- Title: "Just so you see what's leaving."
- List (dynamic from coreState):
  - "Life Score: {current}"
  - "Rank: {rank.label}"
  - "Streak: {days} days"
  - "Witness disabled."
  - "Promise Letter — stays. You can read always."
  - "Body Receipts — stay private to you."
- Cancel CTA: "Cancel my subscription"
- Stay CTA: "Take me back"

#### Cancellation confirmation

- Title: "Subscription cancelled."
- Body: "Active until {end_date}. After that, you're on Free tier. Welcome back any time."

---

## §18. Notification strings

### Push notification examples

#### Witness ping

- Title: "Coach"
- Body: tone-aware (see §12 above)

#### Pact partner slipped

- Title: "Coach"
- Body: "{partner} slipped today. Send a cheer when you can."

#### Pact partner cheered

- Title: "{partner} cheered for you."
- Body: "{cheer template text}"

#### Milestone reached

- Title: "Coach"
- Body: tone-aware milestone copy

#### Promise Letter re-surface

- Title: "Coach"
- Body: "Re-read your letter today, {name}."

#### Body Receipt prompt

- Title: "Coach"
- Body: "Your week's wrapping up. Body Receipt when ready."

#### Trial day 6

- Title: "Coach"
- Body: "Day 7 is tomorrow. Letter coming."

#### Trial expiring tomorrow

- Title: "Coach"
- Body: "Your free week ends tomorrow. We'll only charge if you choose to keep going."

#### Streak risk (Witness category)

- Title: "Coach"
- Body: "Your stats are quiet today. Want a quick check-in?"

#### Friend joined a Pact with you

- Title: "{name} accepted your Pact."
- Body: "Day 1 starts now. Both stakes locked."

### Notification inbox

- Empty state: "Quiet for now. Coach will reach when there's reason."
- Mark all read CTA: "Mark all read"

---

## §19. Achievements strings

| Achievement | Title | Description |
|---|---|---|
| First day | "First day" | "You opened Core and stayed." |
| First slip logged | "Honest Slip" | "You logged it within 5 minutes. That's the skill." |
| First recovery | "The Recovery" | "Complete a recovery quest within 10 minutes of a slip." |
| 7-day streak | "Spark" | "A full week." |
| 14-day streak | "Steady" | "Two weeks. The body knows." |
| 30-day streak | "Forge" | "Habit-threshold crossed." |
| 60-day streak | "Edge" | "Halfway to three months." |
| 100-day streak | "Peak" | "Triple-digit. Rare air." |
| 365-day streak | "Core" | "A year. The rarest one." |
| First Pact | "First Pact" | "You staked $5 on a friend's word." |
| Pact won | "Pact Keeper" | "You and your partner both made it." |
| First Witness engaged | "Witness Listener" | "You took a Witness ping seriously." |
| 10 Witness pings engaged | "Witness Apprentice" | "You're learning the patterns." |
| First Body Receipt | "Receipt" | "You measured." |
| 4 Body Receipts streak | "Receipt Streak" | "Four weeks of evidence." |
| First Promise Letter read | "Promise Reader" | "You opened the letter from your past self." |
| 5 Promise Letter reads | "Promise Keeper" | "You read it five times. It's yours." |
| First Calm Library session | "Calm Tap" | "You used Calm instead of slipping." |
| 10 Calm sessions | "Calm Practiced" | "Ten times. You found a tool." |
| Lifetime purchased | "Lifetime" | "You settled in." |
| 90-Day Report viewed | "The First 90" | "You looked at the work." |
| Crisis mode invoked | (no badge — quiet acknowledgement) | — |
| First bonus habit added | "Layered" | "Vape held. Another habit joined." |
| First share | "Word out" | "You shared your work." |

---

## §20. Error / validation strings

### Generic

- Network error toast: "Something's stuck. Try again." (with retry button)
- Save failure: "Couldn't save. Tap to try again."
- State load failure modal title: "Something's tangled."
- State load failure modal body: "Want me to reset to a fresh state? Your Promise Letter and Body Receipts stay."
- Reset CTA: "Reset"
- Keep CTA: "Try once more"

### Form validation

- Empty required field: "This field needs something."
- Email invalid: "That email doesn't look right."
- Age under 18: "Core is for adults 18+."
- Name too long: "Letters only. 40 max."
- Pact stake invalid: "Stake must be $1 or $5."
- Pact duration invalid: "Pick 7, 14, or 30 days."

### Permission denied

- Notifications: "Notifications are off in iOS Settings. Tap to open."
- Screen Time: "Screen Time access denied. Witness will work without apps."
- Location: "Location off. Witness places won't fire."
- Camera: "Camera off. Photo step skipped."

### Pact errors

- Stripe charge failed: "Couldn't charge your card. Pact not started. Try again?"
- Partner not found: "That friend isn't on Core yet. Invite them?"
- Partner not eligible: "{partner} hasn't reached day 14 yet."

---

## §21. Empty state strings (consolidated)

| Page | Empty state |
|---|---|
| Dashboard (day 0) | "First day. Just be here." |
| Feed | "Your feed is quiet. Add friends or join a Pact." |
| Notifications | "Quiet for now. Coach will reach when there's reason." |
| Pacts | "No Pacts yet. Start one when you're ready." |
| Body Receipts | "Your first Receipt unlocks at week 3." |
| Body Receipt history | "No Receipts yet. Take one Sunday." |
| Activity | "Your XP timeline will show up here." |
| Achievements | "Achievements unlock as you go. First one's coming." |
| Calm Library favorites | "No favorites yet. Save what works." |
| Witness history | "Witness hasn't pinged you yet. It's listening." |
| Find friends | "Add friends by name or contacts." |
| Bonus habits (pre day 30) | "Bonus habits unlock at day 30. Stay with vape for now." |
| Coach memory | "Coach is still learning. Quiz answers will show up here." |

---

## §22. Microcopy

### Toast (success patterns)

- "Saved."
- "Logged."
- "Witness updated."
- "Pact sent."
- "Streak preserved."
- "Letter read."

### Toast (info patterns)

- "Promise Letter is on the way." (after slip, if exists)
- "You can change this in Settings."

### Toast (gentle correction)

- "Type it. Don't paste."
- "Hold the button. Two seconds."

---

## §23. Date / time formatting

- **Today:** "Today"
- **Yesterday:** "Yesterday"
- **This week:** "Tue", "Wed"...
- **Beyond:** "May 12"
- **Time:** "8:30 AM" / "9:00 PM" (12-hour with AM/PM; lowercase pm/am in subtle contexts)

### Streak count display

- 1 day: "1 day"
- 2-99 days: "{N} days"
- 100+: "{N} days" (no special formatting)
- 365+: "{N} days · 1 year+"

### Pact day counter

- "Day {N}/{total}"

### Time until X

- "in 3h", "in 12h", "in 2d", "in a week"

---

## §24. Sharing strings

### Streak share (`streak-share.html`)

- Card text variants:
  - "{N} days · I quit vape with Core. · core.app/u/{username}"
  - "Becoming someone who keeps promises. · {N} days clean · core.app"

### Body Receipt share

- "Lungs healing. {breath-hold delta}s gained this week."
- (Photo NEVER included in share unless user explicit toggle.)

### Pact win share

- "I + {partner} both quit vape for {days} days. We won the Pact."

### 90-Day Report share

- "My first 90 days with Core. {streak count}. {recoveries}. Becoming."

---

## §25. Marketing strings (web/landing)

### Hero

- Headline: "Quit vape. Become your core."
- Sub: "An AI Coach who watches with you. 4 voices. 5 stats. 1 Promise."
- Primary CTA: "Start my 7-day free trial"
- Secondary CTA: "5-minute walkthrough"

### Why Core, not [generic quit app]

- Headline: "What makes Core different."
- Bullets:
  - "Vape-specific. Not a generic discipline app."
  - "4 Coach voices. Pick the one that lands."
  - "Witness watches before the slip — not after."
  - "Pacts: $5 on the line with a friend."
  - "Body Receipts: see your lungs heal."
  - "The Promise Letter: from you, to you, when you need it."

### Pricing on landing

- Same as `pricing.html`.
- Plus: "No ads. No data sales. Coach is yours."

### FAQ

- Q: "How does Witness work?"
- A: "Coach watches signal patterns from your past slips — time, app usage, places, stress indicators. When patterns line up, Coach pings. Fully local. No server."

- Q: "What happens if I slip?"
- A: "You log it. The 5-stat numbers adjust honestly. Coach catches you in your chosen tone — no shame. Recovery flow takes you back to steady. Slip is data, not failure."

- Q: "Why is Pact $5?"
- A: "$5 is enough to matter but not enough to hurt. Held by Stripe, not us. We never touch the funds."

- Q: "Can I cancel?"
- A: "Any time. Settings → Subscription → Cancel. One tap. We don't hide it."

---

## §26. B2B Coach strings (separate audience)

For `coach-signup.html`, `coach-onboarding.html`, `coach-dashboard.html`:

- Hero: "Coach platform — manage 5–25 vape-quitting clients."
- Sub: "Auto-generated session briefs. Slip alerts. Real outcomes."
- Pricing: "$399/mo per coach (5 clients) · $899/mo (15 clients) · $1499/mo (25 clients)"
- (Full B2B copy lives in `docs/COACH_DASHBOARD_SPEC.md`.)

---

## §27. Edge case strings

### User in Crisis mode (dashboard pill)

- Pill: "Crisis mode · We're here"
- Tap → "We're with you. Crisis mode ends in {hrs}h. Want to extend or exit?"

### Lockdown active (top bar)

- Chip: "Lockdown · Day {N}/7"
- Tap → Lockdown detail screen.

### Trial expiring tomorrow modal

- Title: "Your trial ends tomorrow."
- Body: "Day 7 is real. You can keep going on $7.99/mo or $44.99/yr. Or pause. Or leave."
- CTAs: "Pick a plan" / "Maybe later"

### Trial expired (`trial-expired.html`)

- Title: "Your free week's done."
- Body: "Pick a plan to keep Coach, Witness, Pacts, and Body Receipts."
- Plans: Pro Monthly $7.99 / Pro Yearly $44.99
- Pact note: "Pacts in progress stay active either way."
- CTA: "Resume my account"
- Footer link: "Just take me to Free tier"

---

## §28. End-of-file verification

After integrating this copy library:

1. Audit: open every HTML page. Verify no inline strings — all reference `data-i18n` keys.
2. Tone audit: open Coach screen with each tone. Verify all copy aligns with tone voice.
3. Forbidden word audit: grep for forbidden words across all string files. Zero results expected.
4. Translation prep: confirm `locales/en.json` has every key.

Commit. Next file: `09_DATA_MODELS.md`.
