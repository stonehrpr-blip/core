# CORE Backend

Production-grade Next.js + Prisma + PostgreSQL backend for CORE.

## Phase status

| Phase | Status | What's in |
|-------|--------|-----------|
| 1 — Infrastructure | ✅ this turn | Folder structure, Prisma singleton, JWT, sessions, middleware, env vars |
| 2 — Database | ✅ this turn | Full schema (19 models, indexes, enums, cascading deletes) |
| 4 — Security primitives | ✅ partial | bcrypt, CSRF, rate-limit, AES-GCM, JWT — full hardening lands in Phase 4 dedicated turn |
| 3 — Admin evolution | next turn | Live API metrics, cohort retention, CAC, LTV |
| 5 — StoreKit production | next turn | Full JWS signature verification, billing retry, refunds |
| 6 — Stripe production | next turn | Checkout, portal, webhooks, taxes, promos |
| 7 — Analytics engine | next turn | Event batching, daily snapshots, retention curves |
| 8 — AI system | next turn | Conversation memory, context, recommendations |
| 9 — Push system | next turn | APNs + FCM + web push, scheduling, analytics |
| 10 — QA polish | last turn | End-to-end review |

## Folder layout

```
backend/
├── app/
│   └── api/
│       ├── auth/
│       │   ├── sign-in/route.ts   # email + password, rate-limited, audit-logged
│       │   └── sign-out/route.ts  # revokes DeviceSession + clears cookies
│       ├── me/route.ts             # GET full hydrate / PATCH profile
│       ├── feed/route.ts           # paginated section feed
│       ├── coins/send/route.ts     # P2P transfer, atomic + rate-limited + CSRF
│       ├── stripe/webhook/route.ts # signature-verified Stripe → subscription state
│       ├── storekit/notification/route.ts # Apple App Store Server V2
│       ├── cron/daily/route.ts     # Vercel Cron entry — runs daily-aggregations
│       └── health/route.ts         # liveness probe
├── lib/
│   ├── auth/
│   │   ├── jwt.ts                  # HS256 access tokens (15m), opaque refresh
│   │   └── session.ts              # cookie management, DeviceSession lifecycle
│   ├── billing/
│   │   ├── stripe.ts               # client, checkout, portal, webhook verify
│   │   ├── apple.ts                # App Store Server, JWS decode, status mapping
│   │   └── entitlement.ts          # resolveEntitlement(userId) → tier + status
│   ├── db/
│   │   └── prisma.ts               # singleton (prevents pool exhaustion)
│   ├── security/
│   │   ├── bcrypt.ts               # hash + verify + timing-safe equal
│   │   ├── csrf.ts                 # double-submit cookie
│   │   ├── encrypt.ts              # AES-256-GCM at-rest field encryption
│   │   └── rate-limit.ts           # two-tier (memory + DB), preset buckets
│   ├── analytics/
│   │   └── track.ts                # event ingestion (never blocks requests)
│   └── notifications/
│       └── push.ts                 # APNs + FCM + web push dispatcher
├── prisma/
│   └── schema.prisma               # 19 models: User, Subscription, Transaction, …
├── scripts/
│   └── daily-aggregations.ts       # roll AnalyticsEvent → AnalyticsDaily + RevenueDaily
├── middleware.ts                   # Edge: JWT verify, cache-control, x-core-user-id
├── .env.example                    # every required env var, documented
├── package.json
└── vercel.json                     # cron schedule
```

## Run locally

```bash
cd backend
pnpm install
cp .env.example .env.local
# Set DATABASE_URL (Neon free tier works), JWT_SECRET (openssl rand -hex 32), ENCRYPTION_KEY (same)
pnpm db:push           # materializes the schema
pnpm dev               # serves on :3000
```

Test the health probe:
```bash
curl localhost:3000/api/health
# { "ok": true, "db": "up" }
```

## Security model

- **Access token** (15min) — HS256 JWT in `core_at` httpOnly cookie. Verified at the edge in `middleware.ts`. Carries `{ sub: userId, tier, email }`.
- **Refresh token** (30 days) — opaque random in `core_rt` cookie. Stored hashed (sha256) in `DeviceSession`. Auto-rotates on access-token expiry.
- **CSRF** — double-submit cookie. `core_csrf` is readable by JS; clients send it back as `x-csrf-token` on POST/PATCH/DELETE.
- **Rate limit** — two-tier (memory + Postgres). Preset buckets in `RateLimits.{login,coinSend,postCreate,adminPin,passwordReset}`.
- **Encrypted at rest** — push tokens are AES-256-GCM via `lib/security/encrypt`. Password hashes are bcrypt cost 12.
- **No `x-user-id` trust** — that header was the Phase 0 stub. The real path: middleware verifies the JWT and stamps `x-core-user-id` for the route handlers, scrubbing anything the client sent.

## Deploy to Vercel

```bash
# 1. Push to GitHub
# 2. Import in Vercel dashboard
# 3. Set env vars from .env.example (mark all as "Encrypted")
# 4. Connect a Neon Postgres DB at vercel.com/integrations
# 5. Deploy
# 6. Set up cron secret: `vercel env add CRON_SECRET production`
# 7. Configure Stripe webhook endpoint in Stripe Dashboard → https://your-domain/api/stripe/webhook
# 8. Configure Apple notification endpoint in App Store Connect → https://your-domain/api/storekit/notification
```

## Migration path from the localStorage previews

Each preview HTML maps to a future React page. The state shape is intentionally compatible:

| localStorage key            | DB column                          |
|-----------------------------|------------------------------------|
| `coreOnboardComplete`       | `User.emailVerifiedAt` is set      |
| `coreOnboardTrial.name`     | `User.displayName`                 |
| `coreState.stats`           | `User.stats` (Json)                |
| `coreState.coins`           | `User.coins`                       |
| `coreState.xp`              | `User.xp`                          |
| `coreFollowing`             | `Follow` join table                |
| `coreUserPosts`             | `Post` table                       |
| `coreLikes`                 | `Like` join table                  |
| `coreCoachLastActive`       | (server-derived from Notification table) |
| `coreOwnerPin`              | `User.passwordHash` (owner row) + Phase 4 2FA |

Phase 3 will port `admin.html` to a real RSC + tRPC route. Phases 5/6 wire the real billing. Phase 7 builds the analytics aggregation visible in the admin dashboard.
