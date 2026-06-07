// Unit tests for the ai-coach pure helpers.
// Run from this dir (auto-discovers deno.json):  cd supabase/functions/ai-coach && deno test
// Or from repo root:  deno test --config supabase/functions/ai-coach/deno.json supabase/functions/ai-coach/
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  toneOf,
  parseCtx,
  contextSystem,
  callerKey,
  createRateLimiter,
} from "./helpers.ts";

Deno.test("toneOf: valid tones pass through, everything else → balanced", () => {
  assertEquals(toneOf("gentle"), "gentle");
  assertEquals(toneOf("direct"), "direct");
  assertEquals(toneOf("drill"), "drill");
  assertEquals(toneOf("balanced"), "balanced");
  assertEquals(toneOf("nonsense"), "balanced");
  assertEquals(toneOf(undefined), "balanced");
  assertEquals(toneOf(42), "balanced");
});

Deno.test("parseCtx: coerces, rounds, and caps", () => {
  const c = parseCtx({
    name: "x".repeat(100),
    lifeScore: 72.6,
    streakDays: 6,
    recoverableSlip: true,
    stats: { lungs: 64.2, brain: "78", body: 67 },
  });
  assertEquals(c.name?.length, 40); // name capped at 40
  assertEquals(c.lifeScore, 73); // rounded
  assertEquals(c.streakDays, 6);
  assertEquals(c.recoverableSlip, true);
  assertEquals(c.stats?.lungs, 64);
  assertEquals(c.stats?.brain, undefined); // non-number dropped
  assertEquals(c.stats?.body, 67);
});

Deno.test("parseCtx: junk input → empty-ish context", () => {
  assertEquals(parseCtx(null), {});
  assertEquals(parseCtx("nope"), {});
  const c = parseCtx({});
  assertEquals(c.name, undefined);
  assertEquals(c.recoverableSlip, false);
});

Deno.test("contextSystem: null when nothing useful, else compact note", () => {
  assertEquals(contextSystem({}), null);
  assertEquals(contextSystem(parseCtx({ stats: {} })), null);

  const note = contextSystem({
    name: "Sam",
    streakDays: 6,
    recoverableSlip: true,
    lifeScore: 73,
    stats: { lungs: 64, willpower: 81 },
  });
  assert(note !== null);
  assert(note!.includes("Sam"));
  assert(note!.includes("6 day"));
  assert(note!.includes("48h recovery"));
  assert(note!.includes("lungs 64"));
  assert(note!.includes("willpower 81"));
});

Deno.test("callerKey: uses JWT sub when present", () => {
  // header.payload.signature — payload = {"sub":"user-123"} base64url
  const payload = btoa(JSON.stringify({ sub: "user-123" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const req = new Request("http://x", {
    headers: { authorization: `Bearer h.${payload}.sig` },
  });
  assertEquals(callerKey(req), "u:user-123");
});

Deno.test("callerKey: falls back to IP when no/garbage token", () => {
  const req = new Request("http://x", {
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
  assertEquals(callerKey(req), "ip:1.2.3.4");

  const bad = new Request("http://x", {
    headers: { authorization: "Bearer not-a-jwt", "x-forwarded-for": "5.6.7.8" },
  });
  assertEquals(callerKey(bad), "ip:5.6.7.8");
});

Deno.test("createRateLimiter: blocks after max within window", () => {
  const limit = createRateLimiter({ windowMs: 1000, max: 3 });
  assertEquals(limit("a", 0), true);
  assertEquals(limit("a", 100), true);
  assertEquals(limit("a", 200), true);
  assertEquals(limit("a", 300), false); // 4th in window → blocked
});

Deno.test("createRateLimiter: window slides, old hits expire", () => {
  const limit = createRateLimiter({ windowMs: 1000, max: 2 });
  assertEquals(limit("a", 0), true);
  assertEquals(limit("a", 500), true);
  assertEquals(limit("a", 600), false); // full
  assertEquals(limit("a", 1100), true); // t=0 hit aged out (1100-0 >= 1000)
});

Deno.test("createRateLimiter: keys are independent", () => {
  const limit = createRateLimiter({ windowMs: 1000, max: 1 });
  assertEquals(limit("a", 0), true);
  assertEquals(limit("b", 0), true); // different user unaffected
  assertEquals(limit("a", 10), false);
});
