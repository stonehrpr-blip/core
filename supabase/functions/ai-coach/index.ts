// ai-coach — the Coach chat engine. POST a short conversation, get one
// supportive reply back. Called from the mobile Coach tab
// (apps/mobile/lib/ai/coach.ts → supabase.functions.invoke("ai-coach")).
//
// Body:  { tone: "gentle"|"balanced"|"direct"|"drill", messages: [{role,content}] }
// Reply: { reply: string, actions: [{ id, name, input }] }
// Auth:  the caller's Supabase JWT (verify_jwt default). No service role needed.
//
// SAFETY (Stone's standing preference): the Coach stays confirmation-gated. It
// may PROPOSE in-app actions via tools (returned as `actions`), but it never
// performs them — the client renders each proposal as a confirm chip and acts
// only on an explicit tap. The system prompt forbids the model from claiming it
// has done, sent, paid, deleted, scheduled, or controlled anything. If the
// model is unavailable we return an error so the client falls back to its
// built-in canned replies (the tab can never hang or crash).

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

import {
  type Tone,
  type Msg,
  toneOf,
  parseCtx,
  contextSystem,
  callerKey,
  createRateLimiter,
} from "./helpers.ts";

const COACH_MODEL = Deno.env.get("COACH_MODEL") || "claude-sonnet-4-6";

const BASE_SYSTEM =
  "You are Coach inside CORE, a gamified life-OS. You are a genuinely capable, general-purpose AI assistant in the spirit of Claude: you can help with anything the user asks — questions, ideas, writing, explanations, plans, code, any topic — and you understand and reply fluently in whatever language the user writes in. " +
  "Your home turf is the user's habits, body, focus, money, and motivation, and you keep a warm, human voice — usually short (1-4 sentences) unless the task genuinely needs more. " +
  "You are a supportive companion, not a clinician: never diagnose and never give medical advice. The user may be quitting a habit and face cravings; cravings usually peak around three minutes then fade — mention that when relevant. " +
  "SAFETY — CRISIS: if the user expresses any intent to harm themselves, suicidal thoughts, or that they're in danger or a mental-health emergency, drop everything else. Respond with warmth and take it completely seriously — never minimize, never lecture, never use the drill/tough tone. Urge them to reach out for immediate human help right now: a crisis line or emergency services — e.g. Lifeline 13 11 14 (Australia) or 988 (US), or their local emergency number (000 in Australia, 911 in the US, 112 in much of Europe) — and to tell someone they trust. Make clear you're glad they told you and they're not alone. Do not act as their clinical therapist. " +
  "ACTIONS: you can PROPOSE in-app actions using the provided tools (open a screen, log a slip, start a focus session, add a habit, set a reminder). You NEVER perform actions yourself — using a tool only surfaces a button the user must tap to confirm. Never claim you have done, sent, paid, deleted, scheduled, or controlled anything; only the user's explicit tap makes an action happen. Use a tool only when the user clearly wants that thing done, and still reply in words alongside it.";

// App actions the Coach may PROPOSE. The client renders each tool_use as a
// confirm chip; nothing happens until the user taps it — this keeps the
// confirmation-gating guarantee while enabling agentic suggestions.
const TOOLS = [
  {
    name: "open_screen",
    description: "Propose opening a screen in the app. The user must tap to confirm before navigation happens.",
    input_schema: {
      type: "object",
      properties: {
        screen: {
          type: "string",
          enum: ["dashboard", "quests", "shop", "ranks", "profile", "coach", "focus", "settings"],
          description: "Which screen to open",
        },
      },
      required: ["screen"],
    },
  },
  {
    name: "log_slip",
    description: "Propose logging a slip for one of the user's habits (records the incident and updates stats). Confirmation-gated.",
    input_schema: {
      type: "object",
      properties: { habit: { type: "string", description: "The habit they slipped on, e.g. vape, scroll, spend" } },
      required: ["habit"],
    },
  },
  {
    name: "start_focus_session",
    description: "Propose starting a focus / box-breathing session for N minutes. Confirmation-gated.",
    input_schema: {
      type: "object",
      properties: { minutes: { type: "integer", description: "Length in minutes (1-60)" } },
      required: ["minutes"],
    },
  },
  {
    name: "add_habit",
    description: "Propose adding a new habit for the user to track. Confirmation-gated.",
    input_schema: {
      type: "object",
      properties: { habit: { type: "string", description: "Habit to add" } },
      required: ["habit"],
    },
  },
  {
    name: "set_checkin_reminder",
    description: "Propose setting a daily check-in reminder at a given local time. Confirmation-gated.",
    input_schema: {
      type: "object",
      properties: { time: { type: "string", description: "Local 24h time like '21:00'" } },
      required: ["time"],
    },
  },
];

