// Pure helpers for the ai-coach function, split out from index.ts so they can
// be unit-tested without booting Deno.serve. No side effects, no globals.

export type Tone = "gentle" | "balanced" | "direct" | "drill";
export type Msg = { role: "user" | "assistant"; content: string };

export type Ctx = {
  name?: string;
  lifeScore?: number;
  streakDays?: number;
  recoverableSlip?: boolean;
  stats?: Partial<Record<"lungs" | "brain" | "wallet" | "willpower" | "body", number>>;
};

export function toneOf(v: unknown): Tone {
  return v === "gentle" || v === "direct" || v === "drill" ? v : "balanced";
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined;

export function parseCtx(v: unknown): Ctx {
  if (!v || typeof v !== "object") return {};
  const c = v as Record<string, unknown>;
  const sIn = (c.stats && typeof c.stats === "object" ? c.stats : {}) as Record<string, unknown>;
  return {
    name: typeof c.name === "string" ? c.name.slice(0, 40) : undefined,
    lifeScore: num(c.lifeScore),
    streakDays: num(c.streakDays),
    recoverableSlip: c.recoverableSlip === true,
    stats: {
      lungs: num(sIn.lungs),
      brain: num(sIn.brain),
      wallet: num(sIn.wallet),
      willpower: num(sIn.willpower),
      body: num(sIn.body),
    },
  };
}

/** Render the context as a compact system note, or null if there's nothing useful. */
export function contextSystem(c: Ctx): string | null {
  const bits: string[] = [];
  if (c.name) bits.push(`Their name is ${c.name}.`);
  if (c.streakDays !== undefined) bits.push(`Current clean streak: ${c.streakDays} day(s).`);
  if (c.recoverableSlip) bits.push("They just slipped and the streak is in the 48h recovery window — be supportive, no lecture.");
  if (c.lifeScore !== undefined) bits.push(`Life Score: ${c.lifeScore}/100.`);
  const s = c.stats || {};
  const stat = Object.entries(s)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  if (stat) bits.push(`Stats (0-100): ${stat}.`);
  if (bits.length === 0) return null;
  return (
    "CONTEXT about the user you're talking to (use it to personalize, but don't robotically recite every number): " +
    bits.join(" ")
  );
}

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

/**
 * Build a sliding-window rate limiter. `now` is injected so the limiter is
 * deterministic and testable. Returns true when the call is within budget
 * (and records the hit), false when the window is full.
 */
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
