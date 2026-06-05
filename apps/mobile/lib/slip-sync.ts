/**
 * Pure helpers for slip persistence (apps/mobile/stores/slips-sync-store.ts).
 *
 * Kept side-effect-free so the idempotency + queue-replay logic — the part that
 * must never double-count a slip — is unit-testable without a Supabase mock.
 */

export type SlipKeyParts = { ts: number; habit: string; magnitude: number };

/**
 * Deterministic per-slip key. game-state slips are uniquely identified per user
 * by their ms timestamp + habit (+ magnitude), so the same slip always maps to
 * the same key — that's what makes a re-push (replay, queue flush, re-sign-in)
 * an idempotent upsert against slip_logs' unique(user_id, client_slip_key) index.
 */
export const slipKey = (s: SlipKeyParts): string => `${s.ts}:${s.habit}:${s.magnitude}`;

/** Inverse of slipKey. Returns null for malformed/legacy keys (skip, don't throw). */
export function parseSlipKey(key: string): SlipKeyParts | null {
  const [ts, habit, mag] = key.split(":");
  if (!ts || !habit) return null;
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  return { ts: n, habit, magnitude: Number(mag) || 1 };
}

/** Slips whose key isn't already confirmed on the server — the write-through set. */
export function selectUnsynced<T extends SlipKeyParts>(
  slips: T[],
  syncedKeys: Iterable<string>,
): T[] {
  const synced = new Set(syncedKeys);
  return slips.filter((s) => !synced.has(slipKey(s)));
}

export type SyncBookkeeping = { syncedKeys: string[]; pendingKeys: string[] };

const dedup = (xs: string[]): string[] => Array.from(new Set(xs));

/**
 * Fold a push outcome into the device-local bookkeeping.
 *   ok=true  → keys graduate to syncedKeys and leave the pending queue.
 *   ok=false → keys join pendingKeys for the next hydrate to replay.
 * Pure + idempotent: applying the same successful result twice is a no-op.
 */
export function applyPushResult(
  state: SyncBookkeeping,
  keys: string[],
  ok: boolean,
): SyncBookkeeping {
  if (ok) {
    return {
      syncedKeys: dedup([...state.syncedKeys, ...keys]),
      pendingKeys: state.pendingKeys.filter((k) => !keys.includes(k)),
    };
  }
  return {
    syncedKeys: state.syncedKeys,
    pendingKeys: dedup([...state.pendingKeys, ...keys]),
  };
}
