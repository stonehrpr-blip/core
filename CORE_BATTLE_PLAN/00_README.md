# CORE BATTLE PLAN — Master Prompt

> **For Claude:** This folder is the complete build spec for CORE (the Quit-Vape app at `~/Desktop/lifeos/`). It exists because two direct competitors — Reload (200k users) and The Lock In — are eating the "lock-in / discipline" positioning CORE was built on. This document is how we make them irrelevant.
>
> **Mission:** Ship a CORE that makes Reload and The Lock In look generic by side-by-side comparison. Vape-specific, viscerally gamified, AI-coached, B2B-enabled, and aesthetically uncompromising.
>
> **Your job:** Execute every section in order. Do not skip. Do not summarize and ship. Do not delete anything from the spec because it "seems like polish." The polish IS the product.

---

## How to use this document

1. **Read this README in full** before touching code.
2. Open files in the order numbered (`01_` → `09_`). Each file references the previous ones; reading out of order will lose context.
3. After each section, **stop and verify** against the verification checklist (`09_VERIFICATION.md`).
4. Commit after each section, not after each file edit. Commit messages: `CORE: <section> — <one-line summary>`.
5. When the spec says "**MUST**", that's non-negotiable. When it says "**Recommended**", you have judgment room. When it says "**Defer**", do not do it now.
6. When you find an ambiguity, default to the more user-respecting interpretation (more friction on destructive actions, more help on confusion, less aggression on payment).
7. If something contradicts what already exists in the codebase, the SPEC wins unless the existing code reflects a deliberate Stone decision documented in memory.

---

## The folder

| File | Purpose | Read when |
|---|---|---|
| `00_README.md` | This file — strategic frame + how-to | First, always |
| `01_STRATEGY.md` | Why CORE wins. Competitor parity matrix. Pricing. Positioning lines. | Before any feature decisions |
| `02_EXISTING_FILES_AUDIT.md` | Every existing HTML/JS/CSS — what's good, what's broken, what to fix | Before any edits to existing files |
| `03_NEW_FEATURES.md` | Every new feature to add — blocking, agentic Coach, multi-intensity sessions, etc. | When you've finished the audit fixes |
| `04_PAGE_BEHAVIORS.md` | Page-by-page deep behavior spec — state on load, interactions, animations, error states | While building/fixing each page |
| `05_USER_JOURNEYS.md` | End-to-end user flows — new user, returning, slip, recovery, churn, friend invite | Before wiring routes between pages |
| `06_EXECUTION_PLAN.md` | Day-by-day build order, dependencies, parallel tracks | Use this as your task list |
| `07_AESTHETIC_BIBLE.md` | Design system — colors, gradients, type, motion, sound, haptics, shadows, glass | Before any new component |
| `08_COPY_LIBRARY.md` | Every string in the app, all 4 Coach tones, all microcopy | When writing UI text |
| `09_DATA_MODELS.md` | State shapes, schemas, analytics events, storage keys | Before touching `core-state.js` or any persistence |
| `10_VERIFICATION.md` | Definition of done per section, verification commands, smoke-test scripts | After every section |

---

## Strategic frame — what we're building

CORE is **not** a habit tracker. It is **not** a focus app. It is **not** a quit-vaping app.

CORE is a **dignity restoration mechanic disguised as a quit-vape app**.

Every interaction either restores or erodes the user's sense of being someone who keeps promises. The "5 stats" (Lungs, Brain, Wallet, Willpower, Body) are not metrics — they are *evidence*. The streak is not a number — it is a *witness*. The Coach is not a chatbot — it is the calm adult in the user's head they wish they had at 2am.

This frame matters because every spec decision below is downstream of it. When you choose copy, motion, or features, ask: **"Does this restore dignity, or just track behavior?"** Reload tracks. Lock In tracks. CORE *witnesses*.

---

## Why this matters now — the competitive moment

Both Reload and The Lock In launched in 2025. They are growing fast. They share the language CORE was built on ("lock in", "reset", "discipline"). They have features CORE doesn't:

