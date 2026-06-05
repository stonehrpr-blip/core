# Competitor teardown · quit-vape apps

**Question:** Why does Core win? Where does it lose? Where do we copy from competitors?

---

## At a glance

| App | Price | DAU est. | App Store | What it nails | What it lacks |
|-----|-------|---------|-----------|---------------|---------------|
| **Smoke Free** | $9.99/mo or $39.99/yr | 200k | 4.7 (44k reviews) | Free version is generous · health milestones · community feed | Visual feels 2019 · no AI · slip handling weak |
| **QuitNow** | $4.99/mo or $24.99/yr | 80k | 4.6 (12k) | Money-saved counter · friend support · multilingual | Outdated UI · no real coach · social feed weak |
| **Quit With Me** | $7.99/mo | 25k | 4.4 (3k) | Personalized quit plan · CBT-style prompts | Niche · slow updates · no scanners |
| **Kwit** | $4.99/mo | 60k | 4.5 (8k) | Beautiful animations · positive reinforcement | Cigarette-focused · no AI · slip = shame loop |
| **Pivot Breathe** | clinic only | enterprise | n/a | Real clinical backing · employer-paid | Locked to enterprise · no consumer access |
| **Cal AI** | $9.99/mo | 500k+ | 4.7 (28k) | Calorie scan UX · GenZ aesthetic · viral TikTok | Not quit-related — relevant as ASPIRATIONAL PMF model |
| **Headspace / Calm** | $12.99/mo | 5M+ | 4.8 (1M+) | Premium price tolerated · big content moat | Generic — not quit-specific |
| **CORE** | $7.99/mo or $44.99/yr | — | — pre-launch | Visceral slip mechanic · AI coach with actions · 7-tier rank · home widget | Untested PMF · no community yet · only 1 person building |

---

## Detailed breakdown

### Smoke Free
**The market leader. ~$3M ARR estimated. Public-benefit-corp vibe.**

- **What works:** 60+ "milestones" people screenshot for Reddit. Real health-data backed claims ("your circulation improves in 2 weeks"). Free tier converts at ~5% to paid. Multi-platform.
- **What's tired:** Visual design hasn't been refreshed since ~2020. Slips are passive — you just reset a counter. No AI. Coach is a one-way blog feed, not interactive.
- **What we copy:** Their milestone-content idea is gold. Build in 60+ visual milestones for Core (e.g., "Day 28 — your lung cilia regenerate"). Pin to share-cards.
- **Where we win:** Tap-to-smoke mechanic. Real-time AI coach. Modern aesthetic. Higher pricing = better cohort retention.

### QuitNow
**The cheap budget option. Older UI. Religious-style streak emphasis.**

- **What works:** Hyper-cheap. Multilingual. Money-saved counter is psychologically sticky ("you've saved $387!").
- **What's tired:** UI feels like Android Material from 2017. No AI. "Achievements" are basic numbers, not visual. Community is mostly bot-posts.
- **What we copy:** The money-saved counter — add this as a stat tile in the Wallet drilldown ("vape savings: $384").
- **Where we win:** Premium positioning. Native iOS feel. Real social moderation (their feed is a wasteland).

### Quit With Me
**The smallest competitor — niche personalization angle.**

- **What works:** Onboarding asks deep psychology questions (why do you smoke?), generates a "personalized quit plan." CBT-leaning prompts feel earnest.
- **What's tired:** Tiny dev team (looks like 1 person too). Updates every 6 months. No streak protection. No AI.
- **What we copy:** Their deep onboarding — but our 14-step quiz already matches this. Stop here.
- **Where we win:** Everything except onboarding depth (we tie).

### Kwit
**The "design darling." Beautiful but cigarette-not-vape.**

- **What works:** Genuinely beautiful animations. Positive reinforcement done well ("You haven't smoked 47 cigarettes this week").
- **What's tired:** Cigarette-focused. When you slip: confetti goes away, soft purple message, nothing else. No teeth.
- **What we copy:** Their celebration animations for milestones. Our rank-up screen is already aiming here.
- **Where we win:** Vape-native positioning. Slip-as-event is felt, not whispered. Coach actually responds.

### Pivot Breathe
**Enterprise-only. Sold to employer health plans.**

- **What works:** Clinical backing (uses CO breath sensor). Coverage by major insurers. Studies show 30% quit-rate at 12 months.
- **What's tired:** Locked to enterprise. Consumers can't buy directly. No viral hook.
- **What we copy:** Nothing in v1. **Potential B2B partnership:** sell Core to employer wellness programs as a Pivot alternative ($5–20/mo per seat, B2B procurement).
- **Where we win:** Direct consumer access. Modern UX.

### Cal AI (aspirational PMF)
**Not a competitor — but the apple-our-eye for proving GenZ pays $10/mo.**

