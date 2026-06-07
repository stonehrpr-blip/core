// Pure helpers for the physique-scan function, split out so they can be
// unit-tested without booting Deno.serve. No side effects, no globals.
//
// PRIVACY: nothing here logs, persists, or forwards the image. The base64 is
// validated for size/shape only; the bytes never leave this process except in
// the single HTTPS call to the vision model, and are discarded on return.

export const MUSCLE_KEYS = ["chest", "back", "shoulders", "arms", "legs", "core"] as const;
export type MuscleKey = (typeof MUSCLE_KEYS)[number];
export type MuscleStatus = "weak" | "ok" | "strong";

export type Muscle = { level: number; status: MuscleStatus };
export type ScanResult = {
  isBody: boolean;
  rank: { tier: string; score: number };
  muscles: Record<MuscleKey, Muscle>;
  weakPoints: MuscleKey[];
  summary: string;
};

/** Identify the caller from the (platform-verified) JWT `sub`, else fall back to IP. */
export function callerKey(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.sub) return `u:${payload.sub}`;
    } catch {
      /* fall through */
    }
  }
  return `ip:${req.headers.get("x-forwarded-for") || "unknown"}`;
}

/** Sliding-window rate limiter. `now` injected so it's deterministic + testable. */
export function createRateLimiter(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();
  return function underRateLimit(key: string, now: number): boolean {
    const recent = (hits.get(key) || []).filter((t) => now - t < opts.windowMs);
    if (recent.length >= opts.max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Validate the incoming image: media type allow-list + decoded-size cap. */
export function validateImage(
  imageRaw: unknown,
  mediaRaw: unknown,
  maxBytes: number,
): { ok: true; data: string; mediaType: string } | { ok: false; error: string } {
  if (typeof imageRaw !== "string" || imageRaw.length === 0) {
    return { ok: false, error: "no_image" };
  }
  // Accept either a bare base64 string or a data URI; strip the prefix if present.
  let data = imageRaw;
  let mediaType = typeof mediaRaw === "string" ? mediaRaw : "image/jpeg";
  const m = data.match(/^data:(image\/[a-z+]+);base64,(.*)$/i);
  if (m) {
    mediaType = m[1].toLowerCase();
    data = m[2];
  }
  if (!ALLOWED_MEDIA.has(mediaType)) return { ok: false, error: "bad_media_type" };
  if (!/^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 256))) return { ok: false, error: "not_base64" };
  // base64 decodes to ~3/4 of its length
  const approxBytes = Math.floor((data.length * 3) / 4);
  if (approxBytes > maxBytes) return { ok: false, error: "image_too_large" };
  return { ok: true, data: data.replace(/\s+/g, ""), mediaType };
}

const clamp = (v: unknown, lo = 0, hi = 100): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.max(lo, Math.min(hi, Math.round(n)));
};

function statusFor(level: number, raw: unknown): MuscleStatus {
  if (raw === "weak" || raw === "ok" || raw === "strong") return raw;
  return level < 45 ? "weak" : level < 72 ? "ok" : "strong";
}

/**
 * Coerce the model's free-form JSON into our strict contract. Defensive: missing
 * fields get sane defaults, scores are clamped, statuses derived from levels,
 * weakPoints fall back to the muscles marked weak. Never throws.
 */
export function normalizeResult(raw: unknown): ScanResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const isBody = r.isBody === true;

  const rankIn = (r.rank && typeof r.rank === "object" ? r.rank : {}) as Record<string, unknown>;
  const score = clamp(rankIn.score);
  const tier = typeof rankIn.tier === "string" && rankIn.tier.trim() ? rankIn.tier.trim().slice(0, 24) : "Developing";

  const musclesIn = (r.muscles && typeof r.muscles === "object" ? r.muscles : {}) as Record<string, unknown>;
  const muscles = {} as Record<MuscleKey, Muscle>;
  for (const k of MUSCLE_KEYS) {
    const mIn = (musclesIn[k] && typeof musclesIn[k] === "object" ? musclesIn[k] : {}) as Record<string, unknown>;
    const level = clamp(mIn.level);
    muscles[k] = { level, status: statusFor(level, mIn.status) };
  }

  let weakPoints: MuscleKey[] = Array.isArray(r.weakPoints)
    ? (r.weakPoints.filter((w) => (MUSCLE_KEYS as readonly string[]).includes(w as string)) as MuscleKey[])
    : [];
  if (weakPoints.length === 0) {
    weakPoints = MUSCLE_KEYS.filter((k) => muscles[k].status === "weak");
  }
  weakPoints = Array.from(new Set(weakPoints)).slice(0, 4);

  const summary =
    typeof r.summary === "string" && r.summary.trim()
      ? r.summary.trim().slice(0, 400)
      : "Keep training consistently — progress compounds.";

  return { isBody, rank: { tier, score }, muscles, weakPoints, summary };
}

