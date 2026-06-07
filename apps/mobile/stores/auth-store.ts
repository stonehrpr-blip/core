import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Baseline = {
  sexAtBirth: "female" | "male" | "other" | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
};

export type Permissions = {
  notifications: boolean;
  camera: boolean;
  widget: boolean;
};

export type CoachTone = "gentle" | "balanced" | "direct" | "drill";
export type CheckinSlot = "morning" | "evening" | "both" | null;

export type TrialState = {
  committed: boolean;
  name: string;
  tone: CoachTone | null;
  checkin: CheckinSlot;
  trialStartedAt: string | null;
};

type AuthState = {
  userId: string | null;
  displayName: string | null;
  baseline: Baseline;
  permissions: Permissions;
  trial: TrialState;
  subscriptionActive: boolean;
  // CORE Plus is the cosmetic/perk membership (2× rewards, PLUS badge), kept
  // independent of billing's `subscriptionActive` so the two can diverge.
  corePlus: boolean;
  onboardedAt: string | null;
  lastSeenAt: string | null;

  // selectors
  hasOnboarded: () => boolean;
  trialExpired: () => boolean;
  trialDay: () => number;
  daysIdle: () => number;

  // actions
  setUser: (userId: string, displayName: string | null) => void;
  signOut: () => void;
  setBaseline: (b: Partial<Baseline>) => void;
  setPermission: (key: keyof Permissions, granted: boolean) => void;
  setTrial: (t: Partial<TrialState>) => void;
  startTrial: () => void;
  setSubscriptionActive: (active: boolean) => void;
  setCorePlus: (active: boolean) => void;
  touchLastSeen: () => void;
  completeOnboarding: () => void;
};

const EMPTY_BASELINE: Baseline = {
  sexAtBirth: null,
  ageYears: null,
  heightCm: null,
  weightKg: null,
};

const EMPTY_PERMISSIONS: Permissions = {
  notifications: false,
  camera: false,
  widget: false,
};

const EMPTY_TRIAL: TrialState = {
  committed: false,
  name: "",
  tone: null,
  checkin: null,
  trialStartedAt: null,
};

const TRIAL_DAYS = 7;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      displayName: null,
      baseline: EMPTY_BASELINE,
      permissions: EMPTY_PERMISSIONS,
      trial: EMPTY_TRIAL,
      subscriptionActive: false,
      corePlus: false,
      onboardedAt: null,
      lastSeenAt: null,

      hasOnboarded: () => get().onboardedAt !== null,

      trialExpired: () => {
        const s = get();
        if (s.subscriptionActive) return false;
        if (!s.trial.trialStartedAt) return false;
        const start = new Date(s.trial.trialStartedAt).getTime();
        const elapsedDays = (Date.now() - start) / (24 * 60 * 60 * 1000);
        return elapsedDays >= TRIAL_DAYS;
      },

      trialDay: () => {
        const s = get();
        if (!s.trial.trialStartedAt) return 0;
        const start = new Date(s.trial.trialStartedAt).getTime();
        return (Date.now() - start) / (24 * 60 * 60 * 1000);
      },

      daysIdle: () => {
        const last = get().lastSeenAt;
        if (!last) return 0;
        return (Date.now() - new Date(last).getTime()) / (24 * 60 * 60 * 1000);
      },

      setUser: (userId, displayName) => set({ userId, displayName }),

      signOut: () =>
        set({
          userId: null,
          displayName: null,
          baseline: EMPTY_BASELINE,
          permissions: EMPTY_PERMISSIONS,
          trial: EMPTY_TRIAL,
          subscriptionActive: false,
          corePlus: false,
          onboardedAt: null,
          lastSeenAt: null,
        }),

      setBaseline: (b) =>
        set((s) => ({ baseline: { ...s.baseline, ...b } })),

      setPermission: (key, granted) =>
        set((s) => ({
          permissions: { ...s.permissions, [key]: granted },
        })),

      setTrial: (t) =>
        set((s) => ({ trial: { ...s.trial, ...t } })),

      startTrial: () =>
        set((s) => ({ trial: { ...s.trial, trialStartedAt: new Date().toISOString() } })),

      setSubscriptionActive: (active) =>
        set({ subscriptionActive: active }),

      setCorePlus: (active) => set({ corePlus: active }),

      touchLastSeen: () =>
        set({ lastSeenAt: new Date().toISOString() }),

      completeOnboarding: () =>
        set({ onboardedAt: new Date().toISOString() }),
    }),
    {
      name: "core.auth.v1",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
