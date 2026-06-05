# Core — Revenue strategy to $10–20k/mo

**Locked decisions (2026-05-26):**

| Decision | Value |
|----------|-------|
| Launch niche | **Vape quitting** |
| Brand | **CORE** (umbrella) — positioned at launch as "Quit Vape with Core" |
| Pro Monthly | **$7.99 / mo** |
| Pro Annual | **$44.99 / yr** ($3.75/mo blended, save 53%) |
| Free tier | 1 habit, 1 stat visible, basic dashboard, read-only feed |
| Trial | 7-day free, no card to start |
| First platform | iOS only (App Store), Android post month 4 |

---

## The math

**Blended ARPU at new pricing:** ~$6.50/mo (assumes 65% monthly / 35% annual mix)

| Revenue target | Paying subs needed | At 5% conversion | At 8% conversion (niche-focused) |
|----------------|-------------------|------------------|----------------------------------|
| $10k/mo | **1,538** | 30,800 users | 19,200 users |
| $20k/mo | **3,077** | 61,500 users | 38,500 users |

Niche conversion at 8% is realistic when the App Store listing literally says "Quit vaping in 30 days" and people search for that exact term.

---

## Why vape

1. **Massive TAM** — 11M vape users in US alone, 4M+ trying to quit. Sub-market is huge.
2. **High intent** — people who Google "quit vaping app" are days from buying.
3. **Mechanic fit** — smoke animation IS the vape mechanic. We don't need to invent a metaphor.
4. **TikTok-ready** — vape quitting + before/after lung visual = native viral content.
5. **Less competitive than "habit tracker"** — Sunnyside, Streaks, Habitica all fight on "general habits." Vape-specific = Smoke Free, QuitNow — both visually dated, both reviewed as boring.
6. **Easy expansion path** — same architecture handles weed, nicotine pouches, cigarettes once vape works.

---

## Pricing rationale

**Why not $3.99:**
- Cal AI ($9.99) and Headspace ($12.99) prove the market accepts $10/mo wellness pricing
- $3.99 signals "cheap habit tracker" — undercuts perceived value
- 250% price increase, expect ~40% conversion drop = 2.1× revenue per user

**Why $7.99 specifically:**
- Headspace anchor at $12.99 makes $7.99 feel like a steal
- Well below the "I need to think about this" psychological threshold (~$15)
- Undercuts Lock In / Smoke Free at $9.99+ while still signalling more value than $4.99 trackers

**Why $44.99 annual:**
- Saves ~$51/year vs monthly → unmissable savings frame
- Effective $3.75/mo → still feels cheap
- Locks in 12 months of revenue (anti-churn)

---

## Honest paths to revenue (ranked)

### Path 1 — B2C TikTok organic (Primary)
- TikTok account posting daily about vape quitting + Core mechanics
- Target: 50k followers in 90 days, 500k in 6 months
- Conversion: 1% TikTok → app download, 8% of downloads → paid
- Timeline: **$10k/mo by month 6–9**
- Risk: TikTok algorithm volatility

### Path 2 — Reddit / community-led
- r/QuitVaping (135k members), r/Vaping_Withdrawal, r/Stopdrinking-style communities
- Helpful posts + soft mentions, AMAs, "I built this for myself" angle
- Slower but trust-rich
- Timeline: **$5k/mo by month 4, $10k by month 8**

### Path 3 — Paid acquisition (Meta + Google)
- Target: "quit vaping" keyword + lookalike audiences
- CAC budget: $4–8 per install
- LTV at $7.99 + 25% annual conversion = ~$32/user → 4–6× LTV/CAC
- Needs ~$3k/mo ad spend at scale
- Timeline: **$10k/mo by month 5 IF unit economics hold**

### Path 4 — B2B coach SaaS (Parallel revenue)
- White-label Core for addiction coaches at $399/mo (with 5 client seats included)
- Target: 30 coaches in year 1 = $12k/mo
- Different sales motion — needs cold outreach to coaches on Instagram/LinkedIn
- Timeline: **$5k/mo by month 4, $10k by month 8**
- See [`docs/COACH_DASHBOARD_SPEC.md`](COACH_DASHBOARD_SPEC.md)

### Path 5 — 30-day Quit-Vape cohorts (Bridge revenue)
- $99 cohort fee, 50–100 paid spots per cohort, 6 cohorts/year
- One cohort = $5k–10k cash, no app required
- Use cohort signups to bootstrap waitlist for app
- Timeline: **First $5k cohort in 60 days** if you start marketing now

---

## My honest pick: combine Path 1 + Path 4

**Primary (70% effort):** B2C TikTok-first launch for vape quitters at $7.99/mo
**Secondary (30% effort):** B2B coach version sold to ~10 coaches in parallel

This dual-track gets you to $10k/mo faster:
- Even if consumer is slow, 30 coaches × $399 = $12k/mo at a small ratio
- Even if B2B sales cycle is long, consumer can hit $5k/mo by month 4

---

## What to do in the next 30 days

| Week | Focus |
|------|-------|
| W1 | Start TikTok account · post daily smoke-mechanic teasers · register `core.vape` or similar domain |
| W2 | Build landing page on the domain with waitlist · capture 500 emails |
| W3 | Finish RN build of vape habit page + recovery + dashboard · TestFlight to first 50 waitlist |
| W4 | Press kit + ProductHunt schedule · 5 coach outreach DMs · iterate from TestFlight feedback |

**Target by Day 30:** Waitlist of 1,500, TikTok at 5k followers, TestFlight active with 50 users, App Store submission within next 2 weeks.

---

## Honest blockers

1. **You're solo** — most consumer apps that hit $10k/mo have 2–3 people. Solo is possible but slower.
2. **App doesn't ship yet** — 30–45 days minimum to a real TestFlight
3. **No content factory** — TikTok needs daily posting, that's 30–60 min/day commitment
4. **Apple Review risk** — vape-related app needs careful framing (positioning as "quit support" not "vape tracker") to avoid rejection
5. **Stripe/IAP friction** — RevenueCat handles this but you haven't set up Apple Developer or RevenueCat yet

---

## What we kill / defer

- ❌ All-habit positioning at launch (defer to v2)
- ❌ Social feed at launch (defer to month 4 — proven retention boost)
- ❌ Multi-habit support at launch (1 habit free, unlimited at Pro — but launch marketing = vape only)
- ❌ Android (defer to month 4–6)
- ❌ Scanners (already roadmapped as Season 2+)
- ❌ Coach voice mode (Season 5)

Strip to the bone for launch: welcome → quiz → pick vape → permissions → dashboard with 1 habit page (vape) + recovery quest + AI coach text only.
