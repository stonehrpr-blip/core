/**
 * Pure helpers for the sign-in "pull-before-push" reconciliation in
 * apps/mobile/stores/profile-sync-store.ts.
 *
 * Kept side-effect-free so the clobber-avoidance decision — the part that must
 * not overwrite real server progress with post-reinstall DEFAULTS, nor undo a
 * just-logged local slip — is unit-testable without Supabase or the store.
 */

export const CORE_STAT_SLUGS = ["lungs", "brain", "wallet", "willpower", "body"] as const;
export type CoreStatSlug = (typeof CORE_STAT_SLUGS)[number];

/**
 * Should we adopt the server's core progress on sign-in?
 *
 * True only when BOTH hold:
 *   1. the server is ahead of local xp (the classic reinstall signal — local
 *      was wiped back to DEFAULTS, which is behind the server's real total); and
 *   2. local has no xp-ledger activity this session (localLedgerCount === 0).
 *
 * The ledger guard closes the stale-server edge case: a slip just logged locally
 * drops xp below a server value that hasn't been pushed yet. Without the guard
 * we'd see "server ahead" and restore the higher xp, silently undoing the slip.
 * A genuine reinstall has an empty xp ledger (DEFAULTS.xpLedger === []), so it
 * still adopts; an active session has ledger entries, so it keeps local + pushes.
 *
 * (Residual race, by design: if a user reinstalls and manages to log a slip in
 * the brief window before hydrate() runs, the ledger is non-empty and we skip
 * adoption — local DEFAULTS get pushed up. Narrow and rare; the net trade favours
 * never resurrecting a slip the user just owned up to.)
 */
export function shouldAdoptServerProgress(args: {
  localXp: number;
  serverXp: number;
  localLedgerCount: number;
}): boolean {
  return args.serverXp > args.localXp && args.localLedgerCount === 0;
}

export const clampStat = (v: number): number => Math.max(0, Math.min(100, Math.round(v)));

/** Map server user_stats rows to a clamped {slug: value} patch, core stats only. */
export function buildRestoreStats(
  rows: { stat_slug: string; value: number }[],
): Partial<Record<CoreStatSlug, number>> {
  const out: Partial<Record<CoreStatSlug, number>> = {};
  for (const r of rows) {
    if ((CORE_STAT_SLUGS as readonly string[]).includes(r.stat_slug)) {
      out[r.stat_slug as CoreStatSlug] = clampStat(r.value);
    }
  }
  return out;
}
