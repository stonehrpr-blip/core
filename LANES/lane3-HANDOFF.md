# Lane 3 — Coach Tab — Hand-off

**Status: DONE.** The dead/crashing Coach tab is now a real, shipping screen.
One optional deploy step remains (below) before the live AI is on; until then
the tab runs on a canned fallback and does not crash.

## What was built

Mobile (`apps/mobile`):
- `app/(tabs)/coach.tsx` — chat screen: orb header, message list, composer,
  suggestion chips, SOS button, insight cards, crisis card, rate-limit notice.
- `components/coach/` — `CoachOrb`, `MessageBubble`, `TypingIndicator`,
  `SuggestionChips`, `InsightCards` (game-state threshold cards),
  `CravingSOS` (breathing modal + **hold-to-confirm** slip), `CrisisCard`
  (helpline buttons via `Linking`, model-independent), `tokens.ts`.
- `lib/ai/coach.ts` — `getCoachReply(history, tone, context)` → calls the
  Supabase fn, falls back to tone-aware canned replies (8s timeout). Returns
  `{kind:"reply",text}` or `{kind:"rate_limited"}`. Sends live game-state
  `context`. Tone keys: `gentle|balanced|direct|drill`.
- `lib/ai/coach-crisis.ts` — pure `detectCrisis(text)` (unit-tested).
- `lib/ai/coach-history.ts` — AsyncStorage persistence (30-msg cap, 4h idle-reset).

Backend (`supabase/functions/ai-coach/`):
- `index.ts` (Deno + Anthropic, returns `{reply}`), `helpers.ts` (pure, tested),
  `helpers_test.ts`, `deno.json`, `README.md`. Crisis-handling system prompt,
  per-user rate limit (15/60s), input caps.

## Safety (Stone's standing preference — keep this)
Text-only, no autonomous actions. The only state write is logging a slip, behind
an explicit **hold-to-confirm**. The crisis card dials only on user tap (OS-confirmed).

## Tone source of truth
`auth-store.trial.tone` — **not** "coachingStyle".

## Verified
- `npx tsc --noEmit` — clean for coach files.
- `npx jest` — 31/31 (incl. 3 new `detectCrisis` tests).
- `cd supabase/functions/ai-coach && deno test` — 9/9.
- `npx expo export --platform ios` — bundles clean (~1634 modules).

## REMAINING (optional, server-side)
Deploy the edge function to turn on the live model (from repo root):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
supabase functions deploy ai-coach
```

See `supabase/functions/ai-coach/README.md` for the full contract + options.

## Files touched outside the coach lane (intentional, agreed with Stone)
- `supabase/functions/ai-coach/*` — the Coach's backend (was an empty placeholder).
- Client `lib/ai/*` — engine/persistence/crisis stubs (per the lane's step-3 allowance).

## Deferred / not done (by design)
- Live AI is off until the deploy step above.
- No region-based helpline localization, no first-open disclaimer, no crisis
  follow-up notification — all explicitly declined for this pass.
