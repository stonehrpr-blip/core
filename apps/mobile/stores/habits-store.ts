import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { HABITS, HabitSlug } from "@/constants/habits";

export type SlipLog = {
  id: string;
  habit: HabitSlug;
  loggedAt: string; // ISO
  xpLost: number;
  recovered: number;
  triggerNote?: string;
};

export type UserHabit = {
  slug: HabitSlug;
  startedAt: string; // ISO
  pausedAt: string | null;
};

type HabitsState = {
  userHabits: UserHabit[];
  slipLogs: SlipLog[];

  // selectors
  isTracking: (slug: HabitSlug) => boolean;
  slipsToday: () => SlipLog[];
  slipsForHabit: (slug: HabitSlug) => SlipLog[];
  cleanStreakDays: (slug: HabitSlug) => number;

  // actions
  addHabit: (slug: HabitSlug) => void;
  removeHabit: (slug: HabitSlug) => void;
  pauseHabit: (slug: HabitSlug) => void;
  resumeHabit: (slug: HabitSlug) => void;
  logSlip: (slug: HabitSlug, opts?: { triggerNote?: string }) => SlipLog;
  recordRecovery: (slipId: string, xpRecovered: number) => void;
  reset: () => void;
};

function startOfDayISO(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / 86_400_000);
}

export const useHabitsStore = create<HabitsState>()(
  persist(
    (set, get) => ({
      userHabits: [],
      slipLogs: [],

      isTracking: (slug) =>
        get().userHabits.some((h) => h.slug === slug && h.pausedAt === null),

      slipsToday: () => {
        const today = startOfDayISO();
        return get().slipLogs.filter((s) => s.loggedAt >= today);
      },

      slipsForHabit: (slug) => get().slipLogs.filter((s) => s.habit === slug),

      cleanStreakDays: (slug) => {
        const slips = get().slipsForHabit(slug);
        if (slips.length === 0) {
          const habit = get().userHabits.find((h) => h.slug === slug);
          if (!habit) return 0;
          return daysBetween(new Date(), new Date(habit.startedAt));
        }
        // most recent slip
        const sorted = [...slips].sort((a, b) =>
          b.loggedAt.localeCompare(a.loggedAt),
        );
        const last = sorted[0]!;
        return daysBetween(new Date(), new Date(last.loggedAt));
      },

      addHabit: (slug) => {
        if (!HABITS[slug]) return;
        set((s) => {
          if (s.userHabits.some((h) => h.slug === slug)) return s;
          return {
            userHabits: [
              ...s.userHabits,
              { slug, startedAt: new Date().toISOString(), pausedAt: null },
            ],
          };
        });
      },

      removeHabit: (slug) =>
        set((s) => ({
          userHabits: s.userHabits.filter((h) => h.slug !== slug),
        })),

      pauseHabit: (slug) =>
        set((s) => ({
          userHabits: s.userHabits.map((h) =>
            h.slug === slug ? { ...h, pausedAt: new Date().toISOString() } : h,
          ),
        })),

      resumeHabit: (slug) =>
        set((s) => ({
          userHabits: s.userHabits.map((h) =>
            h.slug === slug ? { ...h, pausedAt: null } : h,
          ),
        })),

      logSlip: (slug, opts) => {
        const habit = HABITS[slug];
        if (!habit) throw new Error(`Unknown habit: ${slug}`);
        const slip: SlipLog = {
          id: `slip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          habit: slug,
          loggedAt: new Date().toISOString(),
          xpLost: habit.xpLossPerSlip,
          recovered: 0,
          triggerNote: opts?.triggerNote,
        };
        set((s) => ({ slipLogs: [slip, ...s.slipLogs] }));
        return slip;
      },

      recordRecovery: (slipId, xpRecovered) =>
        set((s) => ({
          slipLogs: s.slipLogs.map((log) =>
            log.id === slipId ? { ...log, recovered: xpRecovered } : log,
          ),
        })),

      reset: () => set({ userHabits: [], slipLogs: [] }),
    }),
    {
      name: "core.habits.v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