- **What works:** TikTok-virality first product. Camera scan = magic moment. $30M ARR in <1 year. Pricing power: started $4.99, raised to $9.99, retention held.
- **What we copy:** EVERYTHING about their launch strategy. TikTok-first. Single-mechanic hero. Aggressive pricing.
- **Where we differ:** Cal AI is feel-good (calorie scan). Core is honesty-driven (slip mechanic). Both work; different muscle.

### Headspace / Calm
**Wellness category gravity. Not direct competition but pricing ceiling.**

- **What works:** $12.99/mo accepted norm. Massive content moats. Celebrity endorsements.
- **Reference:** Our $7.99 sits well below their $12.99 — psychologically a steal vs their anchor.
- **Where we win:** Specificity. Headspace is "general wellness." Core is "I'm quitting vape." Niche = higher conversion at lower CAC.

---

## Pricing positioning map

```
$ 4-5/mo  ── QuitNow, Kwit
$ 7-10/mo ── Quit With Me, Cal AI, [CORE]   ← we're here
$10-13/mo ── Smoke Free, Headspace, Calm
$15-30/mo ── Whoop (hardware), MyFitnessPal Premium
```

Core's $7.99 sits **just below the cluster's center**. Visible value justifies it. Going to $14.99 would put us in Headspace territory — too brand-rich for indie founder. Going to $4.99 would mean we're competing on price, which we'd lose.

---

## Feature matrix (objective)

| Feature | Smoke Free | QuitNow | Kwit | Quit With Me | **CORE** |
|---------|:----------:|:-------:|:----:|:------------:|:--------:|
| Streak counter | ✅ | ✅ | ✅ | ✅ | ✅ |
| Money saved | ✅ | ✅ | ✅ | ✅ | ❌ (v1.1) |
| Health milestones | ✅ | ⚠️ basic | ✅ | ⚠️ | 🟡 partial |
| **Visceral slip mechanic** | ❌ | ❌ | ❌ | ❌ | ✅✅✅ |
| AI coach (chat) | ❌ | ❌ | ❌ | ⚠️ scripted | ✅ |
| **AI coach (actions)** | ❌ | ❌ | ❌ | ❌ | ✅✅ |
| Recovery quest after slip | ❌ | ❌ | ❌ | ⚠️ basic | ✅ |
| Streak protection | ❌ | ❌ | ❌ | ❌ | ✅ |
| Honest log (no slip) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Multi-habit tracking | ⚠️ | ❌ | ❌ | ❌ | ✅ |
| Home-screen widget | ⚠️ basic | ❌ | ✅ | ❌ | ✅✅ |
| Social feed | ✅ but weak | ✅ but weak | ❌ | ❌ | ✅ |
| Rank ladder | ❌ | ❌ | ✅ basic | ❌ | ✅✅ 7-tier |
| Local-first | ❌ | ❌ | ❌ | ❌ | ✅ |
| Camera scanners | ❌ | ❌ | ❌ | ❌ | ✅ (S2+) |
| Sober community | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| Native iOS feel | ⚠️ | ❌ | ✅ | ⚠️ | ✅✅ |

---

## What this tells us

**Where we MUST win:** Visceral slip mechanic. It's our entire reason to exist. If it doesn't feel different to users, the rest doesn't matter.

**Where we MUST match:** Multi-platform health milestones, money saved counter, native iOS feel. Table stakes.

**Where we can SKIP:** Cigarette-specific features, CO breath sensor (clinical), affiliate marketplaces.

**Where we attack:**
- **Smoke Free**: positioned as "the modern alternative" — better UX, AI-led, premium feel
- **QuitNow**: positioned as "actually works" — pay 2× more, succeed 5×
- **Kwit**: positioned as "for vape specifically" — they're cigarettes-first
- **Quit With Me**: we just outpace on shipping velocity

---

## Launch positioning statement

> "The other apps count your clean days. Core makes you feel the cost of breaking them — and that's what finally works."

This single line is our wedge. Use it in:
- TikTok bio
- App Store subtitle (alternative: "Track, breathe, level up clean")
- Product Hunt tagline
- Press kit headline
- Cold DM to coaches
- Reddit launch post hook

---

## What we monitor post-launch

| Competitor | Signal | Frequency |
|------------|--------|-----------|
| Smoke Free | App Store reviews — what are users complaining about? | Weekly |
| Cal AI | TikTok viral growth — what content patterns work? | Daily |
| Headspace | Pricing experiments — do they raise/drop? | Monthly |
| Kwit | Feature launches — are they catching up? | Monthly |
| New entrants | New "quit vape AI" apps on App Store | Monthly |

If a direct copycat appears (likely within 6 months), pre-prepared response:
1. Welcome them publicly — bigger market = more legitimacy
2. Highlight our pace of shipping (their copy is always 6 months behind)
3. Lean harder into the unique mechanic that's hardest to copy (the AI pattern detection on real user data)
