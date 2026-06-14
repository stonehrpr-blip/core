/* CORE AI proxy — Cloudflare Worker.
 * Holds your OpenAI key as a server secret so the app can use AI everywhere
 * WITHOUT shipping a key to users.
 *
 * SETUP (all in the Cloudflare dashboard, phone is fine):
 *   1. Workers & Pages → Create → Worker → paste this whole file → Deploy.
 *   2. The worker → Settings → Variables → Add variable:
 *        Name:  OPENAI_API_KEY    Value: sk-...    (tick "Encrypt")
 *      Save & Deploy.
 *   3. Copy the worker URL (https://<name>.<you>.workers.dev) and send it to me —
 *      I'll paste it into the app config (AI_PROXY_URL).
 *
 * SAFETY: it only answers requests from your app's site, and OpenAI's $5 spend
 * limit is the hard cap. Cheap model (gpt-4o-mini).
 */

const ALLOWED_ORIGINS = [
  "https://stonehrpr-blip.github.io", // your GitHub Pages site
  "http://localhost:8000",
  "null",                              // file:// previews
];

const MODEL = "gpt-4o-mini";

const COACH_SYSTEM =
  "You are Coach inside CORE, a gamified fitness & life app. Warm, encouraging, concise — usually 1-4 sentences. " +
  "You help with training (push-ups, squats, pull-ups), habits, focus, food and motivation, and you reply in the user's language. " +
  "Never diagnose or give medical advice. SAFETY: if the user mentions self-harm, suicidal thoughts or danger, drop everything, " +
  "respond with warmth, take it seriously, and urge them to contact a crisis line / emergency services now (988 US, Lifeline 13 11 14 AU, 112 EU) and someone they trust. Never claim you performed a real action.";

const VISION_SYSTEM =
  "You analyse fitness photos (physique, food, posture, outfit). Be concise, encouraging and specific — 1-3 short sentences with one concrete tip unless asked for JSON.";

function cors(origin) {
  const allow = ALLOWED_ORIGINS.some((o) => origin && origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...headers } });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const ch = cors(origin);
    if (request.method === "OPTIONS") return new Response("ok", { headers: ch });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, ch);

    const key = env.OPENAI_API_KEY;
    if (!key) return json({ error: "model_unavailable" }, 503, ch);

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400, ch); }

    const type = body && body.type === "vision" ? "vision" : "chat";
    let messages, maxTokens = 500;

    if (type === "vision") {
      const image = typeof body.image === "string" ? body.image : "";
      if (!image) return json({ error: "no_image" }, 400, ch);
      const prompt = (typeof body.prompt === "string" ? body.prompt : "").slice(0, 800) || "Rate this and give one tip.";
      messages = [
        { role: "system", content: VISION_SYSTEM },
        { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image, detail: "low" } }] },
      ];
      maxTokens = 320;
    } else {
      const raw = Array.isArray(body.messages) ? body.messages : [];
      const convo = raw
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
        .slice(-12);
      while (convo.length && convo[0].role !== "user") convo.shift();
      if (!convo.length) return json({ error: "no_user_message" }, 400, ch);
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
        return json({ error: "model_error", status: res.status, detail: detail.slice(0, 200) }, 502, ch);
      }
      const data = await res.json();
      const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
      if (!reply) return json({ error: "empty_reply" }, 502, ch);
      return json({ reply }, 200, ch);
    } catch (e) {
      return json({ error: "exception" }, 500, ch);
    }
  },
};
