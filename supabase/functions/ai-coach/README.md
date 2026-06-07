# ai-coach edge function

Powers the mobile Coach tab (`apps/mobile/app/(tabs)/coach.tsx` →
`lib/ai/coach.ts`). Takes a short conversation + tone, returns one supportive
reply. **Text only — takes no actions** (see the safety note at the top of
`index.ts`).

## Deploy

```bash
# from repo root (~/Desktop/lifeos)

# 1. Set the model key (required) — paste your Anthropic key
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# 2. (optional) pin the model — defaults to claude-sonnet-4-6 if omitted
supabase secrets set COACH_MODEL=claude-sonnet-4-6

# 3. Deploy the function
supabase functions deploy ai-coach

# 4. (optional) sanity-check it's live
supabase functions list
```

Until steps 1+3 run, the app stays on its canned fallback — no crash, just
generic replies. The client-side crisis card and input handling work regardless.

## Test

```bash
cd supabase/functions/ai-coach && deno test   # 9 unit tests for the pure helpers
```

## Contract

- **Request** `POST`
  `{ tone, messages: [{role:"user"|"assistant", content}], context }`
  where `context = { name?, lifeScore?, streakDays?, recoverableSlip?, stats?:{lungs,brain,wallet,willpower,body} }`.
  Context is a live game-state snapshot sent by the client so replies can speak
  to the user's actual numbers; all fields optional.
- **Response** `{ reply: string }` on success; any non-2xx makes the client fall
  back to its built-in tone-aware canned replies, so the tab never hangs or
  crashes. Non-2xx cases: `503 model_unavailable` (no `ANTHROPIC_API_KEY`),
  `429 rate_limited`, `413 payload_too_large`, `502 model_error`.
- **Abuse guard** soft per-user sliding window (15 req / 60s, keyed off the JWT
  `sub`) + hard input caps (2k chars/msg, 8k total, last 12 msgs). In-memory, so
  a cold start resets it — fine for a soft guard.
- **Auth** the caller's Supabase JWT (default `verify_jwt`); no service role needed.
