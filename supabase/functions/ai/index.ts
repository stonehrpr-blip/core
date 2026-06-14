// ai — single OpenAI proxy for CORE. Holds the OpenAI key as a server secret so
// the mobile/web app can use AI everywhere WITHOUT shipping a key to users.
//
// POST body:
//   { type:"chat",   messages:[{role,content}], context?:{...}, tone? }   -> { reply }
//   { type:"vision", image:"data:image/...;base64,...", prompt:"..." }     -> { reply }
//
// Set the secret in the Supabase dashboard:  OPENAI_API_KEY = sk-...
// (Optional)  OPENAI_MODEL = gpt-4o-mini   (default)
//
// Deploy with "Verify JWT" OFF so the app's anon key can reach it.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });
}

const MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

const COACH_SYSTEM =
  "You are Coach inside CORE, a gamified fitness & life app. You are warm, encouraging, and concise — usually 1-4 sentences unless the user clearly needs more. " +
  "You help with training, push-ups/squats/pull-ups, habits, focus, food, and motivation, and you reply in whatever language the user writes in. " +
  "Never diagnose or give medical advice. SAFETY: if the user mentions self-harm, suicidal thoughts, or being in danger, drop everything else, respond with warmth, take it seriously, and urge them to contact a crisis line or emergency services right now (e.g. 988 in the US, Lifeline 13 11 14 in Australia, 112 in much of Europe) and someone they trust. Never claim you performed any real-world action.";

const VISION_SYSTEM =
  "You analyse fitness photos (physique, food, posture, outfit). Be concise, encouraging and specific. " +
  "Unless asked for JSON, reply in 1-3 short sentences with one concrete tip.";

// ── tiny per-IP rate limit (soft; resets on cold start) + input caps ──
const RATE: Record<string, number[]> = {};
const RATE_MAX = 20, RATE_WIN = 60_000;
function rateOK(ip: string): boolean {
  const now = Date.now(); const a = (RATE[ip] || []).filter((t) => now - t < RATE_WIN);
  a.push(now); RATE[ip] = a; return a.length <= RATE_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for") || "anon";
  if (!rateOK(ip)) return json({ error: "rate_limited" }, 429);

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "model_unavailable" }, 503); // not configured → client uses fallback

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const type = body?.type === "vision" ? "vision" : "chat";
  let messages: any[];
  let maxTokens = 500;

  if (type === "vision") {
    const image = typeof body.image === "string" ? body.image : "";
    if (!image) return json({ error: "no_image" }, 400);
    const prompt = (typeof body.prompt === "string" ? body.prompt : "").slice(0, 800) || "Rate and give one tip on this photo.";
    messages = [
      { role: "system", content: VISION_SYSTEM },
      { role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: image, detail: "low" } },
      ] },
    ];
    maxTokens = 320;
  } else {
    const raw = Array.isArray(body.messages) ? body.messages : [];
    const convo = raw
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      .slice(-12);
    while (convo.length && convo[0].role !== "user") convo.shift();
    if (!convo.length) return json({ error: "no_user_message" }, 400);
    const ctx = body.context ? ("\n\nUser context (use it, don't read it aloud): " + JSON.stringify(body.context).slice(0, 600)) : "";
    messages = [{ role: "system", content: COACH_SYSTEM + ctx }, ...convo];
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + key },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0.6 }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("openai_error", res.status, detail.slice(0, 300));
      return json({ error: "model_error", status: res.status }, 502);
    }
    const data = await res.json();
    const reply = (data?.choices?.[0]?.message?.content || "").trim();
    if (!reply) return json({ error: "empty_reply" }, 502);
    return json({ reply });
  } catch (e) {
    console.error("ai_exception", String(e));
    return json({ error: "exception" }, 500);
  }
});
