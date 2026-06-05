# Lane6 — Design Polish — DONE

**Goal:** bring the auth/onboarding previews (04–09) up to the main-app bar and
converge drifting design tokens. CORE accent = electric blue. One canonical
value per rarity. Body text passes WCAG AA.

**Branch:** `lane6-design-polish` (only the 8 owned files staged; parallel
lanes' working-tree edits to product pages 20–28 were left untouched).

## Premise corrections (audit before edits)

1. **`apps/mobile/theme/colors.ts` does not exist.** The real RN color source is
   `apps/mobile/constants/theme.ts`. Mirrored the canonical rarity hexes there.
2. **The gold/pink literals are mostly NOT rarity.** `--core-amber-500` /
   `--core-pink-500` (core-buttons.css) and `--apple-yellow` (core-apple.css) are
   semantic stat/brand/Apple palette tokens; in 07 the `#FFC857` / `#FF6BAA`
   literals are XP amber, alcohol/vape habit colors, avatar tints and the notif
   icon. Converging those to rarity would have changed their meaning, so they
   were left alone. Only genuine rarity-context uses were tokenized.
3. **The auth pages already inherit the shared atmosphere** via
   `core-background.js` (which removes a page's local `.bg`/`.aurora` and injects
   the shared stack) — except **09**, which loaded neither the theme nor the
   atmosphere. That was the real "spare" page.
4. **`#FF6BAA` is never a rarity color in 07.** The genuine mythic-rarity element
   is `.jug-verdict.mythic` (12+ cups) + its celebration, whose hero color had
   drifted to a vivid magenta `#FF4DB8` — not even the canonical `#FF5C8A`. That
   hero is what got converged.

## What shipped

### Canonical rarity ladder — single source of truth
- `previews/_lib/core-theme.css` += `--rarity-common/rare/epic/legendary/mythic`
  = `#9AA1B7 / #4A8FFF / #B388FF / #FFC56B / #FF5C8A`, matching the values
  `20-dashboard` (`--r-*`) and `27-shop` (`--legendary`/`--mythic`) already use
  locally → rarity now renders identically across pages.
- `apps/mobile/constants/theme.ts` += matching `rarity` block (kept in lockstep).
- `07-trial.html`: legendary-gold daily-chest accent `#FFC56B`/`rgba(255,197,107)`
  → `var(--rarity-legendary)` / color-mix (5 lines).
- `07-trial.html`: mythic-tier hero magenta `#FF4DB8`/`rgba(255,77,184,…)` →
  `var(--rarity-mythic)` / color-mix (10 refs) so a mythic moment matches mythic
  items. Secondary indigo/violet/blue ring tints and the 7-color JS confetti
  array were preserved (intentional cinematic, not a swatch).

### Token convergence — auth previews 04–09
- **114** hardcoded `rgba(74,143,255,…)` → `color-mix(in srgb, var(--accent) N%,
  transparent)`. Renders pixel-identical but the electric-blue accent now flows
  from one token. (The 2 alpha-0 transparents in 09 gradients were left as-is.)
- **09-first-chest**: wired into the shared identity — `core-theme.css` +
  `core-theme.js` + `core-responsive.css`, `data-font="apple"` (SF Pro, like
  04–08). Chose `core-theme.css` (re-skins its existing `.bg`/`.aurora` in place
  via `!important`) over `core-background.js` (which would remove them and break
  its `body.phase-reveal .aurora` cinematic).

### Contrast (WCAG AA)
- Documented `--text-secondary` (bumped 0.70→0.72, ~10:1 on void) as the AA
  body-copy token; `--dim`/`--text-dim`/`--text-disabled` are chrome-only.
- Moved readable body copy off `--dim`: footers (04/05/06), sheet fine-print (04),
  and the dead-but-misnamed `.small-print` style (07) → `--text-secondary`.

## Verified
- Rendered 04 / 06 / 07 / 09 (headless Chrome, 900px window): shared atmosphere
  present, accent glows intact, footers legible, **no malformed `color-mix`**.
- All 6 pages link `core-theme.css`, so `--accent` / `--rarity-*` /
  `--text-secondary` all resolve.
- Re-audited every remaining `--dim`/`--text-dim` usage → all confirmed chrome
  (uppercase micro-labels, countdowns, disabled/locked states, decorative
  arrows/icons). No body copy left on a sub-AA token.

## NOT verified here
- RN `tsc` could not run — TypeScript isn't installed at the monorepo root (known
  bundler blocker). The `theme.ts` change is a trivial, well-formed `as const`
  addition.
- The mythic-verdict celebration was not screenshotted live (requires driving 07
  to 12 cups); converged values were validated statically against the canonical
  token.

## Intentionally NOT done (out of scope / would degrade)
- Did **not** retokenize product pages 20/27/28 to `var(--rarity-*)` — another
  lane's territory; they already render the canonical values.
- Did **not** touch the semantic palette tokens (`--core-amber-500`,
  `--core-pink-500`, `--apple-yellow`) or 07's habit/XP/avatar/notif colors.
- Did **not** flatten the mythic celebration's multi-color cinematic (purple/blue
  rings, confetti array) — only the rarity-identity hero color was converged.