- **App/website blocking** with Screen Time enforcement (Reload's #1 reviewed feature)
- **Multi-intensity focus sessions** (Lock In's "Trenches" mode)
- **Agentic AI coach** that can actually start timers and create habits (Lock In's "Bob")
- **Book summary libraries** (Reload bundles them)
- **14-tier badge ladders** (Lock In has more granularity than CORE's 7-tier)
- **Lifetime pricing** ($24.99–$49.99 — devastating to subscription LTV)
- **10 languages** (Reload), **7 languages** (Lock In) vs CORE's 1

Both are priced lower:
- Reload: $39.99–$49.99/year + lifetime tier
- Lock In: $44.99/year
- CORE (current): $59.99/year ← **most expensive, fewest features**

This spec closes the feature gaps **while keeping CORE's unique advantages**:
- Vape-specific niche (neither competitor goes there)
- Visceral tap-to-log slip animation (smoke/decay/melt)
- 4-tone Coach personality system (gentle / balanced / direct / drill)
- Inverse gamification (slips remove XP — both competitors only reward, never punish)
- B2B Coach SaaS revenue path (Reload and Lock In are pure B2C)
- "Promise" contract gate before trial starts (commitment device neither has)
- Crisis screen + panic flow (Lock In has neither; Reload has neither)
- Streak insurance / freeze / 48hr restore window
- Body / food / outfit camera scans (multi-modal evidence)

The job of this spec: **make every CORE feature obviously better than its closest equivalent in Reload or Lock In, and add five features neither has.** Not "match parity" — make their users feel like they're using a worse version of the same idea.

---

## The five features they don't have (and we must ship)

1. **Witness Mode** — Coach watches your screen-time and, with permission, sends real-time "are you about to slip?" pings when usage patterns match your past pre-slip behavior. This is the AI moment Reload and Lock In don't have — *predictive*, not reactive.

2. **The Promise Letter** — On day 7 of clean streak, the Coach writes the user a letter from "the version of you that made it to day 365" and stores it. It re-surfaces on day 30, 60, 100, and any near-slip. Asynchronous self-accountability. Neither competitor does narrative.

3. **Pact System** — Two users mutually stake $5 (held by app, returned on completion). One slips, the other gets it. Friendship-as-collateral. Reload removed its social features; Lock In removed its "Duo" mode. We add ours back with money on the line.

4. **Body Receipts** — Weekly body scan + lung function self-test (hold-breath timer) + vape-day timeline. The user can SEE their lungs getting better in pixel form. Reload's "Recovery Goals" are text. Ours are *evidence*.

5. **The Calm Library** — 60-second video scripts the Coach reads to you, generated from your specific triggers, on demand. Not generic meditations. Yours. Reload has "relaxation sounds." We have *the Coach's voice telling YOU the specific thing*.

---

## What CORE will NOT do

These are deliberate exclusions. Saying no is positioning.

- **No general habit tracker.** Vape is the wedge. Other habits unlock at day 30 (one bonus habit), day 90 (two), day 180 (unlimited). Earned, not given.
- **No leaderboards by raw streak length.** Toxic to new users. We rank by *recovery quality* — slip count + recovery speed + days since last slip, weighted.
- **No public feed by default.** Posts are friends-only unless explicitly made public. Reload's community is open by default; we are friends-first.
- **No "buy lifetime" without a 7-day trial first.** Refundable, but no impulse purchase. The Promise is the contract; lifetime is a downstream choice.
- **No streaks that "can't be recovered."** Within 48 hours, $0.99 restore. Past 48 hours, the streak is honestly lost and we don't lie about it. No artificial sympathy purchases.
- **No notifications between 11pm and 7am unless the user is in Crisis mode.** Sleep is sacred. Lock In and Reload notify 24/7.
- **No "rage-bait engagement."** No fake friend slips, no fake "your rank dropped" — every notification represents a real event.

---

## The architecture in one paragraph

Static HTML previews under `~/Desktop/lifeos/previews/` are the **canonical design source**. They are the spec made visible. The React Native app under `~/Desktop/lifeos/apps/mobile/` mirrors them. Web landing under `~/Desktop/lifeos/web/landing/` is the public marketing surface. All three share state shape via `core-state.js` (web) and `game-state-store.ts` (RN). Analytics route through `coreTrack` (web) / `useAnalytics` (RN). When a preview HTML and an RN screen disagree, the **preview wins** and the RN screen is updated to match. When the spec disagrees with both, the **spec wins** and both are updated.

---

## The Claude Code session protocol

When working through this spec:

- **NEVER batch unrelated changes into one commit.** One section = one commit minimum, often more.
- **NEVER auto-format files you aren't editing.** Whitespace diffs pollute review.
- **NEVER add commented-out code.** Delete it or keep it. There is no third option.
- **NEVER add `console.log`s without prefixing them `[analytics]` (chokepoint use) or `[debug]` (and removing before commit).**
- **NEVER use emoji in files** (Stone's standing rule). The brand uses iconography, not glyphs.
- **NEVER change copy without checking `08_COPY_LIBRARY.md`** for the canonical version.
- **NEVER change a color or gradient without checking `07_AESTHETIC_BIBLE.md`.**
- **NEVER skip the verification step at the end of a section.**

When you finish a section, post to the user (Stone): "Section X complete. N files changed. Verified via: <check>. Next: section Y." Then stop and await confirmation before continuing.

---

## Glossary

| Term | Meaning |
|---|---|
| **CORE** | The product brand. The folder name `lifeos` is legacy and will stay. |
| **The Coach** | The in-app AI assistant. Has 4 tones. Always referred to as "Coach" in copy, never "AI" or "assistant." |
| **The Promise** | The typed-PROMISE commitment in `trial.html` step 0. The contract. |
| **Lock-in** | NOT used in CORE copy. Reload owns "reset," Lock In owns "lock in." CORE owns "**become**" — as in "become your core." |
| **Slip** | One vape incident. Recorded via `coreState.logSlip()`. NOT "lapse," NOT "relapse," NOT "fall." |
| **Recovery** | The 60-second post-slip flow (`recovery-quest.html`). Not punishment, evidence collection. |
| **Witness** | The Coach in observational mode. New feature, see `03_NEW_FEATURES.md` §1. |
| **Body Receipt** | Weekly snapshot of lung/body metrics. See `03_NEW_FEATURES.md` §4. |
| **Pact** | Mutual $5 stake with a friend. See `03_NEW_FEATURES.md` §3. |
| **Rank** | The 7-tier progression: Focus → Spark → Flow → Forge → Edge → Peak → Apex. Expanded to 13 tiers in this spec — see `03_NEW_FEATURES.md` §10. |
| **Stat** | One of the 5 life metrics: Lungs, Brain, Wallet, Willpower, Body. Each 0–100. |
| **Life Score** | Average of 5 stats. The single number on the dashboard. |
| **Owner-only** | Screens behind the gallery passphrase. Not visible to end users. |

---

## Reading order rationale

You read 01 first because **strategy gates feature choices**. Without the strategy frame, you'll build features that match Reload instead of beating it.

You read 02 second because **the existing files are full of small bugs and inconsistencies** that will compound if you build on top of them. Fix the foundation first.

You read 03 third because **new features must slot into the cleaned foundation**, not the buggy one.

You read 04 fourth because **page behaviors codify the feature decisions** from 03 into testable specs.

You read 05 fifth because **journeys are the integration test** — they prove the pages connect properly.

You read 06 sixth because **execution order matters** — some features unblock others.

You read 07–09 alongside the work — they're reference, not narrative.

You verify against 10 after EVERY section. Not at the end. After every section.

---

## What "done" looks like

CORE is "done" against this spec when:

1. A new user can download the app, complete the Promise + onboarding, log their first slip, get a Coach response in their chosen tone, and feel like the app understood them — all in under 4 minutes.
2. A 30-day user has experienced: 1 milestone celebration, 1 streak loss + restore (or honest loss), 1 Witness ping, 1 Pact invitation, 1 Body Receipt, 1 Coach-written Promise Letter, 1 Calm Library session.
3. A 90-day user has unlocked their first bonus habit, hit Peak rank, has 3+ Pact partners, and has received an export of their "first 90 days" report (PDF + shareable card).
4. A churning user has been offered: pause, freeze stack, switch tone, downgrade, lifetime conversion, and a final "leave Core" escalator — in that order, with no dark patterns.
5. A coach (B2B user) can onboard, invite 5 clients, see all 5 clients' Life Scores in one dashboard, generate session prep briefs, and bill via the platform.
6. Every page passes the verification in `10_VERIFICATION.md`.

When all six are true: ship to TestFlight. Until then: don't.

---

## A note on Reload and The Lock In

You will find this spec sometimes references their features. That's not because we copy them — it's because we **acknowledge they exist and beat them at their own game**. When the spec says "their Bob can start timers; our Coach can start timers + write a letter + invoke a Pact + open the Calm Library," that's not parity, that's containment.

When you build a CORE feature that has an equivalent in their apps, ask: "Would a user who's tried both pick CORE for THIS feature?" If the answer is "maybe," redesign until the answer is "obviously."

---

## How to skim this if you only have an hour

You don't have an hour. Read the whole thing.

But if your context window is genuinely about to compact:

1. This README (10 min)
2. `01_STRATEGY.md` §"The five wedges" (10 min)
3. `03_NEW_FEATURES.md` §1, §2, §3, §4, §5 (the five new features) (20 min)
4. `06_EXECUTION_PLAN.md` week 1 plan (10 min)
5. `09_VERIFICATION.md` the smoke-test (10 min)

Then start with week 1, day 1. Come back for the rest before week 2.

---

## Signature line

This spec was written 2026-05-30 against the state of `~/Desktop/lifeos/` at that date. Stone is the founder. The Coach has four voices. The Promise is real. The user is doing their best.

Begin.
