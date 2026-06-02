# Core

> Your AI life coach that gamifies quitting bad habits, tracks your body, food, and style, and turns your entire life into a single XP score you can see on your home screen.

**Status:** Pre-MVP scaffold (2026-05-25) — 13 HTML preview screens + RN welcome polished + stat engine + Zustand stores + social/ranks system
**Working title:** Core (rename TBD)

## What's built (2026-05-25)

**HTML previews (13 screens, click `previews/index.html` for the gallery)**

*Onboarding:* `welcome.html` · `pick-habits.html` · `baseline.html` · `permissions.html`

*Main app:* `dashboard.html` (rank pill + quick actions + achievement teaser + 5 stat cards + Today feed) · `habit-vape.html` (**signature mechanic**: AI insight + animated lungs + tap → smoke particles + XP loss + recovery prompt) · `recovery-quest.html` (60s box-breath + reflection + claw-back XP) · `coach.html` (AI chat + suggested-prompts chips) · `settings.html` (profile + Pro upsell + Habits/Social/Notifications/App/Privacy/Help groups)

*Social + Ranks:* `feed.html` (friends streak strip + habit-tagged posts + like/comment) · `compose.html` (post creation with **live word filter** — flags/hides certain terms, hard-blocks crisis content) · `leaderboard.html` (10-tier rank ladder Iron → Bronze → Silver → Gold → Emerald → Platinum → Diamond → Master → Grandmaster → Legend with podium + friends list) · `profile.html` (avatar + rank pill + streak/score/friends trio + 5-stat strip + achievements grid)

Tab bar standardized: **Home / Feed / Coach / Ranks / You**

**React Native code**
- `apps/mobile/app/(auth)/welcome.tsx` — fully mirrored from polished HTML preview (glass halos, sun glow, cosmic dust, electric blue constellation, glass CTA)
- `apps/mobile/app/index.tsx` — auth-state-aware root redirect (welcome vs tabs)
- `apps/mobile/constants/{habits,stats,modules,theme}.ts` — full data model
- `apps/mobile/lib/stats/stat-engine.ts` — pure derivation: stat value from module scores + slip XP
- `apps/mobile/stores/{auth,habits,stats}-store.ts` — Zustand stores with AsyncStorage persistence
- `apps/mobile/lib/supabase.ts` — client initialised

**Architecture docs**
- `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DESIGN_SYSTEM.md`, `docs/AI_PROMPTS.md`, `docs/ANALYTICS.md`, `docs/MODULE_MAPPING.md`

**Schema**
- `supabase/migrations/0001_initial_schema.sql` — full DDL with RLS + seed data

---

## What this is

Most habit apps reward streaks of *good* behavior. Core does the opposite: every time you slip on a bad habit (vape, scroll, drink, spend, etc.) you open the app, tap a button, and *watch the consequence* — smoke pouring out of lungs, brain melting, wallet emptying. Your XP drops, your stats decay, your home-screen widget updates in real time.

Then over time, layered on top: scan your food (calories + how-cooked), scan your body (physique score + change over time), scan your outfit (style score), and finally a conversational AI assistant that knows everything about your life and coaches you toward who you want to be.

It's Jarvis for normal people — built around the universal pain of "I have habits I want to change, and a body/life I want to improve."

## Why this can be a billion-dollar app

1. **Real whitespace** — pre-LLM, "track your whole life" apps failed (Gyroscope, Exist.io) because dumb dashboards aren't coaches. Multimodal AI + memory makes it possible for the first time.
2. **Novel mechanic** — inverse gamification (punish bad in real-time with visceral feedback) has never been done well. Most habit apps reward *good*; nobody owns the *consequence* layer.
3. **Daily use guaranteed** — bad habits happen every day. The widget keeps you in the app even when you don't open it.
4. **Universal pain** — every human has a bad habit and a body they care about. Mass market.
5. **Compounding moat** — your life history (years of stats, slips, scans) becomes too valuable to leave. Switching cost = your data.

## Vision (5 seasons)

| Season | When | Drop |
|--------|------|------|
| **S1** | Launch | Anti-habit tap + visceral feedback + home-screen widget |
| **S2** | Month 2 | Food scan → calories + body stat impact |
| **S3** | Month 4 | Body scan → physique score + change tracking |
| **S4** | Month 6 | Outfit scan → style score + wardrobe |
| **S5** | Month 9 | Voice assistant overlay — "Hey [name], how am I doing?" |

Each season is a marketing event. We launch S1 only. Earn the right to S2 by proving S1.

## Tech stack

- **Mobile:** Expo (React Native) + TypeScript
- **Styling:** NativeWind (Tailwind for RN)
- **State:** Zustand + TanStack Query
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI:** Anthropic Claude (coach) + OpenAI Vision (scanners) + OpenAI Realtime (voice)
- **Animations:** Reanimated 3 + Skia + Lottie
- **Payments:** RevenueCat
- **Web (marketing):** Next.js 15
- **Monorepo:** pnpm + Turborepo

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full breakdown.

## Quick start

```bash
pnpm install
pnpm dev        # runs everything via turbo
pnpm dev:mobile # mobile only (Expo)
pnpm dev:web    # marketing site only
```

## Documentation

- [PRD](docs/PRD.md) — Feature spec by season, with success criteria
- [Architecture](docs/ARCHITECTURE.md) — Stack, folder structure, data flow
- [Roadmap](docs/ROADMAP.md) — 30-day MVP plan and 12-month season plan
- [Design System](docs/DESIGN_SYSTEM.md) — Jarvis-aesthetic theming (black + glow + glass + visceral)
- [AI Prompts](docs/AI_PROMPTS.md) — Coach prompts, scanner prompts, voice prompts
- [Analytics](docs/ANALYTICS.md) — Events, funnels, retention metrics

## Repo layout (high level)

```
lifeos/
├── apps/
│   ├── mobile/      Expo + React Native app (iOS + Android)
│   └── web/         Next.js marketing site
├── packages/
│   ├── shared/      Cross-platform types + utils
│   ├── ui/          Cross-platform UI primitives (future)
│   └── config/      Shared eslint/tsconfig presets
├── supabase/        Postgres schema + edge functions
├── docs/            Spec, architecture, roadmap, design
└── scripts/         Dev tooling
```
