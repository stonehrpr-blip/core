import {
  slipKey,
  parseSlipKey,
  selectUnsynced,
  applyPushResult,
  type SlipKeyParts,
} from "../slip-sync";

const slip = (ts: number, habit: string, magnitude = 1): SlipKeyParts => ({ ts, habit, magnitude });

describe("slipKey / parseSlipKey", () => {
  it("is deterministic — the same slip always yields the same key", () => {
    const s = slip(1717500000000, "vape", 2);
    expect(slipKey(s)).toBe("1717500000000:vape:2");
    expect(slipKey(s)).toBe(slipKey({ ...s }));
  });

  it("round-trips through parse", () => {
    const s = slip(1717500000000, "doomscroll", 3);
    expect(parseSlipKey(slipKey(s))).toEqual(s);
  });

  it("defaults a missing/NaN magnitude to 1 rather than throwing", () => {
    expect(parseSlipKey("1717500000000:vape")).toEqual(slip(1717500000000, "vape", 1));
    expect(parseSlipKey("1717500000000:vape:nope")).toEqual(slip(1717500000000, "vape", 1));
  });

  it("returns null for malformed/legacy keys", () => {
    expect(parseSlipKey("")).toBeNull();
    expect(parseSlipKey("notanumber:vape:1")).toBeNull();
    expect(parseSlipKey(":vape:1")).toBeNull();
  });
});

describe("selectUnsynced — idempotency filter", () => {
  it("returns only slips whose key isn't already synced", () => {
    const slips = [slip(1, "vape"), slip(2, "drink"), slip(3, "spend")];
    const synced = [slipKey(slip(2, "drink"))];
    expect(selectUnsynced(slips, synced)).toEqual([slip(1, "vape"), slip(3, "spend")]);
  });

  it("returns nothing once every slip is synced — re-push is a no-op", () => {
    const slips = [slip(1, "vape"), slip(2, "drink")];
    const synced = slips.map(slipKey);
    expect(selectUnsynced(slips, synced)).toEqual([]);
  });

  it("does NOT double-count a slip that differs only by magnitude", () => {
    // A re-logged slip at the same ts but different magnitude is a distinct event.
    const slips = [slip(1, "vape", 1), slip(1, "vape", 2)];
    const synced = [slipKey(slip(1, "vape", 1))];
    expect(selectUnsynced(slips, synced)).toEqual([slip(1, "vape", 2)]);
  });
});

describe("applyPushResult — queue-replay bookkeeping", () => {
  const base = { syncedKeys: [] as string[], pendingKeys: [] as string[] };

  it("on success, keys graduate to synced and leave the pending queue", () => {
    const queued = { syncedKeys: [], pendingKeys: ["1:vape:1", "2:drink:1"] };
    const next = applyPushResult(queued, ["1:vape:1", "2:drink:1"], true);
    expect(next.syncedKeys.sort()).toEqual(["1:vape:1", "2:drink:1"]);
    expect(next.pendingKeys).toEqual([]);
  });

  it("on failure, keys are queued for the next hydrate (no data lost)", () => {
    const next = applyPushResult(base, ["1:vape:1"], false);
    expect(next.pendingKeys).toEqual(["1:vape:1"]);
    expect(next.syncedKeys).toEqual([]);
  });

  it("replays a queued slip: fail then succeed ends fully synced, queue empty", () => {
    const key = "1:vape:1";
    const afterFail = applyPushResult(base, [key], false);
    expect(afterFail.pendingKeys).toEqual([key]);
    const afterRetry = applyPushResult(afterFail, [key], true);
    expect(afterRetry.syncedKeys).toEqual([key]);
    expect(afterRetry.pendingKeys).toEqual([]);
  });

  it("is idempotent — applying the same success twice doesn't duplicate keys", () => {
    const once = applyPushResult(base, ["1:vape:1"], true);
    const twice = applyPushResult(once, ["1:vape:1"], true);
    expect(twice.syncedKeys).toEqual(["1:vape:1"]);
    expect(twice.pendingKeys).toEqual([]);
  });
});
