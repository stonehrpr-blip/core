# CORE Backend — Architecture Audit

Hand this to any engineer and they can be productive in 30 minutes.

## What this is

A Next.js 15 + Prisma + PostgreSQL backend for the CORE habit-tracking app. Built across 10 phases. Production-grade — no placeholder pseudo-code anywhere.

**Tech stack:**
- Next.js 15 (App Router + RSC + Edge middleware)
- Prisma 5 (PostgreSQL — Neon recommended)
- jose (JWT)
- bcryptjs (password/PIN hashing)
- Stripe (web billing)
- @apple/app-store-server-library (iOS billing)
- web-push, native http2 (push)
- Resend (transactional email)
- OpenAI + Anthropic (AI Coach)
- PagerDuty + Slack (alerts)

## Folder map

```
backend/
├── app/
│   ├── (app)/dashboard/             # Migration reference: HTML preview → RSC
│   ├── api/
│   │   ├── admin/                   # Owner-only — stealth 404 to non-owners
│   │   │   ├── auth/{pin,verify}/   # 2-stage owner login (PIN + email OTP)
│   │   │   ├── metrics/             # MRR/downloads/conversion/churn
│   │   │   ├── cohorts/             # Weekly retention curves
│   │   │   ├── forecast/            # ARPU/LTV/CAC/MRR projection
│   │   │   ├── transactions/        # Paginated transaction feed
│   │   │   ├── users/[handle]/      # Full user record + ban subroute
│   │   │   ├── notifications/       # Campaign analytics (open/delivery/failure)
│   │   │   ├── ai-costs/            # Token spend by model + day
│   │   │   └── refund/              # Owner-initiated refund (Stripe + Apple)
│   │   ├── auth/{sign-in,sign-out}/ # Session management
│   │   ├── billing/{checkout,portal,success}/ # Stripe flows
│   │   ├── coach/{message,history,reset,conversations}/ # AI Coach
│   │   ├── coins/send/              # P2P transfer (rate-limited, CSRF, atomic)
│   │   ├── cron/{daily,push}/       # Vercel Cron entry points
│   │   ├── me/{,push/register}/     # User profile + push token reg
│   │   ├── setup/owner/             # One-shot bootstrap (locks after first use)
│   │   ├── stripe/webhook/          # Stripe → DB sync (signed)
│   │   ├── storekit/notification/   # Apple → DB sync (cert-chain verified)
│   │   └── health/                  # Liveness + DB ping
│   └── billing/success/             # Server-rendered checkout confirmation
├── lib/
│   ├── ai/                          # Phase 8: provider adapter, prompts, recs
│   │   ├── provider.ts              # OpenAI + Anthropic streaming SSE
│   │   ├── prompts.ts               # Tone-aware system prompts
│   │   ├── context.ts               # Builds user-context block from DB
│   │   └── recommendation.ts        # 7-rule heuristic nudge engine
│   ├── analytics/                   # Phase 7: ingestion + churn ML
│   │   ├── track.ts                 # Queue-routed event ingestion
│   │   ├── queue.ts                 # In-memory batch buffer
│   │   └── churn.ts                 # 6-feature heuristic churn scorer
│   ├── auth/
│   │   ├── jwt.ts                   # HS256 access (15m) + refresh
│   │   ├── session.ts               # Cookie management, DeviceSession lifecycle
│   │   └── owner.ts                 # Owner PIN + OTP + OwnerSession
│   ├── billing/
│   │   ├── stripe.ts                # Customer + checkout + portal + webhook verify
│   │   ├── apple.ts                 # Full JWS cert-chain verification
│   │   └── entitlement.ts           # resolveEntitlement(userId) → tier + status
│   ├── db/prisma.ts                 # Singleton (prevents pool exhaustion)
│   ├── notifications/               # Phase 9 push stack
│   │   ├── apns.ts                  # HTTP/2 + ES256 JWT
│   │   ├── fcm.ts                   # OAuth2 + v1 API
│   │   ├── web-push.ts              # VAPID + RFC 8030
│   │   ├── push.ts                  # Dispatcher across channels
│   │   ├── scheduler.ts             # Timezone-aware scheduling
│   │   ├── email.ts                 # Resend transport + OTP templates
│   │   └── pagerduty.ts             # Events API v2 (critical alerts)
│   └── security/
│       ├── bcrypt.ts                # Password/PIN hashing + timing-safe equal
│       ├── csrf.ts                  # Double-submit cookie
│       ├── encrypt.ts               # AES-256-GCM at-rest field encryption
│       ├── rate-limit.ts            # Two-tier (memory + DB)
│       ├── fingerprint.ts           # Device fingerprint hashing
│       ├── otp.ts                   # 6-digit email OTP (hashed, single-use)
│       ├── brute-force.ts           # Lockout with exponential backoff
│       ├── suspicious-login.ts      # Anomaly detection (new country / device)
│       └── audit.ts                 # Typed AdminLog + AuditLog writers
├── middleware.ts                    # Edge: JWT verify, /api/admin/* stealth 404
├── prisma/schema.prisma             # 24 models, 6 enums, full schema
├── scripts/
│   ├── daily-aggregations.ts        # Cron: AnalyticsDaily + RevenueDaily + churn scoring
│   ├── setup-db.sh                  # Neon + Vercel one-shot bootstrap
│   ├── setup-owner.ts               # Interactive owner PIN setup
│   ├── seed-reminders.ts            # 5 canonical reminder templates
│   ├── audit.ts                     # Read-only daily security review
│   └── preflight.ts                 # Pre-deploy health check (all checks pass = ship)
├── .env.example                     # 40+ env vars, every one documented
├── .github/workflows/ci.yml         # GitHub Actions: typecheck, lint, audit, SBOM, DAST, preflight
├── vercel.json                      # Cron schedule (daily 02:00 UTC + push every minute)
├── package.json
├── tsconfig.json
├── README.md                        # Quick start
├── SECURITY.md                      # OWASP Top 10 coverage + threat model
├── RELEASE.md                       # Deploy + rollback runbook
└── AUDIT.md                         # This file
```

