/**
 * Mirror of previews/core-state.js — same shape, same API, persisted via AsyncStorage.
 *
 * Read once at the top of any screen:
 *   const lifeScore = useGameStateStore(s => s.lifeScore());
 *   const brain     = useGameStateStore(s => s.stats.brain);
 *
 * Mutations:
 *   useGameStateStore.getState().logSlip("vape");
 *   useGameStateStore.getState().restoreStreak();
 *   useGameStateStore.getState().useFreeze();
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type StatKey = "lungs" | "brain" | "wallet" | "willpower" | "body";
export type Stats = Record<StatKey, number>;

export type Slip = {
  habit: string;
  ts: number;
  magnitude: number;
};

export type Freezes = {
  availableThisWeek: number;
  weekResetAt: number;
};

export type Streak = {
  days: number;
  startedAt: number;
  lastCleanAt: number;
  lostAt: number | null;
  previousDays: number | null;
  freezes: Freezes;
};

const STAT_MIN = 0;
const STAT_MAX = 100;
// Passive daily decay rates + recovery-rebound multipliers, mirrored from
// previews/_lib/core-state.js so RN matches the HTML stat economy. Stats drift
// down slowly when idle; a quest gain to a recently-decayed stat rebounds faster
// (× STAT_RECOVER). (No 'social' here — it isn't a habit-backed StatKey in RN.)
const STAT_DECAY: Record<StatKey, number> = { lungs: 0.15, brain: 0.25, wallet: 0.1, willpower: 0.35, body: 0.3 };
const STAT_RECOVER: Record<StatKey, number> = { lungs: 1.3, brain: 1.4, wallet: 1.2, willpower: 1.25, body: 1.15 };
const FREEZE_PER_WEEK = 1;
const TRIAL_DAYS = 7;

// 10-tier ladder — mirrors previews/core-state.js exactly.
// `color` is kept as an alias of `glow` so existing call sites (dashboard rank
// pill) keep working; new screens read c1/c2/glow directly for the crest.
export type Rank = {
  name: string;
  min: number;
  max: number;
  color: string;
  c1: string;
  c2: string;
  glow: string;
};
const RANKS: Rank[] = [
  { name: "Iron",        min: 0,    max: 299,      color: "#9aa0aa", c1: "#5f6670", c2: "#1d2229", glow: "#9aa0aa" },
  { name: "Bronze",      min: 300,  max: 799,      color: "#ff9a2f", c1: "#ff9a2f", c2: "#693400", glow: "#ff9a2f" },
  { name: "Silver",      min: 800,  max: 1499,     color: "#dbe9ff", c1: "#e9f3ff", c2: "#586676", glow: "#dbe9ff" },
  { name: "Gold",        min: 1500, max: 1999,     color: "#ffd84d", c1: "#ffd84d", c2: "#8b5a00", glow: "#ffd84d" },
  { name: "Emerald",     min: 2000, max: 2499,     color: "#31f5b2", c1: "#31f5b2", c2: "#00644f", glow: "#31f5b2" },
  { name: "Platinum",    min: 2500, max: 2999,     color: "#38c7ff", c1: "#38c7ff", c2: "#003a84", glow: "#38c7ff" },
  { name: "Diamond",     min: 3000, max: 3499,     color: "#a970ff", c1: "#a970ff", c2: "#2b0d67", glow: "#a970ff" },
  { name: "Master",      min: 3500, max: 3999,     color: "#ff5a3d", c1: "#ff5a3d", c2: "#5d0900", glow: "#ff5a3d" },
  { name: "Grandmaster", min: 4000, max: 4499,     color: "#e35cff", c1: "#e35cff", c2: "#420077", glow: "#e35cff" },
  { name: "Legend",      min: 4500, max: Infinity, color: "#ffe66d", c1: "#ffe66d", c2: "#c77700", glow: "#ffe66d" },
];

export type XpLedgerEntry = { ts: number; delta: number; reason: string };
export type StatLedgerEntry = { ts: number; stat: StatKey; delta: number; reason: string };
export type RankHistoryEntry = { rankName: string; ts: number; xp: number };

const HABIT_PRIMARY: Record<string, StatKey> = {
  vape: "lungs",
  doomscroll: "brain",
  spend: "wallet",
  drink: "willpower",
  porn: "willpower",
  weed: "lungs",
  junk_food: "body",
  nicotine_pouch: "lungs",
};

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// Mirror of previews/core-state.js _rankIdxFor + _xpDelta — central XP mutator
// that maintains the ledger + captures rank-ups into rankHistory.
function rankIdxFor(xp: number) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) idx = i;
  return idx;
}

type GameState = {
  stats: Stats;
  streak: Streak;
  xp: number;
  level: number;
  slips: Slip[];
  lastSeenAt: string | null;
  lastStatTickAt: number | null;
  xpLedger: XpLedgerEntry[];
  statLedger: StatLedgerEntry[];
  rankHistory: RankHistoryEntry[];

  // selectors
  lifeScore: () => number;
  rankFor: (xp?: number) => Rank & { idx: number; tier: number; label: string; toNext: number };
  streakLost: () => boolean;
  isStreakRecoverable: () => boolean;
  todayDeltas: () => Stats;
  trialDay: () => number; // proxied from auth-store; thin selector here for parity

  // actions
  logSlip: (habit: string, opts?: { magnitude?: number }) => void;
  addStat: (stat: StatKey, amount: number, reason?: string) => void;
  applyStatTick: () => void;
  restoreStreak: () => void;
  useFreeze: () => boolean;
  addXp: (amount: number, reason?: string) => void;
  touchLastSeen: () => void;
  resetAll: () => void;
};

const DEFAULTS: Pick<GameState, "stats" | "streak" | "xp" | "level" | "slips" | "lastSeenAt" | "lastStatTickAt" | "xpLedger" | "statLedger" | "rankHistory"> = {
  stats: { lungs: 64, brain: 78, wallet: 58, willpower: 81, body: 67 },
  streak: {
    days: 14,
    startedAt: Date.now() - 14 * 86400000,
    lastCleanAt: Date.now(),
    lostAt: null,
    previousDays: null,
    freezes: { availableThisWeek: 1, weekResetAt: Date.now() + 7 * 86400000 },
  },
  xp: 1140,
  level: 3,
  slips: [],
  lastSeenAt: null,
  lastStatTickAt: null,
  xpLedger: [],
  // Demo slip history so the profile stat-detail sheet shows real recent activity.
  // Slips lower stats (RN has no positive stat-gain action yet), so all deltas are
  // negative — each stat sheet shows what hurt it + when.
  statLedger: [
    { ts: Date.now() - 1 * 3600000, stat: "brain", delta: 6, reason: "quest_deep_work" },
    { ts: Date.now() - 4 * 3600000, stat: "body", delta: 5, reason: "quest_workout" },
    { ts: Date.now() - 2 * 3600000, stat: "brain", delta: -8, reason: "slip_doomscroll" },
    { ts: Date.now() - 2 * 3600000, stat: "willpower", delta: -5, reason: "slip_doomscroll" },
    { ts: Date.now() - 30 * 3600000, stat: "body", delta: -10, reason: "slip_junk_food" },
    { ts: Date.now() - 30 * 3600000, stat: "willpower", delta: -6, reason: "slip_junk_food" },
    { ts: Date.now() - 54 * 3600000, stat: "lungs", delta: -12, reason: "slip_vape" },
    { ts: Date.now() - 54 * 3600000, stat: "willpower", delta: -7, reason: "slip_vape" },
    { ts: Date.now() - 78 * 3600000, stat: "wallet", delta: -9, reason: "slip_spend" },
  ],
  rankHistory: [],
};

export const useGameStateStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      lifeScore: () => {
        const v = get().stats;
        const w = { lungs: 1, brain: 1, wallet: 1, willpower: 1.2, body: 1 };
        const total = w.lungs + w.brain + w.wallet + w.willpower + w.body;
        return Math.round((v.lungs * w.lungs + v.brain * w.brain + v.wallet * w.wallet + v.willpower * w.willpower + v.body * w.body) / total);
      },

      rankFor: (xpIn?: number) => {
        const xp = xpIn ?? get().xp;
        let r = RANKS[0];
        for (const cur of RANKS) if (xp >= cur.min) r = cur;
        const idx = RANKS.indexOf(r);
        const nextR = RANKS[idx + 1];
        const toNext = nextR ? Math.max(0, nextR.min - xp) : 0;
        return { ...r, idx, tier: idx + 1, label: r.name, toNext };
      },

      streakLost: () => {
        const s = get().streak;
        return s.lostAt !== null && s.days === 0;
      },

      isStreakRecoverable: () => {
        const s = get().streak;
        if (!(s.lostAt !== null && s.days === 0)) return false;
        const hoursAgo = (Date.now() - (s.lostAt || 0)) / 3600000;
        return hoursAgo <= 48 && (s.previousDays || 0) > 0;
      },

      todayDeltas: () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const d: Stats = { lungs: 0, brain: 0, wallet: 0, willpower: 0, body: 0 };
        for (const sl of get().slips) {
          if (sl.ts < cutoff) continue;
          const primary = HABIT_PRIMARY[sl.habit] || "willpower";
          d[primary]  -= sl.magnitude * 2.5;
          d.willpower -= sl.magnitude * 1.5;
        }
        (Object.keys(d) as StatKey[]).forEach((k) => { d[k] = Math.round(d[k]); });
        return d;
      },

      logSlip: (habit, opts) => {
        const mag = opts?.magnitude ?? 1;
        set((s) => {
          const primary = HABIT_PRIMARY[habit] || "willpower";
          const next: Stats = { ...s.stats };
          next[primary] = clamp(next[primary] - mag * 2.5, STAT_MIN, STAT_MAX);
          next.willpower = clamp(next.willpower - mag * 1.5, STAT_MIN, STAT_MAX);
          const streak: Streak = { ...s.streak };
          if (streak.days > 0) {
            streak.previousDays = streak.days;
            streak.days = 0;
            streak.lostAt = Date.now();
          }
          const delta = -mag * 8;
          const newXp = Math.max(0, s.xp + delta);
          const ts = Date.now();
          const ledger: XpLedgerEntry[] = [{ ts, delta, reason: "slip_" + habit }, ...s.xpLedger].slice(0, 200);
          // Record the actual per-stat hits so the profile stat-detail sheet has history.
          const statEntries: StatLedgerEntry[] = [];
          const pd = Math.round(next[primary] - s.stats[primary]);
          if (pd !== 0) statEntries.push({ ts, stat: primary, delta: pd, reason: "slip_" + habit });
          if (primary !== "willpower") {
            const wd = Math.round(next.willpower - s.stats.willpower);
            if (wd !== 0) statEntries.push({ ts, stat: "willpower", delta: wd, reason: "slip_" + habit });
          }
          const statLedger: StatLedgerEntry[] = [...statEntries, ...s.statLedger].slice(0, 200);
          return {
            stats: next,
            streak,
            xp: newXp,
            slips: [...s.slips, { habit, ts, magnitude: mag }],
            xpLedger: ledger,
            statLedger,
          };
        });
      },

      // Positive stat growth (quests, clean days). Mirrors logSlip's ledger so the
      // stat-detail sheet shows gains (+) alongside slips (−).
      addStat: (stat, amount, reason) => {
        if (!amount) return;
        set((s) => {
          const now = Date.now();
          // Recovery rebound — a quest gain to a stat that decayed in the last 7 days
          // rebounds faster (× STAT_RECOVER), logged separately as 'recover'. Mirrors
          // addStat() in previews/_lib/core-state.js.
          let bonus = 0;
          if (amount > 0 && reason?.startsWith("quest")) {
            const since = now - 7 * 86400000;
            const decayed = s.statLedger.some((e) => e.stat === stat && e.reason === "decay" && e.delta < 0 && e.ts >= since);
            if (decayed) bonus = Math.round(amount * Math.max(0, (STAT_RECOVER[stat] || 1) - 1));
          }
          const next: Stats = { ...s.stats };
          next[stat] = clamp(next[stat] + amount + bonus, STAT_MIN, STAT_MAX);
          const applied = Math.round(next[stat] - s.stats[stat]);
          if (applied === 0) return {} as Partial<GameState>;
          const entries: StatLedgerEntry[] = [{ ts: now, stat, delta: amount, reason: reason || "gain" }];
          if (bonus > 0) entries.unshift({ ts: now, stat, delta: bonus, reason: "recover" });
          const statLedger: StatLedgerEntry[] = [...entries, ...s.statLedger].slice(0, 200);
          return { stats: next, statLedger };
        });
      },

      // Passive daily stat drift — stats in STAT_DECAY drop per idle calendar day
      // (capped at 7), with a 24h grace if raised recently. Paused during onboarding
      // (xp < 600). Idempotent within a day — safe to call on every mount. Mirrors
      // applyStatTick() in previews/_lib/core-state.js.
      applyStatTick: () => {
        set((s) => {
          const now = Date.now();
          if (s.xp < 600) return { lastStatTickAt: now };
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          const lastStart = new Date(s.lastStatTickAt ?? now); lastStart.setHours(0, 0, 0, 0);
          let days = Math.floor((todayStart.getTime() - lastStart.getTime()) / 86400000);
          if (days <= 0) return s.lastStatTickAt ? {} as Partial<GameState> : { lastStatTickAt: now };
          days = Math.min(days, 7);
          const next: Stats = { ...s.stats };
          const decayEntries: StatLedgerEntry[] = [];
          (Object.keys(STAT_DECAY) as StatKey[]).forEach((k) => {
            const dec = STAT_DECAY[k];
            if (dec <= 0) return;
            const raisedRecently = s.statLedger.some((e) => e.stat === k && e.delta > 0 && now - e.ts < 86400000);
            if (raisedRecently) return;
            const after = clamp(next[k] - dec * days, STAT_MIN, STAT_MAX);
            if (after !== next[k]) {
              decayEntries.push({ ts: now, stat: k, delta: Math.round((after - next[k]) * 10) / 10, reason: "decay" });
              next[k] = after;
            }
          });
          const statLedger = decayEntries.length ? [...decayEntries, ...s.statLedger].slice(0, 200) : s.statLedger;
          return { stats: next, statLedger, lastStatTickAt: now };
        });
      },

      restoreStreak: () => {
        set((s) => {
          const prev = s.streak.previousDays;
          if (!prev) return s;
          const delta = 50;
          const oldIdx = rankIdxFor(s.xp);
          const newXp = s.xp + delta;
          const newIdx = rankIdxFor(newXp);
          const ledger: XpLedgerEntry[] = [{ ts: Date.now(), delta, reason: "streak_restore" }, ...s.xpLedger].slice(0, 200);
          let rankHistory = s.rankHistory;
          if (newIdx > oldIdx) {
            const ups: RankHistoryEntry[] = [];
            for (let i = oldIdx + 1; i <= newIdx; i++) ups.unshift({ rankName: RANKS[i].name, ts: Date.now(), xp: RANKS[i].min });
            rankHistory = [...ups, ...s.rankHistory].slice(0, 50);
          }
          return {
            streak: { ...s.streak, days: prev, lostAt: null, lastCleanAt: Date.now() },
            xp: newXp,
            xpLedger: ledger,
            rankHistory,
          };
        });
      },

      // Public XP earner (milestones, quests, coach completions, manual grants).
      // Maintains the ledger + captures rank-ups into rankHistory.
      addXp: (amount, reason) => {
        if (!amount) return;
        set((s) => {
          const oldIdx = rankIdxFor(s.xp);
          const newXp = Math.max(0, s.xp + amount);
          const newIdx = rankIdxFor(newXp);
          const ledger: XpLedgerEntry[] = [{ ts: Date.now(), delta: amount, reason: reason || "unspecified" }, ...s.xpLedger].slice(0, 200);
          let rankHistory = s.rankHistory;
          if (amount > 0 && newIdx > oldIdx) {
            const ups: RankHistoryEntry[] = [];
            for (let i = oldIdx + 1; i <= newIdx; i++) ups.unshift({ rankName: RANKS[i].name, ts: Date.now(), xp: RANKS[i].min });
            rankHistory = [...ups, ...s.rankHistory].slice(0, 50);
          }
          return { xp: newXp, xpLedger: ledger, rankHistory };
        });
      },

      useFreeze: () => {
        const fz = get().streak.freezes;
        if (fz.availableThisWeek <= 0) return false;
        set((s) => ({
          streak: {
            ...s.streak,
            lastCleanAt: Date.now(),
            freezes: { ...s.streak.freezes, availableThisWeek: s.streak.freezes.availableThisWeek - 1 },
          },
        }));
        return true;
      },

      // Parity helper. Lets screens call game.touchLastSeen() without having to know
      // about the auth-store. Mirrors `core-state.js` web behavior.
      touchLastSeen: () => set({ lastSeenAt: new Date().toISOString() }),

      // Read trial start through auth-store. Kept here so screens don't import two stores
      // just to ask "what day of trial is it?".
      trialDay: () => {
        try {
          // Lazy import to avoid a hard cyclic dep at parse time.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const auth = require("./auth-store") as typeof import("./auth-store");
          return auth.useAuthStore.getState().trialDay();
        } catch {
          return 0;
        }
      },

      resetAll: () => set({ ...DEFAULTS }),
    }),
    {
      name: "core.gameState.v1",
      storage: createJSONStorage(() => AsyncStorage),
      // roll the weekly freeze forward when re-hydrating
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const fz = state.streak?.freezes;
        if (fz && fz.weekResetAt < Date.now()) {
          state.streak.freezes = { availableThisWeek: FREEZE_PER_WEEK, weekResetAt: Date.now() + 7 * 86400000 };
        }
      },
    },
  ),
);

export const GAME_RANKS = RANKS;
export const GAME_HABIT_PRIMARY = HABIT_PRIMARY;
