// REAL end-to-end check of the vision path against Anthropic.
// This calls the live API, so it needs YOUR key and a real photo. It exercises
// the exact same `analyzePhysique` the deployed function uses.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... \
//     deno run --allow-env --allow-read --allow-net \
//     supabase/functions/physique-scan/integration_test.ts <body-photo> [<non-body-photo>]
//
// Pass a full-body photo (jpg/png/webp). Optionally pass a second NON-body image
// (a mug, a pet, an empty room) to confirm the isBody=false gate fires for real.

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { analyzePhysique, type VisionProvider } from "./helpers.ts";

// Uses OpenAI if OPENAI_API_KEY is set, else Anthropic. Override with VISION_PROVIDER.
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const PROVIDER: VisionProvider =
  (Deno.env.get("VISION_PROVIDER") as VisionProvider) || (OPENAI_KEY ? "openai" : "anthropic");
const MODEL = PROVIDER === "openai"
  ? (Deno.env.get("PHYSIQUE_OPENAI_MODEL") || "gpt-4o-mini")
  : (Deno.env.get("PHYSIQUE_MODEL") || "claude-sonnet-4-6");

function mediaTypeFor(path: string): string {
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function run(path: string, label: string) {
  const apiKey = PROVIDER === "openai" ? OPENAI_KEY : (Deno.env.get("ANTHROPIC_API_KEY") || "");
  if (!apiKey) { console.error(`✗ Set ${PROVIDER === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} in the environment.`); Deno.exit(2); }
  const bytes = await Deno.readFile(path);
  const base64 = encodeBase64(bytes);
  console.log(`\n── ${label} [${PROVIDER}/${MODEL}]: ${path} (${(bytes.length / 1024).toFixed(0)} KB) ──`);
  const t0 = Date.now();
  const out = await analyzePhysique({ provider: PROVIDER, apiKey, base64, mediaType: mediaTypeFor(path), model: MODEL });
  console.log(`took ${Date.now() - t0} ms`);
  if (!out.ok) { console.error("✗ error:", out.error, out.status ?? ""); return; }
  console.log(JSON.stringify(out.result, null, 2));
  // quick contract sanity
  const r = out.result;
  const muscleKeys = ["chest", "back", "shoulders", "arms", "legs", "core"];
  const ok =
    typeof r.isBody === "boolean" &&
    typeof r.rank.score === "number" && r.rank.score >= 0 && r.rank.score <= 100 &&
    muscleKeys.every((k) => k in r.muscles);
  console.log(ok ? "✓ contract OK" : "✗ contract MISMATCH");
}

const [bodyPath, notBodyPath] = Deno.args;
if (!bodyPath) {
  console.error("Usage: deno run -A integration_test.ts <body-photo> [<non-body-photo>]");
  Deno.exit(1);
}
await run(bodyPath, "FULL BODY (expect isBody:true + a rating)");
if (notBodyPath) await run(notBodyPath, "NON-BODY (expect isBody:false)");
