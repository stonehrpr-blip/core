// physique-scan — the Physique Scanner's vision backend. POST a single body
// photo (base64), get back a structured fitness read: rank, per-muscle levels,
// weak points, and a constructive summary. Called from the mobile Coach-tab
// scanner (apps/mobile/lib/ai/physique.ts → invoke("physique-scan")).
//
// Body:  { image: base64String, mediaType?: "image/jpeg", context?: {...} }
// Reply: { isBody, rank:{tier,score}, muscles:{...}, weakPoints:[...], summary }
// Auth:  the caller's Supabase JWT (verify_jwt default).
//
// ⚠️ PRIVACY (matches the in-app consent screen + Privacy Policy):
//   - The image is processed IN MEMORY only. It is NEVER stored, never written
//     to disk, never logged, and never forwarded anywhere except the single
//     HTTPS call to our vision model. It is discarded the instant we return.
//   - No PII. The photo stays on the device; only the bytes-for-analysis transit.
// ⚠️ NO MEDICAL CLAIMS: the prompt forbids body-composition/medical diagnosis.
//   Output is fitness/aesthetic guidance only, constructive and non-shaming.
// ⚠️ Defense in depth: if the photo isn't a real full body, isBody=false comes
//   back and the app shows a retry — we never fabricate a rating.

import {
  type MuscleKey,
  type VisionProvider,
  callerKey,
  createRateLimiter,
  validateImage,
  analyzePhysique,
} from "./helpers.ts";

const ALLOWED_ORIGINS = [
  "https://stonehrpr-blip.github.io",
  "http://localhost:8000",
  "null",  // file:// previews
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.some((o) => origin && origin.startsWith(o)) ? origin! : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(obj: unknown, origin: string | null, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin) },
  });
}

// Vision provider: prefer OpenAI when its key is present (it does the "is this a
// physique or something else?" understanding + the rating), else Anthropic.
// Force one with VISION_PROVIDER=openai|anthropic.
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const PROVIDER: VisionProvider =
  (Deno.env.get("VISION_PROVIDER") as VisionProvider) || (OPENAI_KEY ? "openai" : "anthropic");
const OPENAI_MODEL = Deno.env.get("PHYSIQUE_OPENAI_MODEL") || "gpt-4o-mini";
const ANTHROPIC_MODEL = Deno.env.get("PHYSIQUE_MODEL") || "claude-sonnet-4-6";

// Abuse guard: per-user sliding window + hard image-size cap.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8; // scans per user per minute (vision is heavier than chat)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5MB decoded
const underRateLimit = createRateLimiter({ windowMs: RATE_WINDOW_MS, max: RATE_MAX });

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, origin, 405);

  if (!underRateLimit(callerKey(req), Date.now())) {
    return json({ error: "rate_limited" }, origin, 429);
  }

  let body: { image?: unknown; mediaType?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, origin, 400);
  }

  const img = validateImage(body.image, body.mediaType, MAX_IMAGE_BYTES);
  if (!img.ok) {
    const status = img.error === "image_too_large" ? 413 : 400;
    return json({ error: img.error }, origin, status);
  }

  const apiKey = PROVIDER === "openai" ? OPENAI_KEY : ANTHROPIC_KEY;
  if (!apiKey) return json({ error: "model_unavailable" }, origin, 503);
  const model = PROVIDER === "openai" ? OPENAI_MODEL : ANTHROPIC_MODEL;

  try {
    const out = await analyzePhysique({ provider: PROVIDER, apiKey, base64: img.data, mediaType: img.mediaType, model });
    if (!out.ok) {
      // Log status ONLY — never the image or any body that could echo it.
      console.error("anthropic_error", out.status ?? "");
      return json({ error: out.error, status: out.status }, origin, 502);
    }
    // If the model flagged a non-body, surface that plainly (defense in depth).
    if (!out.result.isBody) return json({ isBody: false }, origin);
    return json(out.result, origin);
  } catch (e) {
    console.error("physique_exception", String(e));
    return json({ error: "exception" }, origin, 500);
  }
  // NOTE: `img.data` (the photo bytes) goes out of scope here and is GC'd.
  // It was never stored, written, or logged. Nothing about it persists.
});

// Re-export the muscle key type for callers that want it (no runtime cost).
export type { MuscleKey };
