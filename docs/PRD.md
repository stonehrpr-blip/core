# Product Requirements — Core

**Version:** 0.1 (Pre-MVP)
**Owner:** Stone Harper
**Last updated:** 2026-05-25

---

## North Star

Help users replace bad habits and improve their bodies/lives by giving them a daily-use AI coach with visceral, gamified feedback and a passive home-screen presence.

**North-star metric:** DAU/MAU > 60% (Spotify-tier engagement)

---

## Target user

- **Primary ICP:** 18–34, mass-consumer, has at least one habit they want to quit (vape, weed, doom-scroll, drink, porn, spending, junk food)
- **Mindset:** "I know I have a problem, I keep meaning to change, nothing has stuck"
- **Pays for:** Headspace, Calm, Strava Premium, Cal AI, MyFitnessPal Premium — $5–15/mo range
- **Devices:** iPhone primarily (widget-driven), Android secondary

---

## Season 1 (MVP) — Anti-habit + Visceral Feedback

### S1.1 Onboarding (5 min)

- Welcome carousel (3 slides — the pitch)
- Sign-in (Apple, Google)
- Pick your habits to quit (multi-select from preset list of 8)
- Baseline questions (age, sex at birth, height, weight — for body stat calibration)
- Notification + camera permissions
- Widget install prompt (iOS deep-link to home-screen)

**Success criteria:** ≥70% complete onboarding from app open.

### S1.2 Tap-to-log slip

- Each habit has a dedicated page with the visceral metaphor
- Single huge tap button: "I just slipped"
- Tap triggers:
  - Haptic (heavy impact)
  - Sound effect (subtle)
  - Smoke/melt/etc animation (Skia particle system)
  - XP loss animation on the relevant stat
  - Recovery quest prompt (60 sec) — skippable
- Streak counter resets visibly

**Success criteria:** Median time from open → tap → animation < 2 sec.

### S1.3 Stat system

5 stats, each with visual avatar:

| Stat | Visual | Affected by habits |
|------|--------|--------------------|
| **Lungs** | Pink → grey gradient | Vape, smoke, weed |
| **Brain** | Glowing → melting | Doom-scroll, porn, gaming |
| **Wallet** | Coins filling/draining | Spending, gambling |
| **Willpower** | Flame burning bright/dim | Any slip |
| **Body** | Avatar physique | Food, alcohol, exercise (S2+) |

Each stat: 0–100 score, level system, history graph (last 30 days).

### S1.4 Streaks

Two streaks per habit:
1. **Clean streak** — days without slipping
2. **Honesty streak** — days you opened the app and logged truthfully (slip OR clean) — *this rewards logging even when you fail*

### S1.5 Recovery quest

When user slips, optional 60-sec quest to claw back XP:
- Box-breathing visual (4-4-4)
- One-line reflection prompt (typed or voice)
- AI returns one supportive sentence
- 25–50% of lost XP returned

### S1.6 Home-screen widget (iOS)

Three sizes:
- **Small:** Current streak number + one stat ring
- **Medium:** Streak + 3 stats + last slip time
- **Large:** All 5 stats + streak + "tap to log" deep-link

Widget updates via WidgetKit timeline (15-min refresh + manual reload on slip).

### S1.7 AI Coach chat

- Text chat (voice in S5)
- Daily/2-day check-in push notification
- Coach has full context: stats, streaks, recent slips, baseline
- Anthropic Claude (Sonnet 4.6 or Haiku 4.5) with system prompt + memory injection
- Conversation history saved + summarized

### S1.8 Subscription

- Free tier: 1 habit, basic stats, no widget
- **Pro tier ($9.99/mo or $59.99/yr):** unlimited habits, all stats, widget, AI coach, recovery quests
- Via RevenueCat (iOS + Android IAP unified)
- 7-day free trial

### S1.9 Settings

- Profile, notification prefs, privacy
- Subscription management
- Data export (GDPR/CCPA)
- Delete account

---

## Season 2 — Food Scan

- Camera scan of meal → AI returns calories, macros, "is this cooked enough?"
- Auto-update Body stat based on meal quality
- Meal history + daily macro target
- Optional: barcode scan fallback

---

## Season 3 — Body Scan

- Front/side/back photo scan
- AI returns physique score, posture analysis, BMI cross-check
- Saved over time → before/after slider
- Share card (privacy-first — only shows progress %, not body)

---

## Season 4 — Outfit Scan

- Scan today's outfit → style score
- Wardrobe inventory (scan each item once)
- Suggested combinations
- "What to wear" daily prompt

---

## Season 5 — Voice Assistant

- Always-listening (opt-in) or push-to-talk
- "Hey [name], log a puff" / "How am I doing?" / "What should I eat?"
- Knows full life history → responds in context
- OpenAI Realtime API (low-latency voice-to-voice)

---

## Out of scope (for v1)

- Apple Watch app
- Android widget (post-MVP)
- Multi-user / family accounts
- Therapist/coach marketplace
- Integrations (Apple Health, Whoop, Oura) — Season 6+
- Web app
- Hardware

---

## Success metrics

| Metric | Target (Month 3) |
|--------|------------------|
| Onboarding completion | 70% |
| D1 retention | 60% |
| D7 retention | 35% |
| D30 retention | 20% |
| Free → Paid conversion | 5% |
| DAU/MAU | 50% |
| Widget install rate | 40% of paid users |
| Avg slips logged/user/week | 3+ |
| App Store rating | 4.6+ |

---

## Risks

1. **Self-report decay** — users stop logging when failing. Mitigation: honesty-streak mechanic + low-friction tap.
2. **Punishment fatigue** — pure loss = users quit the app. Mitigation: recovery loops + positive comeback streak celebrations.
3. **Privacy concerns** — body scans + life data are sensitive. Mitigation: local-first where possible, clear privacy policy, no data sale ever.
4. **App Store review** — "punishment" mechanic could trigger review concerns. Mitigation: framing as "awareness + recovery," not "punishment."
5. **Trademark/name** — TBD, see name shortlist (SAGA, AYA, NOOR, RYE as candidates).
