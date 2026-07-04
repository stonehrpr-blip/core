# CORE — Launch Plan

Day-by-day, from "backend exists" to "iOS app live in App Store". Stop building. Start shipping.

## Where you are (today)

- ✅ Backend: 79 production-quality files, all 10 phases shipped, no placeholder code
- ✅ HTML previews: 80+ pages designed, signature aesthetic locked in
- ❌ Apple Developer account: needs setup
- ❌ Stripe account: needs setup
- ❌ Neon/Vercel deployed: needs setup
- ❌ iOS app: not built yet (the Swift SDK is ready, the UI isn't)

## The honest path to launch (~4-6 weeks)

### Week 1 — Paperwork + infra
- [ ] **Day 1** — Register Core if not done; get ABN; open business bank account at NAB or CommBank
- [ ] **Day 2** — Apple Developer Program $99/yr → developer.apple.com (instant)
- [ ] **Day 2** — App Store Connect: create the CORE app record (com.harperlinks.core); upload icon + screenshots placeholder
- [ ] **Day 3** — Stripe account → stripe.com → verify identity → connect business bank → enable AUD payout
- [ ] **Day 3** — Neon Postgres → console.neon.tech → free tier project in ap-southeast-2 (Sydney)
- [ ] **Day 4** — Vercel project linked to GitHub repo; set all 40 env vars from `.env.example`
- [ ] **Day 5** — Run `bash scripts/setup-db.sh` + `pnpm tsx scripts/setup-owner.ts` + `pnpm tsx scripts/preflight.ts` (all green)

### Week 2 — Backend deployed + verified
- [ ] Push to main → CI runs → Vercel deploys
- [ ] Configure Stripe webhook URL in dashboard
- [ ] Configure App Store Server Notifications V2 URL
- [ ] Run `pnpm tsx scripts/seed-reminders.ts`
- [ ] Test sign-up + sign-in + coin send + AI coach via the API directly (curl)
- [ ] Set `OWNER_SETUP_LOCKED=1`
- [ ] Open `/status` — verify all systems "Operational"

### Week 3 — iOS app build
- [ ] Open Xcode project (or create from scratch — SwiftUI + iOS 17+)
- [ ] Drop `clients/swift/CoreClient.swift` into the project
- [ ] Build the screens — port the HTML previews one by one (dashboard, feed, coach, profile, settings, ranks, shop)
- [ ] Wire StoreKit 2 — Apple's `Product.purchase()` → `core.recordStoreKitTransaction()`
- [ ] Wire push — request permission → register device token → `core.registerPushToken(...)`
- [ ] Wire AI coach — use `AsyncThrowingStream` from `core.coachMessage(...)` for live streaming

### Week 4 — Polish + internal testing
- [ ] All 80+ HTML preview pages → SwiftUI views
- [ ] Test every flow: onboarding → trial → cancel → resubscribe → refund → ban → unban
- [ ] Run `pnpm tsx scripts/audit.ts` — verify clean
- [ ] Beta test with 5-10 friends via TestFlight

### Week 5 — Pen-test + App Store submission
- [ ] Hand off `PENTEST.md` to security firm → 1-2 day engagement
- [ ] Fix findings (most likely small — the architecture is solid)
- [ ] App Store submission: screenshots, description, privacy questionnaire (everything in `legal.html` Privacy Policy)
- [ ] Apple review: 24-48 hours typically. First-time apps sometimes 4-7 days.

### Week 6 — Launch
- [ ] Approved → release manually (don't auto-release; you want to control the moment)
- [ ] Announce on Product Hunt + your channels
- [ ] Monitor `/admin` dashboard — first paying user lands within 24 hours of launch typically
- [ ] First Apple payout arrives ~30-45 days later. First Stripe payout ~7 days.

## What success looks like at each milestone

| Time | Metric to hit |
|------|---------------|
| Week 6 (launch) | App live in store, 100 downloads day 1 |
| Month 1 | 500 downloads, 50 paying subs, $300 MRR net |
| Month 3 | 3K downloads, 250 paying, $1.5K MRR |
| Month 6 | 10K downloads, 800 paying, $5K MRR |
| Month 12 | 30K downloads, 2K paying, $15K MRR — sustainable |

## What to do if it doesn't work

- **Low conversion** (<5% trial → paid): pricing too high, onboarding too long, or no clear unlock value. Tune in this order.
- **High churn** (>10%/mo): the product isn't sticky enough. Coach should be opening more nudges. AI tone might be wrong. Survey churners.
- **Zero downloads**: marketing problem, not product. CORE has to *get found* — your job, not the backend's.

## What NOT to do post-launch

- Don't keep adding features for 2 months — fix what's broken first
- Don't lower the price to chase MRR — it signals desperation
- Don't grow social before the product retains
- Don't hire until $20K MRR — you can do this solo until then

## The actual point

The backend is done. It's not the bottleneck. The bottleneck is **you finishing the iOS app + submitting it**. Every week the iOS app isn't shipped is a week the backend earns $0.

Ship.