const TONE_SYSTEM: Record<Tone, string> = {
  gentle:
    "TONE: gentle. Be soft, validating, and patient. Lead with empathy, never pressure. Celebrate small wins. It's okay to just sit with them.",
  balanced:
    "TONE: balanced. Be warm but practical. Acknowledge the feeling, then offer one concrete, doable next step. Encouraging without being soft.",
  direct:
    "TONE: direct. Be concise and honest. Skip the cushioning, name the truth kindly, and push for one clear commitment. Respectful, never harsh.",
  drill:
    "TONE: drill sergeant (the user opted into this). Be punchy, high-energy, and demanding but never cruel or demeaning. Short commands, accountability, belief in them. No insults. (The crisis-safety rule overrides this tone entirely.)",
};

// ── Abuse guard ─────────────────────────────────────────────────────────────
// Lightweight per-user sliding window (state survives warm invocations; a cold
// start resets it — fine for a soft guard) plus hard input caps.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 15; // requests per user per window
const MAX_MSG_CHARS = 2000; // per message
const MAX_TOTAL_CHARS = 8000; // whole conversation
const underRateLimit = createRateLimiter({ windowMs: RATE_WINDOW_MS, max: RATE_MAX });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Soft abuse guard — per-user sliding window. On limit the client falls back
  // to its canned replies, so the user still gets a (generic) response.
  if (!underRateLimit(callerKey(req), Date.now())) {
    return json({ error: "rate_limited" }, 429);
  }

  let body: { tone?: unknown; messages?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const tone = toneOf(body.tone);
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: Msg[] = raw
    .filter(
      (m): m is Msg =>
        !!m &&
        typeof m === "object" &&
        ((m as Msg).role === "user" || (m as Msg).role === "assistant") &&
        typeof (m as Msg).content === "string" &&
        (m as Msg).content.trim().length > 0,
    )
    // Hard input caps so one request can't be oversized.
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }))
    .slice(-12);

  // The Messages API requires the conversation to start with a user turn.
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();
  if (messages.length === 0) return json({ error: "no_user_message" }, 400);

  const totalChars = messages.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return json({ error: "payload_too_large" }, 413);
  }

  const ctxNote = contextSystem(parseCtx(body.context));

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    // Not configured yet → let the client use its canned fallback.
    return json({ error: "model_unavailable" }, 503);
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: COACH_MODEL,
        // Higher ceiling now that the Coach is a general assistant; no
        // `temperature` so the same call works on every model (Opus 4.7/4.8
        // reject sampling params — steer via prompt instead).
        max_tokens: 1024,
        tools: TOOLS,
        // Cache the (stable) base prompt + tools so repeat turns are cheap/fast;
        // tone and the per-user context note follow uncached.
        system: [
          { type: "text", text: BASE_SYSTEM, cache_control: { type: "ephemeral" } },
          { type: "text", text: TONE_SYSTEM[tone] },
          ...(ctxNote ? [{ type: "text", text: ctxNote }] : []),
        ],
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("anthropic_error", res.status, detail.slice(0, 500));
      return json({ error: "model_error", status: res.status }, 502);
    }

    const data = await res.json();
    const content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }> =
      Array.isArray(data?.content) ? data.content : [];
    const reply: string = content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    // Proposed app actions — the client renders each as a confirm chip and
    // executes only on an explicit tap. Never performed server-side.
    const actions = content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input ?? {} }));

    if (!reply && actions.length === 0) return json({ error: "empty_reply" }, 502);
    return json({ reply, actions });
  } catch (e) {
    console.error("coach_exception", String(e));
    return json({ error: "exception" }, 500);
  }
});
