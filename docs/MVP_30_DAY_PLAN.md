# Core — 30-day RN MVP build plan

**Goal:** TestFlight by Day 30. App Store live by Day 45.

**Scope cut to the bone:** Welcome → Quiz → Pick Vape → Permissions → Dashboard with Vape habit page + Recovery quest + AI Coach (text). Nothing else ships in v1.

**What's deferred:** Scanners, full social/feed, leaderboard, achievements, profile, multi-habit, Android, widget (post-launch).

---

## Week 1 — Foundation + auth (Days 1–7)

### Day 1 (Mon)
- [ ] Apple Developer Program signup ($99) — do today, takes 24h to activate
- [ ] Buy domain — try `core.app`, fallback `usecore.app`, `coreapp.io`
- [ ] Register TikTok handle `@coreapp` or `@quitvapecore`
- [ ] `pnpm install` in `~/Desktop/lifeos/`
- [ ] Boot Expo: `pnpm dev:mobile` → confirm welcome.tsx loads in Expo Go on your phone
- [ ] Create Supabase project on cloud (free tier)
- [ ] Run `supabase db push` to apply 0001_initial_schema.sql

### Day 2
- [ ] Wire Supabase Auth (Apple + Google) — replace mock in `apps/mobile/lib/supabase.ts`
- [ ] Test sign-in.tsx flow end-to-end (Apple-only is fine for v1)
- [ ] Set up RevenueCat free account, create products: `core_pro_monthly` ($9.99) + `core_pro_annual` ($59.99)
- [ ] Install `react-native-purchases` (already in package.json)

### Day 3
- [ ] Mirror pick-habits HTML to RN (`apps/mobile/app/(auth)/onboarding/pick-habits.tsx`)
- [ ] Wire to habits store (already exists)
- [ ] Test: select Vape → store has `userHabits: [{slug: "vape"}]`

