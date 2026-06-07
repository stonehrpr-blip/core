// ai-coach — the Coach chat engine. POST a short conversation, get one
// supportive reply back. Called from the mobile Coach tab
// (apps/mobile/lib/ai/coach.ts → supabase.functions.invoke("ai-coach")).
//
// Body:  { tone: "gentle"|"balanced"|"direct"|"drill", messages: [{role,content}] }
// Reply: { reply: string }
// Auth:  the caller's Supabase JWT (verify_jwt default). No service role needed.
//
// SAFETY (Stone's standing preference): the Coach is confirmation-gated and
// takes NO autonomous actions. This function returns TEXT ONLY — the system
// prompt forbids the model from claiming to send, pay, delete, schedule, or
// control anything. Any real action must round-trip through an explicit tap in
// the app. If the model is unavailable, we return an error so the client falls
// back to its built-in canned replies (the tab can never hang or crash).

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
  "You are Coach inside CORE, a gamified life-OS whose flagship mission is helping people quit vaping/nicotine and rebuild healthy habits. " +
  "You speak with the user in short, warm, human messages — usually 1-3 sentences, occasionally a little more when they're struggling. " +
  "You are a supportive companion, not a clinician: never diagnose and never give medical advice. " +
  "You know the user is working on quitting and may face cravings; cravings peak around three minutes then fade — remind them of that when relevant. " +
  "SAFETY — CRISIS: if the user expresses any intent to harm themselves, suicidal thoughts, or that they're in danger or a mental-health emergency, drop everything else. Respond with warmth and take it completely seriously — never minimize, never lecture, never use the drill/tough tone. In plain words, urge them to reach out for immediate human help right now: contact a crisis line or emergency services — e.g. Lifeline 13 11 14 (Australia), or 988 (US), or their local emergency number (000 in Australia, 911 in the US, 112 in much of Europe) — and to tell someone they trust. Make clear you're glad they told you and they're not alone. Do not attempt to be their therapist or talk them through it clinically. " +
  "CRITICAL: you take NO actions. You cannot send messages, make payments, delete data, schedule reminders, contact anyone, or control the app or any device. " +
  "Never claim to have done any of those things (including that you've alerted anyone or called for help on their behalf). If the user wants something done, tell them which button or screen to tap — the app only ever acts on an explicit tap from them. " +
  "Stay on the user's wellbeing, habits, and motivation. Do not produce code, essays, or off-topic content.";

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
        max_tokens: 400,
        temperature: 0.7,
        // Cache the (stable) base prompt so repeat turns are cheap/fast; tone
        // and the per-user context note follow uncached.
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
    const reply: string = (data?.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();

    if (!reply) return json({ error: "empty_reply" }, 502);
    return json({ reply });
  } catch (e) {
    console.error("coach_exception", String(e));
    return json({ error: "exception" }, 500);
  }
});
