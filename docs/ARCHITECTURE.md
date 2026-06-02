# Architecture — Core

## Stack overview

```
┌─────────────────────────────────────────────────────────┐
│  iOS / Android App  (Expo + React Native + TypeScript)  │
│  ─────────────────────────────────────────────────────  │
│  Expo Router  •  NativeWind  •  Reanimated 3  •  Skia   │
│  Zustand (client state)  •  TanStack Query (server)     │
│  Expo WidgetKit bridge  •  RevenueCat (IAP)             │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Cloud                          │
│  ─────────────────────────────────────────────────────  │
│  Postgres  •  Auth (Apple/Google)  •  Storage           │
│  Edge Functions (Deno) — orchestration layer            │
│  Realtime channels (streak updates, friend activity)    │
└──────┬───────────────────────────────────┬──────────────┘
       │                                   │
       ▼                                   ▼
┌──────────────┐                  ┌─────────────────────┐
│ Anthropic    │                  │  OpenAI             │
│ Claude       │                  │  - GPT-5 Vision     │
│ (coach +     │                  │    (food/body/      │
│  reflection) │                  │     outfit scan)    │
└──────────────┘                  │  - Realtime         │
                                  │    (voice — S5)     │
                                  └─────────────────────┘
```

## Why this stack

- **Expo over bare RN** — faster iteration, EAS Build handles certs, OTA updates, but full native escape hatch when we need widgets (we do)
- **Supabase over Firebase** — Postgres = real relations for friends/leaderboards, edge functions in Deno/TS = one language, generous free tier
- **NativeWind** — Tailwind ergonomics on RN, designer-friendly, AI-friendly
- **Zustand over Redux** — boring is good, small bundle, no boilerplate
- **TanStack Query** — server-state caching, optimistic updates (critical for tap-to-log instant feedback)
- **Reanimated + Skia** — Skia for the smoke/melt particle systems (Lottie can't do dynamic particles), Reanimated for everything else
- **RevenueCat** — single API for iOS + Android IAP, handles entitlements/restores
- **Anthropic for coach** — best at long-context personality + memory + safety, Claude 4.6/4.7 era
- **OpenAI for vision** — GPT-5 Vision is best for food/body/outfit scanning today

## Folder structure (monorepo)

See [README.md](../README.md#repo-layout-high-level) for the file tree.

### Why a monorepo

- Mobile + web + shared types in one PR
- Single source of truth for `Habit`, `Stat`, `User` types
- `pnpm` + `turbo` cache builds, parallelizes tests
- Cheap to add more apps later (admin dashboard, marketing site, internal tools)

## Data flow — slip tap

```
User taps "I slipped"
   │
   ▼
TapToLog component (optimistic)
   │
   ├─ Trigger haptic (Expo)
   ├─ Trigger Skia smoke animation
   ├─ Decrement local stat (Zustand)
   ├─ Update local streak (Zustand)
   │
   ▼
Mutation → POST /rest/v1/slip_logs (Supabase)
   │
   ▼
Postgres trigger → recompute stat aggregate
   │
   ▼
Postgres NOTIFY → Supabase Realtime channel
   │
   ▼
TanStack Query invalidates stat queries
   │
   ▼
WidgetKit reload requested (iOS)
   │
   ▼
Widget shows new streak/stat
```

## Data model (simplified)

See `supabase/migrations/0001_initial_schema.sql` for the full DDL.

Core tables:
- `profiles` — user metadata (linked to auth.users)
- `habits` — preset habit definitions (vape, scroll, etc.)
- `user_habits` — which habits a user is tracking
- `slip_logs` — every slip a user logs (the firehose)
- `stats` — preset stat definitions (Lungs, Brain, Wallet, Willpower, Body)
- `user_stats` — current value + level per user per stat
- `streaks` — clean + honesty streaks per user_habit
- `recovery_quests` — completed recovery quests + XP recovered
- `scans` — food/body/outfit scan history (S2+)
- `coach_conversations` — chat history + AI summaries
- `friends` — social graph (status: pending/accepted/blocked)
- `subscriptions` — RevenueCat-synced billing state

## Security

- Row-level security (RLS) on every table — user can only see their own data, friend data only if accepted
- Supabase Auth → JWT in every request
- API keys (Anthropic, OpenAI, RevenueCat webhook secret) live in Supabase Edge Function env, never in client
- Body/face scans stored in Supabase Storage with private bucket + signed URL access only
- All AI calls go through edge functions (never client → OpenAI directly) for cost control + abuse prevention
- PII minimization — no email on social profiles, no real names by default

## Performance budgets

- Cold start to interactive home screen: < 2.0 s on iPhone 12
- Tap-to-smoke-animation: < 100 ms (must feel instant)
- AI coach first token: < 1.5 s
- Food scan result: < 5 s
- Widget refresh: every 15 min + manual on slip

## Open architecture decisions

Tracked in `docs/DECISIONS/` (ADR format). Pending:
- Local-first sync (PowerSync / Watermelon) vs pure server?
- Skia vs Rive for animation pipeline?
- Single coach model or hybrid (Haiku for chat, Sonnet for reflections)?
- Self-host postgres later (cost at scale) vs stay on Supabase forever?
