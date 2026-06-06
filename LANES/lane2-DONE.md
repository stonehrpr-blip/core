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

Extra (Stone-approved follow-ups): scrubbed health claims in `docs/APP_STORE_LISTING.md`; added a **Legal** group (Privacy & Terms / Refund / Community) to `previews/25-settings.html` so all docs are reachable in-app.

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

- **`docs/TIKTOK_*.md`** + **`CORE_BATTLE_PLAN/02,03,05_*.md`** — still contain "lungs heal" / "your lungs are healing" in video scripts and feature specs. Same TGA/ACCC framing fix needed.
- **`apps/mobile/constants/stats.ts`** — Lungs stat description "Capacity, recovery, and clarity of breath" (borderline; it's a game-stat label, low risk).
- **`docs/APP_STORE_LISTING.md` line ~174** — bundle ID `com.harperlinks.core` still references "harperlinks". It's a technical identifier (immutable once shipped) — decide before first submit, not a copy change.
