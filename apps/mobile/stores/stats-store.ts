import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ModuleSlug } from "@/constants/modules";
import { StatSlug } from "@/constants/stats";
import {
  computeAllStats,
  computeLifeScore,
  EngineInputs,
} from "@/lib/stats/stat-engine";
import { useHabitsStore } from "./habits-store";

type StatsState = {
  /** Today's per-module 0-100 scores (set by per-module screens or imports). */
  moduleScores: Partial<Record<ModuleSlug, number>>;
  /** Snapshots — daily history of computed stat values for trends. */
  history: { date: string; stats: Record<StatSlug, number>; lifeScore: number }[];

  setModuleScore: (module: ModuleSlug, value: number) => void;
  setModuleScores: (scores: Partial<Record<ModuleSlug, number>>) => void;
  clearModuleScores: () => void;

  /** Compute current stats from habit slips + module scores (uses today's data). */
  computeNow: () => { stats: Record<StatSlug, number>; lifeScore: number };

  /** Save today's snapshot to history (call at the end of the day or on important transitions). */
  snapshotToday: () => void;

  /** Trend vs yesterday for a single stat. */
  yesterdayValue: (stat: StatSlug) => number | null;
};

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function buildInputs(moduleScores: Partial<Record<ModuleSlug, number>>): EngineInputs {
  const habits = useHabitsStore.getState();
  const slips = habits.slipsToday().map((s) => ({
    habit: s.habit,
    xpLost: s.xpLost,
    recovered: s.recovered,
  }));
  // Days active: use the oldest userHabit's startedAt
  let daysActive = 0;
  if (habits.userHabits.length > 0) {
    const earliest = habits.userHabits
      .map((h) => new Date(h.startedAt).getTime())
      .reduce((a, b) => Math.min(a, b));
    daysActive = Math.max(
      0,
      Math.floor((Date.now() - earliest) / 86_400_000),
    );
  }
  return { moduleScores, slipsToday: slips, daysActive };
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      moduleScores: {},
      history: [],

      setModuleScore: (module, value) =>
        set((s) => ({ moduleScores: { ...s.moduleScores, [module]: value } })),

      setModuleScores: (scores) =>
        set((s) => ({ moduleScores: { ...s.moduleScores, ...scores } })),

      clearModuleScores: () => set({ moduleScores: {} }),

      computeNow: () => {
        const inputs = buildInputs(get().moduleScores);
        const stats = computeAllStats(inputs);
        const lifeScore = computeLifeScore(inputs);
        return { stats, lifeScore };
      },

      snapshotToday: () => {
        const today = dayKey();
        const { stats, lifeScore } = get().computeNow();
        set((s) => {
          const filtered = s.history.filter((h) => h.date !== today);
          return {
            history: [
              ...filtered,
              { date: today, stats, lifeScore },
            ].slice(-90), // keep last 90 days
          };
        });
      },

      yesterdayValue: (stat) => {
        const yesterdayKey = dayKey(new Date(Date.now() - 86_400_000));
        const entry = get().history.find((h) => h.date === yesterdayKey);
        return entry?.stats[stat] ?? null;
      },
    }),
    {
      name: "core.stats.v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
