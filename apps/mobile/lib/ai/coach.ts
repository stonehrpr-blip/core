/**
 * Coach reply engine (stub).
 *
 * The real model call (Supabase edge fn / Anthropic) isn't wired yet, so this
 * renders canned, tone-aware supportive responses. It is intentionally a pure
 * text generator:
 *
 *   SAFETY (Stone's standing preference): the Coach is confirmation-gated and
 *   takes NO autonomous actions. It only ever returns *text* — it never sends,
 *   pays, deletes, schedules, or controls anything on the user's behalf. Any
 *   future "action card" must round-trip through an explicit user tap.
 *
 * When the backend lands, replace `getCoachReply` with the network call and
 * keep this file's signature + the canned set as the offline fallback so the
 * Coach tab can never crash or hang.
 */
import { supabase } from "@/lib/supabase";
import type { CoachTone } from "@/stores/auth-store";

export type ChatRole = "coach" | "user";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
};

const TONE_FALLBACK: CoachTone = "balanced";

function partOfDay(hour: number): "Morning" | "Afternoon" | "Evening" {
  return hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
}

/** First message shown when the tab opens. Tone + name aware. */
export function openingLine(tone: CoachTone | null, name: string, hour: number): string {
  const t = tone ?? TONE_FALLBACK;
  const greet = name.trim() ? `, ${name.trim()}` : "";
  const part = partOfDay(hour);
  switch (t) {
    case "gentle":
      return `${part}${greet}. I'm glad you're here. No pressure today — what's on your mind?`;
    case "direct":
      return `${part}${greet}. Straight up: what do you want to work on right now?`;
    case "drill":
      return `Phone down${greet}. You showed up — good. What's the play today?`;
    case "balanced":
    default:
      return `${part}${greet}. Good to see you. What's on your mind today?`;
  }
}

/** The status line under the Coach name in the header. */
export function statusLine(tone: CoachTone | null): string {
  return tone ? `Online · ${tone} mode` : "Online · knows your history";
}

/** Suggestion chips above the composer. */
export const SUGGESTIONS: string[] = [
  "How am I doing this week?",
  "I'm about to slip",
  "Why is my Brain stat dropping?",
  "Help me reframe a craving",
  "What should I focus on today?",
];

/**
 * Pick a canned reply. Keyword-routed first (so "slip"/"craving"/"how am i
 * doing" feel responsive), otherwise a tone-flavoured generic. Deterministic
 * given (text, tone, turn) so there's no Math.random — varied by turn count.
 */
export function cannedReply(userText: string, tone: CoachTone | null, turn: number): string {
  const t = tone ?? TONE_FALLBACK;
  const text = userText.toLowerCase();

  const wantsCraving = /slip|crav|urge|smoke|vape|puff|relapse|tempt/.test(text);
  const wantsProgress = /how am i|doing|progress|week|stat|score/.test(text);
  const wantsHelp = /help|reframe|advice|what should|focus|tip/.test(text);

  if (wantsCraving) {
    return pick(t, {
      gentle:
        "That feeling is real, and it will pass — they always crest around three minutes and fade. You don't have to decide anything right now. Want to breathe through it together?",
      balanced:
        "Cravings peak near the three-minute mark then crash. Nothing to decide right now — let's just ride it out. Tap the SOS button up top and I'll time it with you.",
      direct:
        "It peaks in about three minutes, then it's gone. Don't negotiate with it. Hit SOS and breathe — I'll hold the line with you.",
      drill:
        "180 seconds. That's the whole fight. Hit SOS, breathe, and don't move. You've held longer than this. Go.",
    });
  }

  if (wantsProgress) {
    return pick(t, {
      gentle:
        "From where I sit you're trending up — your streak is holding and you keep showing up, which is the part that compounds. What feels hardest right now?",
      balanced:
        "Net positive this week — Willpower and your streak are carrying it. Sleep is the soft spot. Want to dig into one of those?",
      direct:
        "Streak's holding, Willpower's up, sleep is dragging it down. Fix the sleep and the rest follows. What's getting in the way at night?",
      drill:
        "Streak's intact, that's the floor not the goal. Sleep is sloppy. Tighten the wind-down tonight and report back. What time are you in bed?",
    });
  }

  if (wantsHelp) {
    return pick(t, {
      gentle:
        "Let's keep it small. What's one kind thing you could do for yourself in the next ten minutes? We'll start there.",
      balanced:
        "Pick one lever, not five. What's the single thing that, if it went right today, would make the day feel like a win?",
      direct:
        "One thing. Name the most important move for today and commit to it out loud. I'll hold you to it.",
      drill:
        "No buffet. One target, lock it in now. Say it. Then go do the first rep in the next ten minutes.",
    });
  }

  // Generic reflective replies, varied by turn so it doesn't repeat verbatim.
  const generic: Record<CoachTone, string[]> = {
    gentle: [
      "I hear you. Take a breath — what's underneath that?",
      "Thank you for telling me. What would feel like a small win right now?",
      "That makes sense. You're doing better than you think. What's next on your mind?",
    ],
    balanced: [
      "Got it. What's one step you could take on that in the next ten minutes?",
      "Makes sense. Want to break that down or just talk it through?",
      "Noted. Where do you want to point your energy first?",
    ],
    direct: [
      "Alright. What's the next concrete step — name it.",
      "Fair. So what are you actually going to do about it today?",
      "Understood. Pick the move and commit. What is it?",
    ],
    drill: [
      "Copy that. Next action — say it and own it.",
      "Enough thinking. What's the rep you do right now?",
      "Heard. Decision, not discussion. What's the play?",
    ],
  };
  const bucket = generic[t];
  return bucket[turn % bucket.length] ?? bucket[0]!;
}

