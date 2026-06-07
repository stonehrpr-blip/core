/**
 * Client wrapper for the `physique-scan` edge function. Sends a base64 body
 * photo, returns the structured rating. Mirrors lib/ai/coach.ts's invoke +
 * timeout + typed-error pattern.
 *
 * PRIVACY: the base64 is sent once over HTTPS to OUR edge function for in-memory
 * analysis and is never persisted server-side. The on-device copy is handled
 * separately (lib/scanner/storage.ts).
 */
import { supabase } from "@/lib/supabase";
import type { MuscleKey, MuscleStatus } from "@/stores/game-state-store";

const FUNCTION = "physique-scan";
const TIMEOUT_MS = 30_000; // vision is slower than chat

export type PhysiqueMuscle = { level: number; status: MuscleStatus };
export type PhysiqueResult = {
  isBody: true;
  rank: { tier: string; score: number };
  muscles: Record<MuscleKey, PhysiqueMuscle>;
  weakPoints: MuscleKey[];
  summary: string;
};

export type ScanOutcome =
  | { kind: "ok"; result: PhysiqueResult }
  | { kind: "not_body" }
  | { kind: "rate_limited" }
  | { kind: "unavailable" } // no API key / network / model error
  | { kind: "error"; message?: string };

type FnResponse =
  | { isBody: false }
  | PhysiqueResult
  | { error: string; status?: number };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function runPhysiqueScan(
  base64: string,
  mediaType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<ScanOutcome> {
  try {
    const result = await withTimeout(
      supabase.functions.invoke<FnResponse>(FUNCTION, { body: { image: base64, mediaType } }),
      TIMEOUT_MS,
    );

    if (result.error) {
      const status = (result.error as { context?: { status?: number } }).context?.status;
      if (status === 429) return { kind: "rate_limited" };
      if (status === 503) return { kind: "unavailable" };
      return { kind: "error", message: result.error.message };
    }

    const data = result.data;
    if (!data) return { kind: "error", message: "empty response" };
    if ("error" in data) {
      if (data.error === "rate_limited") return { kind: "rate_limited" };
      if (data.error === "model_unavailable") return { kind: "unavailable" };
      return { kind: "error", message: data.error };
    }
    if (data.isBody === false) return { kind: "not_body" };
    return { kind: "ok", result: data as PhysiqueResult };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "network" };
  }
}
