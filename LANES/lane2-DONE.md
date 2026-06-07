# Lane 2 — Legal & Copy Scrub — DONE

Status: **complete** (2026-06-05). Lane: COPY & LEGAL (content only).

## What shipped

| # | Step | Result |
|---|------|--------|
| 1 | Scrub absolute health claims | `08_COPY_LIBRARY.md` softened to subjective framing; compliance note added at §11. No absolute claims remain (verified by grep). |
| 2 | ACL refund/cancellation policy | New **Refund** tab in `previews/82-legal.html` + standalone `previews/refund-policy.html`. |
| 3 | Community guidelines | New `previews/community-guidelines.html` (was referenced in copy lib §16, file was missing). |
| 4 | Age → 18+ | `82-legal.html` Privacy + Terms now 18+ (was 13). |
| 5 | Export legal strings | `apps/mobile/constants/legal-strings.ts` (passes `tsc --strict --noEmit`). |
| 6 | Entity name | `web/landing/index.html` footer `Harper Links` → `Core` + ASIC-placeholder TODO. Landing public health claims softened too (per Stone's call). |

Extra (Stone-approved follow-ups): scrubbed health claims in `docs/APP_STORE_LISTING.md`, the TikTok briefs (`docs/TIKTOK_*.md`), the battle-plan specs (`CORE_BATTLE_PLAN/02,03,05`), `docs/MODULE_MAPPING.md`, and the waitlist site `site/index.html`. A **Legal** links group for `previews/25-settings.html` was also written, but **clobbered by the concurrent settings/CORE-Plus lane** in the shared worktree before it could commit — see the race note at the bottom; it needs re-adding by that lane.

**Pricing reconcile (folded into this lane, 2026-06-05):** canonical price standardised to **$7.99/mo · $44.99/yr ($3.75/mo blended, save 53%)** everywhere — incl. app code `apps/mobile/app/(auth)/trial-expired.tsx`, the App Store listing, `previews/97-gallery.html`, and all strategy docs (REVENUE_STRATEGY, COMPETITOR_TEARDOWN, PRD, REDDIT_LAUNCH, MVP_30_DAY_PLAN, 00_README, 01_STRATEGY). **Do NOT touch** `previews/_lib/core-pricing-ab.js` — its $4.99/3-day vs $7.99/7-day split is an intentional live experiment. Competitor prices ($9.99 etc.) are facts, left as-is.

## For the COMPLIANCE-LOGIC session — import from `legal-strings.ts`

```ts
import {
  ENTITY, SUPPORT_EMAIL, MIN_AGE,
  DISCLAIMERS, CONSENT, REFUND,
  CRISIS_LINES, DEFAULT_CRISIS_REGION,
  LEGAL_DOCS, LEGAL_LAST_UPDATED,
} from "@/constants/legal-strings";
```

Key contracts to wire:
- **Age gate:** block account creation unless `CONSENT.ageConfirmation` is accepted. `MIN_AGE === 18`.
- **Sign-up consent:** show `CONSENT.termsAcceptance` (links via `LEGAL_DOCS`); require explicit accept.
- **AI surfaces:** render `DISCLAIMERS.aiCoach` on/near the Coach screen; `CONSENT.aiProcessing` once.
- **Health/Apple Health opt-in:** gate on `CONSENT.healthData`.
- **Paywall/trial:** show `CONSENT.subscriptionDisclosure` before purchase (auto-renew + cancel + AUD).
- **Recovery/progress copy:** must follow `DISCLAIMERS.recoveryFraming` — never reintroduce absolute health-outcome claims ("lungs heal", "breath capacity climbs by month 3"). TGA/ACCC risk.
- **Crisis:** use `CRISIS_LINES[region] ?? CRISIS_LINES[DEFAULT_CRISIS_REGION]`.

`ENTITY.legalName` is the **placeholder "Core"** — `ENTITY.isRegisteredEntity === false`. Flip to the real entity name once ASIC registration completes.

## Flags left for other lanes (NOT touched — out of my owned files)

- ~~`docs/TIKTOK_*.md` + `CORE_BATTLE_PLAN/02,03,05`~~ — **now scrubbed** (2026-06-05) to avatar/subjective framing; killed the quantified "lung capacity recovers ~30% in 3 weeks" claim.
- **`apps/mobile/constants/stats.ts`** — Lungs stat description "Capacity, recovery, and clarity of breath" (borderline; it's a game-stat label, low risk).
- **`docs/APP_STORE_LISTING.md` line ~174** — bundle ID `com.harperlinks.core` still references "harperlinks". It's a technical identifier (immutable once shipped) — decide before first submit, not a copy change.

## ⚠️ Shared-worktree race — for the SETTINGS / CORE-Plus lane

This lane ran concurrently with 5 others in a **shared working tree + shared git index**. Edits to files this lane *owns* committed cleanly (`85ff31b`, 24 files). But `previews/25-settings.html` is owned by the settings/CORE-Plus lane, and the "Legal" links group this lane wrote to it was **overwritten by that lane before it could be committed — it is NOT recoverable from git.** Please re-add it: insert this block immediately **before** `<div class="lab">Data</div>` (the `.row/.ri/.rb/.val` classes already exist in the file):

```html
        <div class="lab">Legal</div>
        <div class="group">
          <a class="row" href="82-legal.html" style="text-decoration:none;color:inherit;"><div class="ri"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h9l5 5v15a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V2Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg></div><div class="rb"><b>Privacy &amp; Terms</b><span>Privacy Policy · Terms · EULA</span></div><svg class="val" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></a>
          <a class="row" href="refund-policy.html" style="text-decoration:none;color:inherit;"><div class="ri"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18v10H3zM3 11h18"/><path d="M7 15h4"/></svg></div><div class="rb"><b>Refund &amp; Cancellation</b><span>How to cancel · refunds · your rights</span></div><svg class="val" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></a>
          <a class="row" href="community-guidelines.html" style="text-decoration:none;color:inherit;"><div class="ri"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-5-5.9"/></svg></div><div class="rb"><b>Community Guidelines</b><span>Be honest · be kind · keep it safe</span></div><svg class="val" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></a>
        </div>
```

**Lesson for parallel lanes:** only edit files your lane owns. Edits to shared / other-lane files in this worktree can be silently clobbered (and won't survive even in a commit if the clobber lands first).
