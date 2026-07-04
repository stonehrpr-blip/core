# CORE Release Checklist

The pre-launch and ongoing-release runbook. Every deploy follows this.

## First-time deploy

- [ ] Apple Developer account active + tax forms (W-8BEN) submitted to App Store Connect
- [ ] Stripe account verified + bank account connected, payout currency = AUD
- [ ] Neon Postgres project created — copy DATABASE_URL
- [ ] Vercel project linked to GitHub repo, all env vars from `.env.example` set as encrypted
- [ ] Run `pnpm tsx scripts/preflight.ts` locally — all required checks ✓
- [ ] Push to `main` — GitHub Actions runs CI (typecheck, lint, audit, preflight)
- [ ] Vercel auto-deploys → run `pnpm tsx scripts/setup-owner.ts` (or hit `POST /api/setup/owner` once) → set OWNER_SETUP_LOCKED=1
- [ ] Configure Stripe webhook at https://your-domain/api/stripe/webhook
- [ ] Configure App Store Server Notifications V2 at https://your-domain/api/storekit/notification
- [ ] Run `pnpm tsx scripts/seed-reminders.ts` to seed the 5 reminder templates

## Every deploy

- [ ] CI passing (lint + type-check + audit + preflight)
- [ ] DB migrations applied (`pnpm prisma migrate deploy` runs on Vercel build)
- [ ] `/api/health` returns 200 after deploy
- [ ] Spot-check one critical path (sign-in, post create, coin transfer) on staging
- [ ] Smoke-test the admin dashboard with your PIN

## Security review (quarterly)

- [ ] Run DAST scan: `npx zaproxy/action-baseline` against staging
- [ ] Rotate JWT_SECRET (old tokens invalidate — acceptable since 15min TTL)
- [ ] Run `pnpm tsx scripts/audit.ts` — review failed logins / suspicious flags / lockouts
- [ ] Review AdminLog for unusual owner activity
- [ ] Verify Stripe webhook signing secret hasn't expired
- [ ] Verify Apple APNs key + .p8 not nearing expiry (Apple keys don't expire but rotate yearly anyway)

## Rollback

If a deploy goes wrong:
1. **Vercel** — instant rollback via dashboard → Deployments → previous deploy → "Promote to Production"
2. **Database schema** — Prisma migrations are forward-only. For data corruption, restore from Neon's PITR (point-in-time recovery, 7-day retention on free tier)
3. **Stripe** — paused webhooks can be replayed via dashboard. No data loss possible — Stripe retries.
4. **Apple** — App Store Server Notifications retry with exponential backoff for ~5 days

## SBOM (Software Bill of Materials)

CI generates `sbom.json` (CycloneDX format) on every deploy → uploaded as a workflow artifact. Required for App Store submission compliance + supply-chain visibility.

## Compliance

- **Privacy** — see `/legal.html` Privacy Policy. Local-first by default; sync is opt-in.
- **GDPR** — `/api/me/export-data` returns full user JSON; `/api/me/delete-account` (Phase 10) hard-deletes with audit trail
- **App Store** — all subscription cancellation paths reachable from Settings → Manage Apple Subscription
- **PCI** — we never store card data. Stripe/Apple handle the PAN.
- **GST (AU)** — register at business.gov.au once turnover passes $75K AUD/year. Admin dashboard warns at 80%.
