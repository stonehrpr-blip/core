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
  callerKey,
  createRateLimiter,
  validateImage,
  normalizeResult,
  extractJSON,
} from "./helpers.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

const MODEL = Deno.env.get("PHYSIQUE_MODEL") || "claude-sonnet-4-6";

// Abuse guard: per-user sliding window + hard image-size cap.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8; // scans per user per minute (vision is heavier than chat)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5MB decoded
const underRateLimit = createRateLimiter({ windowMs: RATE_WINDOW_MS, max: RATE_MAX });

const MUSCLE_LIST = "chest, back, shoulders, arms, legs, core";

const SYSTEM =
  "You are the Physique Scanner inside CORE, a fitness app. You look at a single full-body photo and give an encouraging, coach-style aesthetic/fitness read — like a strength coach sizing up training priorities. " +
  "You are NOT a doctor. NEVER give medical or body-composition diagnosis, never estimate body-fat percentage or weight, never comment on health conditions, and never use shaming or demoralizing language. Frame everything as training guidance. " +
  "If the image is NOT a clear, single, full human body (e.g. it's an object, a pet, an empty room, a face-only/cropped shot, or too dark to tell), set isBody=false and do not invent a rating. " +
  "Assess these six muscle groups only: " + MUSCLE_LIST + ". For each give a development level 0-100 and a status of weak, ok, or strong. " +
  "Pick the tier name from: Beginner, Developing, Athletic, Lean, Shredded, Elite. " +
  "Respond with STRICT JSON ONLY — no prose, no markdown fences — exactly this shape: " +
  '{"isBody":boolean,"rank":{"tier":string,"score":number 0-100},' +
  '"muscles":{"chest":{"level":number,"status":"weak|ok|strong"},"back":{...},"shoulders":{...},"arms":{...},"legs":{...},"core":{...}},' +
  '"weakPoints":[muscle keys to prioritize],"summary":"one or two short constructive sentences, no medical claims"}';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!underRateLimit(callerKey(req), Date.now())) {
    return json({ error: "rate_limited" }, 429);
  }

  let body: { image?: unknown; mediaType?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const img = validateImage(body.image, body.mediaType, MAX_IMAGE_BYTES);
  if (!img.ok) {
    const status = img.error === "image_too_large" ? 413 : 400;
    return json({ error: img.error }, status);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "model_unavailable" }, 503);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        temperature: 0.4,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: img.mediaType, data: img.data },
              },
              {
                type: "text",
                text: "Analyze this full-body photo and return the strict JSON. If it isn't a clear full body, set isBody=false.",
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      // Log status ONLY — never the image or response body that could echo it.
      console.error("anthropic_error", res.status);
      return json({ error: "model_error", status: res.status }, 502);
    }

    const data = await res.json();
    const text: string = (data?.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();

    const parsed = extractJSON(text);
    if (!parsed) return json({ error: "empty_reply" }, 502);

    const result = normalizeResult(parsed);
    // If the model flagged a non-body, surface that plainly (defense in depth).
    if (!result.isBody) return json({ isBody: false });

    return json(result);
  } catch (e) {
    console.error("physique_exception", String(e));
    return json({ error: "exception" }, 500);
  }
  // NOTE: `img.data` (the photo bytes) goes out of scope here and is GC'd.
  // It was never stored, written, or logged. Nothing about it persists.
});

// Re-export the muscle key type for callers that want it (no runtime cost).
export type { MuscleKey };