## Data model — 24 tables

**Identity & auth**
- `User` (main, mirrored subscription state for fast reads)
- `DeviceSession` (refresh-token hashes, fingerprint, IP, country)
- `FailedLogin` + `AccountLockout` (brute-force defense)
- `EmailOtp` + `TwoFactorEnrollment` (2FA)
- `OwnerSecret` + `OwnerSession` (admin dashboard auth)
- `SuspiciousLogin` (anomaly log)

**Billing**
- `Subscription` (state machine, Apple + Stripe identifiers)
- `Transaction` (charges, refunds, fees)
- `Refund` (separate audit log)
- `TrialState` (trial lifecycle)
- `CoinTransfer` (P2P) + `CoinLedger` (per-user audit)

**Social & content**
- `Post` + `Comment` + `Like` + `Follow`
- `Habit` + `SlipLog` + `Streak`
- `AchievementUnlock` + `UserStatsSnapshot`
- `Report` (moderation queue)

**Notifications & AI**
- `Notification` (delivery tracking)
- `CoachConversation` + `CoachMessage` (with role, tokens, model)
- `RecommendationCache` (6h cached nudges)
- `ReminderTemplate` (5 canonical seeds)

**Ops**
- `RateLimitBucket`, `InsightDismissal`
- `AdminLog` + `AuditLog`
- `AnalyticsEvent` + `AnalyticsDaily` + `RevenueDaily` + `RetentionCohort`

## Run locally (3 minutes)

```bash
cd backend
pnpm install
cp .env.example .env.local
# Fill in DATABASE_URL (Neon free), JWT_SECRET, ENCRYPTION_KEY (openssl rand -hex 32)
pnpm db:push                    # materializes the schema
pnpm db:seed && pnpm tsx scripts/seed-reminders.ts
pnpm tsx scripts/setup-owner.ts # interactive PIN
pnpm dev                        # http://localhost:3000
pnpm tsx scripts/preflight.ts   # verify all health checks
```

## Deploy to production (Vercel)

1. **Paperwork** — Apple Dev account ($99/yr), Stripe account, Neon project
2. **Repo** — push to GitHub
3. **Vercel** — connect repo, set every env var from `.env.example` (encrypted)
4. **Cron** — `vercel.json` configures both crons; set `CRON_SECRET`
5. **First deploy** — Vercel runs `prisma db push` on build automatically
6. **Owner setup** — `POST /api/setup/owner` with `SETUP_BOOTSTRAP_TOKEN`, then set `OWNER_SETUP_LOCKED=1`
7. **Stripe webhook** — point at `https://your-domain/api/stripe/webhook`
8. **Apple notifications** — point App Store Connect → V2 endpoint at `https://your-domain/api/storekit/notification`
9. **Test the admin** — visit `/admin?owner=1` → enter PIN → check OTP email → unlock

## What's NOT here (intentional)

- **CRM/email marketing** — Resend handles transactional only. Marketing emails go through Customer.io or similar.
- **A/B testing framework** — postpone until you need it.
- **WAF/DDoS** — Vercel + Cloudflare handle this. Don't reimplement.
- **CDN** — Vercel Edge Network. Don't reimplement.
- **Real-time chat** — out of scope (CORE isn't a chat app).
- **Mobile push for the iOS app yet** — APNs path is wired but device-token registration UI is on the iOS app team's side.

## Token budget for AI

- gpt-4o-mini at $0.15/M prompt + $0.60/M completion
- Average coach message: ~600 prompt tokens, 200 completion = ~$0.0002/message
- 1000 paying users × 5 msgs/day = ~$0.30/day = $9/month gross AI spend at 1K MAU
- Monitor via `/api/admin/ai-costs`. Switch to Anthropic Claude Haiku for cost reduction if needed.

## Operational alerting tiers

| Severity | Channel | Triggers |
|----------|---------|----------|
| Critical | PagerDuty wake-up | Stripe webhook 5xx, Apple notification verify fail, DB unreachable |
| Error    | PagerDuty business hours | Cron failure, scheduler stuck, OpenAI errors >5% |
| Warning  | Slack | Suspicious-login spike, daily-cap hit by many users, refund spike |
| Info     | Admin dashboard | GST threshold approaching, churn risk rising, low-balance users |

## File count

73+ files total across `app/`, `lib/`, `prisma/`, `scripts/`, `.github/`, root config + 4 markdown docs.
