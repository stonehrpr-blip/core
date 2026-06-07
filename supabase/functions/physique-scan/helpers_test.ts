// Unit tests for physique-scan helpers. Run: deno test helpers_test.ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  MUSCLE_KEYS,
  validateImage,
  normalizeResult,
  extractJSON,
  createRateLimiter,
  analyzePhysique,
} from "./helpers.ts";

const B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

Deno.test("validateImage accepts bare base64", () => {
  const r = validateImage(B64, "image/png", 5_000_000);
  assert(r.ok);
  if (r.ok) assertEquals(r.mediaType, "image/png");
});

Deno.test("validateImage strips data URI prefix + picks media type", () => {
  const r = validateImage("data:image/jpeg;base64," + B64, undefined, 5_000_000);
  assert(r.ok);
  if (r.ok) { assertEquals(r.mediaType, "image/jpeg"); assert(!r.data.startsWith("data:")); }
});

Deno.test("validateImage rejects empty + bad type + oversize", () => {
  assertEquals(validateImage("", "image/png", 100).ok, false);
  assertEquals(validateImage(B64, "image/gif", 5_000_000).ok, false);
  assertEquals(validateImage(B64.repeat(1000), "image/png", 100).ok, false);
});

Deno.test("normalizeResult clamps, derives status + weakPoints", () => {
  const out = normalizeResult({
    isBody: true,
    rank: { tier: "Athletic", score: 142 },
    muscles: {
      chest: { level: 80 }, back: { level: 30 }, shoulders: { level: 65 },
      arms: { level: 90 }, legs: { level: 20 }, core: { level: 55 },
    },
    summary: "Looking strong, prioritize legs.",
  });
  assertEquals(out.rank.score, 100); // clamped
  assertEquals(out.muscles.chest.status, "strong");
  assertEquals(out.muscles.back.status, "weak");   // <45
  assertEquals(out.muscles.core.status, "ok");      // 45-71
  // weakPoints derived from weak statuses when not provided
  assert(out.weakPoints.includes("back"));
  assert(out.weakPoints.includes("legs"));
  for (const k of MUSCLE_KEYS) assert(k in out.muscles);
});

Deno.test("normalizeResult never throws on garbage", () => {
  const out = normalizeResult(null);
  assertEquals(out.isBody, false);
  assertEquals(out.rank.score, 0);
  assertEquals(out.weakPoints.length >= 0, true);
});

Deno.test("extractJSON handles fenced + raw", () => {
  assertEquals((extractJSON('```json\n{"a":1}\n```') as { a: number }).a, 1);
  assertEquals((extractJSON('noise {"b":2} trailing') as { b: number }).b, 2);
  assertEquals(extractJSON("no json here"), null);
});

const CONTRACT = {
  isBody: true, rank: { tier: "Athletic", score: 70 },
  muscles: { chest: { level: 70 }, back: { level: 40 }, shoulders: { level: 60 }, arms: { level: 75 }, legs: { level: 35 }, core: { level: 55 } },
  summary: "good",
};

Deno.test("analyzePhysique routes to OpenAI + parses its shape", async () => {
  let calledUrl = "";
  const fakeFetch = ((url: string) => {
    calledUrl = String(url);
    return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(CONTRACT) } }] }), { status: 200 }));
  }) as unknown as typeof fetch;
  const out = await analyzePhysique({ provider: "openai", apiKey: "k", base64: "x", mediaType: "image/jpeg", model: "gpt-4o-mini", fetchImpl: fakeFetch });
  assert(calledUrl.includes("openai.com"));
  assert(out.ok);
  if (out.ok) { assertEquals(out.result.rank.score, 70); assertEquals(out.result.muscles.legs.status, "weak"); }
});

Deno.test("analyzePhysique routes to Anthropic + parses its shape", async () => {
  let calledUrl = "";
  const fakeFetch = ((url: string) => {
    calledUrl = String(url);
    return Promise.resolve(new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(CONTRACT) }] }), { status: 200 }));
  }) as unknown as typeof fetch;
  const out = await analyzePhysique({ provider: "anthropic", apiKey: "k", base64: "x", mediaType: "image/jpeg", model: "claude-sonnet-4-6", fetchImpl: fakeFetch });
  assert(calledUrl.includes("anthropic.com"));
  assert(out.ok);
});

Deno.test("analyzePhysique passes through isBody:false (non-physique)", async () => {
  const fakeFetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ isBody: false }) } }] }), { status: 200 }))) as unknown as typeof fetch;
  const out = await analyzePhysique({ provider: "openai", apiKey: "k", base64: "x", mediaType: "image/jpeg", model: "gpt-4o-mini", fetchImpl: fakeFetch });
  assert(out.ok);
  if (out.ok) assertEquals(out.result.isBody, false);
});

Deno.test("analyzePhysique surfaces a model error", async () => {
  const fakeFetch = (() => Promise.resolve(new Response("nope", { status: 500 }))) as unknown as typeof fetch;
  const out = await analyzePhysique({ provider: "openai", apiKey: "k", base64: "x", mediaType: "image/jpeg", model: "gpt-4o-mini", fetchImpl: fakeFetch });
  assertEquals(out.ok, false);
});

Deno.test("rate limiter enforces window", () => {
  const ok = createRateLimiter({ windowMs: 1000, max: 2 });
  assert(ok("u", 0));
  assert(ok("u", 100));
  assert(!ok("u", 200)); // 3rd in window blocked
  assert(ok("u", 1300)); // window slid
});