export const MUSCLE_LIST = "chest, back, shoulders, arms, legs, core";

export const SYSTEM =
  "You are the Physique Scanner inside CORE, a fitness app. You look at a single full-body photo and give an encouraging, coach-style aesthetic/fitness read — like a strength coach sizing up training priorities. " +
  "You are NOT a doctor. NEVER give medical or body-composition diagnosis, never estimate body-fat percentage or weight, never comment on health conditions, and never use shaming or demoralizing language. Frame everything as training guidance. " +
  "If the image is NOT a clear, single, full human body (e.g. it's an object, a pet, an empty room, a face-only/cropped shot, or too dark to tell), set isBody=false and do not invent a rating. " +
  "Assess these six muscle groups only: " + MUSCLE_LIST + ". For each give a development level 0-100 and a status of weak, ok, or strong. " +
  "Pick the tier name from: Beginner, Developing, Athletic, Lean, Shredded, Elite. " +
  "Respond with STRICT JSON ONLY — no prose, no markdown fences — exactly this shape: " +
  '{"isBody":boolean,"rank":{"tier":string,"score":number 0-100},' +
  '"muscles":{"chest":{"level":number,"status":"weak|ok|strong"},"back":{...},"shoulders":{...},"arms":{...},"legs":{...},"core":{...}},' +
  '"weakPoints":[muscle keys to prioritize],"summary":"one or two short constructive sentences, no medical claims"}';

export type VisionProvider = "openai" | "anthropic";
const USER_INSTRUCTION =
  "Look at this photo. FIRST decide if it actually shows a real human body/physique to assess — if it's anything else (an object, a pet, food, a screenshot, a face-only/cropped shot, or an empty/too-dark frame) set isBody=false and don't invent a rating. If it IS a clear body, analyze it and return the strict JSON.";

/** OpenAI vision (gpt-4o family). Returns raw JSON text. */
async function callOpenAI(f: typeof fetch, apiKey: string, model: string, base64: string, mediaType: string) {
  const res = await f("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: USER_INSTRUCTION },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return { ok: false as const, status: res.status };
  const data = await res.json();
  return { ok: true as const, text: String(data?.choices?.[0]?.message?.content ?? "").trim() };
}

/** Anthropic Claude vision. Returns raw JSON text. */
async function callAnthropic(f: typeof fetch, apiKey: string, model: string, base64: string, mediaType: string) {
  const res = await f("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: 700, temperature: 0.4,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: USER_INSTRUCTION },
        ],
      }],
    }),
  });
  if (!res.ok) return { ok: false as const, status: res.status };
  const data = await res.json();
  const text: string = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
  return { ok: true as const, text };
}

/**
 * Single source of truth for the vision call — used by index.ts AND the
 * integration test, so they can never drift. The model FIRST decides whether the
 * photo is a real physique (isBody) and only then rates it; a non-body comes back
 * isBody=false. `provider` picks OpenAI vs Anthropic. `fetchImpl` is injectable
 * for tests. Never logs the image.
 */
export async function analyzePhysique(args: {
  provider: VisionProvider;
  apiKey: string;
  base64: string;
  mediaType: string;
  model: string;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; result: ScanResult }
  | { ok: false; error: string; status?: number }
> {
  const f = args.fetchImpl ?? fetch;
  const call = args.provider === "openai"
    ? await callOpenAI(f, args.apiKey, args.model, args.base64, args.mediaType)
    : await callAnthropic(f, args.apiKey, args.model, args.base64, args.mediaType);

  if (!call.ok) return { ok: false, error: "model_error", status: call.status };
  const parsed = extractJSON(call.text);
  if (!parsed) return { ok: false, error: "empty_reply" };
  return { ok: true, result: normalizeResult(parsed) };
}

/** Pull the first balanced JSON object out of a model response (handles ```json fences). */
export function extractJSON(text: string): unknown {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