function pick(tone: CoachTone, m: Record<CoachTone, string>): string {
  return m[tone] ?? m[TONE_FALLBACK];
}

// Crisis detection lives in its own pure module (no Supabase/RN deps) so it's
// unit-testable; re-exported here so callers keep a single import surface.
export { detectCrisis } from "./coach-crisis";

/** Name of the Supabase edge function that wraps the model call. */
const COACH_FUNCTION = "ai-coach";

/** Shape we send to / expect from the edge function. */
type CoachFnResponse = { reply?: string };

/**
 * Live snapshot of the player's game-state, passed so the Coach can speak to
 * the user's actual numbers. Built by the screen from the game-state store.
 */
export type CoachContext = {
  name?: string;
  lifeScore?: number;
  streakDays?: number;
  recoverableSlip?: boolean;
  stats?: { lungs: number; brain: number; wallet: number; willpower: number; body: number };
};

/**
 * Result of a Coach turn. `reply` carries the text to show (live model reply or
 * canned fallback). `rate_limited` means the user is sending too fast — the
 * screen shows a tiny "catching up" note instead of a coach bubble.
 */
export type CoachReplyResult =
  | { kind: "reply"; text: string }
  | { kind: "rate_limited" };

/**
 * Public entry point. Tries the Supabase `ai-coach` edge function first; if it's
 * not deployed yet, errors, or times out, it falls back to the tone-aware
 * canned set so the tab can never hang or crash. A 429 surfaces as
 * `rate_limited` so the UI can tell the user to slow down.
 *
 * SAFETY: the edge function returns text only — this client never executes any
 * action it might suggest. The contract is reply-string-in, reply-string-out.
 */
export async function getCoachReply(
  history: ChatMessage[],
  tone: CoachTone | null,
  context?: CoachContext,
): Promise<CoachReplyResult> {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const turn = history.filter((m) => m.role === "user").length;
  const fallback = (): CoachReplyResult => ({
    kind: "reply",
    text: cannedReply(lastUser?.text ?? "", tone, turn),
  });

  try {
    const result = await withTimeout(
      supabase.functions.invoke<CoachFnResponse>(COACH_FUNCTION, {
        body: {
          tone: tone ?? TONE_FALLBACK,
          context: context ?? {},
          messages: history.slice(-12).map((m) => ({
            role: m.role === "coach" ? "assistant" : "user",
            content: m.text,
          })),
        },
      }),
      8000,
    );
    if (result.error) {
      // supabase-js puts the HTTP Response on error.context for FunctionsHttpError.
      const status = (result.error as { context?: { status?: number } }).context?.status;
      if (status === 429) return { kind: "rate_limited" };
      return fallback();
    }
    const reply = result.data?.reply?.trim();
    return reply && reply.length > 0 ? { kind: "reply", text: reply } : fallback();
  } catch {
    return fallback();
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("coach timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
