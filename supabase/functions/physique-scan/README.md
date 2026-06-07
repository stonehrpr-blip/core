# physique-scan

Vision backend for CORE's Physique Scanner (Coach tab). Takes one full-body
photo, returns a structured fitness read. Mirrors the `ai-coach` function shape.

## Privacy (hard rule)
The image is processed **in memory only**. It is never stored, written to disk,
logged, or forwarded anywhere except the single HTTPS call to the vision model,
and is discarded the instant the function returns. No PII. 18+.

## Contract
**Request** `POST` (Supabase JWT auth, default `verify_jwt`):
```json
{ "image": "<base64 or data URI>", "mediaType": "image/jpeg", "context": {} }
```
**Response** (200):
```json
{
  "isBody": true,
  "rank": { "tier": "Athletic", "score": 0-100 },
  "muscles": {
    "chest":   { "level": 0-100, "status": "weak|ok|strong" },
    "back":    { "level": 0-100, "status": "weak|ok|strong" },
    "shoulders": { "...": "" }, "arms": { "...": "" },
    "legs":    { "...": "" }, "core": { "...": "" }
  },
  "weakPoints": ["back", "legs"],
  "summary": "short constructive note (no medical claims)"
}
```
If the photo isn't a clear full body → `{ "isBody": false }` (the app shows a retry).

Errors: `400 bad_json|no_image|bad_media_type|not_base64`, `413 image_too_large`,
`429 rate_limited`, `503 model_unavailable` (no API key), `502 model_error|empty_reply`.

## Guards
- Per-user sliding window: 8 scans / 60s.
- Decoded-image cap: ~5 MB; media allow-list: jpeg / png / webp.
- No medical/body-composition claims, no shaming (enforced in the system prompt).

## Deploy (manual — Stone)
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional model override (defaults to claude-sonnet-4-6):
supabase secrets set PHYSIQUE_MODEL=claude-sonnet-4-6
supabase functions deploy physique-scan
```

## Test
```bash
deno test supabase/functions/physique-scan/helpers_test.ts
```
