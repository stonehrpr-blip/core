# Roadmap — Core

## 30-day MVP plan (Season 1)

### Week 1 (May 25–31): Foundation
- Day 1–2: Lock name + buy domains + trademark filing
- Day 2–3: Supabase project + schema migration + RLS policies
- Day 4–5: Expo init + Tailwind/NativeWind + theme + design tokens
- Day 6–7: Auth flow (Apple + Google) + onboarding skeleton

### Week 2 (June 1–7): Core loop
- Day 8–9: Habit selection + per-habit page scaffolding
- Day 10–11: TapToLog component + Skia smoke animation + haptic + sound
- Day 12: Stat engine + XP calculator + local state (Zustand)
- Day 13–14: Streak engine (clean + honesty) + Postgres sync

### Week 3 (June 8–14): AI + Widget
- Day 15–16: AI coach edge function + Claude integration + chat UI
- Day 17–18: Recovery quest mechanic (breathing + reflection + AI response)
- Day 19–20: iOS widget (small + medium) via WidgetKit bridge
- Day 21: Push notifications + daily nudge logic

### Week 4 (June 15–21): Polish + Ship
- Day 22–23: Subscription (RevenueCat) + paywall + free-trial flow
- Day 24–25: Settings + privacy + data export + delete account
- Day 26–27: TestFlight beta with 10 friends, gather feedback
- Day 28–29: Fix top 5 issues, App Store assets, screenshots
- Day 30: App Store submission

**Goal:** First paying customer by Day 35.

---

## 12-month season plan

| Season | Window | Focus | Success gate |
|--------|--------|-------|---------------|
| **S1** | Jun 2026 | Anti-habit + widget + coach | 1k paying users, 4.6 App Store, D30 ≥ 20% |
| **S1.5** | Aug 2026 | Friends, leaderboards, share cards | Viral coefficient ≥ 0.3 |
| **S2** | Sep 2026 | Food scan | 50% of users scan ≥3x/week |
| **S3** | Nov 2026 | Body scan | 30% of users scan monthly |
| **S4** | Jan 2027 | Outfit scan | Daily-use sticks for fashion ICP |
| **S5** | Apr 2027 | Voice assistant | 20% of users use voice weekly |
| **S6** | Aug 2027 | Health integrations (Apple Health, Whoop, Oura) | Pro tier upsell |

---

## Hard rules

- ❌ No season-jumping — finish S1 before scoping S2
- ❌ No "let me also build X" mid-season — strict feature freeze inside a season
- ❌ No infinite UI polish before customer #1 pays
- ✅ Every Friday: 200-word written check-in (what shipped, what slipped, what's next)
- ✅ Every season has a kill gate — if metrics miss, redo or pivot before expanding

---

## What we're NOT building (ever, probably)

- Therapist/coach marketplace (regulatory minefield)
- Real-money rewards or gambling-adjacent mechanics
- Manipulative dark patterns (auto-renew traps, fake urgency)
- Children's version (separate compliance regime, not worth it)
- B2B / enterprise / clinical (different product, different DNA)

---

## Stretch vision (Year 2+)

- Hardware companion (wearable ring/band) — but only if software won
- AI agents that intervene proactively (e.g., text you when wallet stat predicts overspending)
- "Core API" for other developers to build on top
- Acquisition by Apple/Whoop/Strava → integrated into platform health stack

---

## Honest risks to the roadmap

1. **Name + brand take too long** — set a 7-day deadline, then move
2. **Widget engineering on iOS** can balloon — budget 5 days, escalate if blocked
3. **App Store review** may flag the "punishment" framing — have a softer-framed v2 of marketing copy ready
4. **Stone's other projects** (Shadow, CORE, Harper OS, crypto trader) compete for attention — see [project commitments](../README.md)
