import {
  shouldAdoptServerProgress,
  buildRestoreStats,
  clampStat,
  CORE_STAT_SLUGS,
} from "../progress-sync";

describe("shouldAdoptServerProgress — clobber avoidance", () => {
  it("adopts server on a clean reinstall (server ahead, empty local ledger)", () => {
    // The bug this fixes: DEFAULTS xp (e.g. 1140) is BEHIND real server xp, and a
    // freshly reinstalled device has no xp-ledger activity yet.
    expect(
      shouldAdoptServerProgress({ localXp: 1140, serverXp: 5000, localLedgerCount: 0 }),
    ).toBe(true);
  });

  it("keeps local when local is ahead (offline gains) — push, don't clobber", () => {
    expect(
      shouldAdoptServerProgress({ localXp: 6000, serverXp: 5000, localLedgerCount: 3 }),
    ).toBe(false);
  });

  it("keeps local when xp is equal — nothing to restore", () => {
    expect(
      shouldAdoptServerProgress({ localXp: 5000, serverXp: 5000, localLedgerCount: 0 }),
    ).toBe(false);
  });

  it("does NOT adopt when the ledger is non-empty — guards the just-logged-slip case", () => {
    // A slip just dropped local xp below a not-yet-pushed server value. Server
    // looks "ahead", but local activity (ledger > 0) means we must NOT resurrect
    // the lost xp by restoring the stale server total.
    expect(
      shouldAdoptServerProgress({ localXp: 4992, serverXp: 5000, localLedgerCount: 1 }),
    ).toBe(false);
  });

  it("treats a first-ever sign-in (server at 0) as local-authoritative", () => {
    expect(
      shouldAdoptServerProgress({ localXp: 1140, serverXp: 0, localLedgerCount: 0 }),
    ).toBe(false);
  });
});

describe("buildRestoreStats", () => {
  it("maps and clamps core-stat rows to a value patch", () => {
    const rows = [
      { stat_slug: "lungs", value: 73.6 },
      { stat_slug: "brain", value: -5 },
      { stat_slug: "willpower", value: 140 },
    ];
    expect(buildRestoreStats(rows)).toEqual({ lungs: 74, brain: 0, willpower: 100 });
  });

  it("ignores non-core slugs (e.g. social) so game-state StatKeys stay valid", () => {
    const rows = [
      { stat_slug: "body", value: 50 },
      { stat_slug: "social", value: 88 },
    ];
    expect(buildRestoreStats(rows)).toEqual({ body: 50 });
  });

  it("returns an empty patch for no rows", () => {
    expect(buildRestoreStats([])).toEqual({});
  });
});

describe("clampStat + catalog", () => {
  it("clamps to the slip_logs/user_stats 0–100 range and rounds", () => {
    expect(clampStat(-3)).toBe(0);
    expect(clampStat(101)).toBe(100);
    expect(clampStat(64.4)).toBe(64);
  });

  it("exposes exactly the five habit-backed core stats", () => {
    expect([...CORE_STAT_SLUGS]).toEqual(["lungs", "brain", "wallet", "willpower", "body"]);
  });
});