### Day 4
- [ ] Mirror permissions HTML to RN (`permissions.tsx`)
- [ ] Hook to `expo-notifications` (request permissions for real)
- [ ] Hook to `expo-camera` (request permissions for real, even though we don't use it in v1)
- [ ] Mark `onboardedAt` in auth-store on completion

### Day 5
- [ ] Build dashboard.tsx (skeleton: stat panel + Today feed)
- [ ] Wire to `useStatsStore().computeNow()` for real numbers
- [ ] Test: log a slip via habits-store, see Lungs drop on dashboard

### Day 6–7
- [ ] Tab bar layout `(tabs)/_layout.tsx` (already exists, polish for 5 tabs)
- [ ] For MVP: only Home + Coach tabs functional. Hide Feed/Ranks/You behind "Coming soon."
- [ ] Bottom: floating "Log slip" FAB

**End of Week 1:** User can sign in, complete onboarding, see dashboard with their habit. No slip logging yet.

---

## Week 2 — Habit page + slip mechanic (Days 8–14)

### Day 8
- [ ] Build habit.tsx in RN (`apps/mobile/app/habit/[id].tsx`)
- [ ] Convert habit registry from HTML → RN constants (`constants/habits.ts` already exists)
- [ ] Render animated lungs SVG via react-native-svg

### Day 9
- [ ] Install Skia: `pnpm add @shopify/react-native-skia` (already in package.json)
- [ ] Build SmokeAnimation component using Skia particle system
- [ ] Test on device: tap button → smoke pours

### Day 10
- [ ] Build TapToLog component (big pink button)
- [ ] Wire to `useHabitsStore.logSlip("vape")`
- [ ] Haptic on tap: `Haptics.impactAsync(Heavy)`
- [ ] Sound effect on tap: `expo-av` plays exhale.mp3 (record one yourself, 1s)

### Day 11
- [ ] XP-loss popup animation (Reanimated)
- [ ] Lung-avatar damaged state (filter hue-rotate)
- [ ] Recovery prompt slide-up (already designed in HTML)

### Day 12
- [ ] Build recovery-quest.tsx in RN
- [ ] 60-second box-breath circle (Reanimated worklets)
- [ ] Text-area reflection input
- [ ] On finish: `recordRecovery(slipId, 12)` + back to habit page

### Day 13
- [ ] Streak counter UI on habit page
- [ ] "Honest log" button (`+5 Willpower` no slip)
- [ ] "Protect streak" button (`-50 XP, streak preserved`)

### Day 14 — checkpoint
- [ ] Full vape habit page works end-to-end on device
- [ ] Test 5 slips in a row, recovery quest, streak break, honest log, protect streak
- [ ] Record a 30-second video of yourself using it — this is your first TikTok asset

**End of Week 2:** The signature mechanic ships. From dashboard → habit page → tap → smoke → recovery, all working on a real phone.

---

## Week 3 — AI Coach + paywall (Days 15–21)

### Day 15
- [ ] Build Supabase edge function `ai-coach` (Deno + Anthropic SDK)
- [ ] System prompt from `docs/AI_PROMPTS.md` (Coach v0.1)
- [ ] Test: curl with hardcoded user state → get Claude response

### Day 16
- [ ] Build coach.tsx in RN (chat UI, suggested prompts, send button)
- [ ] Wire to edge function via `supabase.functions.invoke('ai-coach', { body: {...} })`
- [ ] Token-by-token streaming via Server-Sent Events (Anthropic Claude SDK supports)

### Day 17
- [ ] Coach context injection: pass user's habits, today's slips, last 7 days of stats
- [ ] Test 5 different conversations on device

### Day 18
- [ ] Build paywall.tsx in RN (mirror paywall.html)
- [ ] RevenueCat integration: `Purchases.purchasePackage()` for monthly + annual
- [ ] Sandbox test purchase

### Day 19
- [ ] Feature gating: free tier hits paywall when:
  - Trying to add a 2nd habit
  - Trying to use Coach
  - Trying to access stat drilldown
- [ ] Implement gate hooks: `useEntitlement('pro')` returns boolean

### Day 20
- [ ] Build settings.tsx (subscription management, account, privacy)
- [ ] RevenueCat: `Purchases.restorePurchases()` for users on new device
- [ ] Sign-out flow

### Day 21 — checkpoint
- [ ] Full payment flow tested in sandbox
- [ ] Coach responds with real Claude (Sonnet 4.6)
- [ ] Feature gates work

**End of Week 3:** App is monetizable. Coach works. You can actually charge $9.99.

---

## Week 4 — Polish, App Store assets, TestFlight (Days 22–30)

### Day 22
- [ ] App icon: design in Figma, export 1024×1024 — minimal Core wordmark on cyan-blue gradient
- [ ] Splash screen tuning

### Day 23
- [ ] Take 5 App Store screenshots on simulator
  - Habit page mid-smoke
  - Dashboard with healing lungs
  - Coach action card
  - Recovery quest
  - Rank-up
- [ ] Use figma overlay headlines from `docs/APP_STORE_LISTING.md`

### Day 24
- [ ] Record 15-second App Store preview video (use TikTok Video 1 storyboard, no voiceover)
- [ ] Privacy policy + ToS pages on `core.app` (use Termly or write yourself)

### Day 25
- [ ] Empty states (new user with no slips)
- [ ] Loading skeletons on dashboard
- [ ] Error states (no network, AI coach unavailable, etc.)

### Day 26
- [ ] Crash testing — Sentry integrated
- [ ] Performance pass — Reanimated all heavy animations, profile cold start
- [ ] Battery test (leave app open 1hr, check battery drain)

### Day 27
- [ ] EAS Build production build
- [ ] Upload to App Store Connect via Transporter
- [ ] Fill out App Store listing (copy from `docs/APP_STORE_LISTING.md`)

### Day 28
- [ ] Submit for TestFlight review
- [ ] Invite first 20 testers (your waitlist top quartile)

### Day 29
- [ ] TestFlight feedback collection (Form via Tally)
- [ ] Fix any blockers found

### Day 30 — checkpoint
- [ ] TestFlight live with real testers using it
- [ ] First TikTok post that says "available on TestFlight, comment for invite"

**End of Week 4:** Real users on real app. Feedback flowing in.

---

## Days 31–45 — App Store launch

### Days 31–35
- [ ] Iterate based on TestFlight feedback
- [ ] Submit for App Store review (separate from TestFlight)
- [ ] Apple review typically 24–72 hours

### Day 36–40
- [ ] App Store live!
- [ ] Launch on:
  - TikTok (saved videos + new launch video)
  - ProductHunt (schedule a Tuesday)
  - Twitter / X
  - Indie Hackers
  - Reddit r/QuitVaping (with mod permission)

### Day 41–45
- [ ] Daily monitoring: paid subs, refunds, support tickets, crash rate
- [ ] Reply to every App Store review in first 7 days
- [ ] Target: 50 paid subs by Day 45 = $500/mo on track to $5k/mo by month 4

---

## Hard rules

- ❌ **No scope creep** — if it's not in this plan, defer to v1.1
- ❌ **No Android until $5k MRR proves the model**
- ❌ **No social/feed in v1** — added in v1.1 after retention validation
- ✅ **Ship every Friday** — internal milestone, force discipline
- ✅ **Build in public** — TikTok videos showing what you shipped that week
- ✅ **Real device testing every day** — not just simulator

---

## Daily commitment (be honest with yourself)

- **3 hours/day minimum**, 6 days/week → ~78 hours of build time across 30 days
- **1 hour/day on TikTok content** (parallel growth) → ~26 videos posted by day 30
- **30 min/day on coach outreach** → 50 DMs sent across 30 days

If you can't commit this, the plan slips by 50–100%. Be real with yourself.

---

## Mid-plan checkpoints (kill criteria)

If at Day 14 the signature mechanic isn't on-device working → simplify further (cut Skia, use Lottie). Don't compromise the ship date.

If at Day 21 RevenueCat isn't tested → push hard to fix; this is your revenue.

If at Day 30 you can't get TestFlight live → cut Coach (defer to v1.1), ship without it. Habit page + recovery + paywall is the *minimum* viable product.
