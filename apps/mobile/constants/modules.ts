import { StatSlug } from "./stats";

export type ModuleSlug =
  | "gym"
  | "food"
  | "sleep"
  | "health"
  | "skincare"
  | "style"
  | "mind"
  | "learning"
  | "relationships"
  | "money"
  | "career"
  | "discipline"
  | "routine"
  | "plan";

export type Module = {
  slug: ModuleSlug;
  label: string;
  description: string;
  primaryStat: StatSlug;
  secondaryStats: StatSlug[];
  primaryWeight: number;
  secondaryWeight: number;
  legacyStorageKeys: string[];
  port_priority: 1 | 2 | 3;
};

export const MODULES: Record<ModuleSlug, Module> = {
  gym: {
    slug: "gym",
    label: "Gym",
    description: "Strength and cardio training sessions.",
    primaryStat: "body",
    secondaryStats: ["willpower"],
    primaryWeight: 1.0,
    secondaryWeight: 0.3,
    legacyStorageKeys: ["coreGymSessions", "coreGymRoutine"],
    port_priority: 1,
  },
  food: {
    slug: "food",
    label: "Food",
    description: "Calorie and macro logging.",
    primaryStat: "body",
    secondaryStats: ["willpower", "wallet"],
    primaryWeight: 1.0,
    secondaryWeight: 0.25,
    legacyStorageKeys: ["coreFoodLog_"],
    port_priority: 1,
  },
  sleep: {
    slug: "sleep",
    label: "Sleep",
    description: "Hours slept vs target. Debt cascades to Brain.",
    primaryStat: "body",
    secondaryStats: ["brain"],
    primaryWeight: 1.0,
    secondaryWeight: 0.5,
    legacyStorageKeys: ["coreSleepLog_"],
    port_priority: 1,
  },
  health: {
    slug: "health",
    label: "Health",
    description: "Water, steps, weight. Activity feeds Lungs recovery.",
    primaryStat: "body",
    secondaryStats: ["lungs"],
    primaryWeight: 0.8,
    secondaryWeight: 0.3,
    legacyStorageKeys: ["coreHealthLog_"],
    port_priority: 1,
  },
  skincare: {
    slug: "skincare",
    label: "Skincare",
    description: "Routine adherence (AM/PM).",
    primaryStat: "body",
    secondaryStats: [],
    primaryWeight: 0.4,
    secondaryWeight: 0,
    legacyStorageKeys: ["coreSkincareLog_"],
    port_priority: 3,
  },
  style: {
    slug: "style",
    label: "Style",
    description: "Outfit tracking, fashion progression.",
    primaryStat: "body",
    secondaryStats: [],
    primaryWeight: 0.4,
    secondaryWeight: 0,
    legacyStorageKeys: ["coreStyleLog_"],
    port_priority: 3,
  },
  mind: {
    slug: "mind",
    label: "Mind",
    description: "Meditation, journaling, reflection.",
    primaryStat: "brain",
    secondaryStats: [],
    primaryWeight: 1.0,
    secondaryWeight: 0,
    legacyStorageKeys: ["coreMindLog_"],
    port_priority: 2,
  },
  learning: {
    slug: "learning",
    label: "Learning",
    description: "Daily learning time.",
    primaryStat: "brain",
    secondaryStats: ["willpower"],
    primaryWeight: 1.0,
    secondaryWeight: 0.3,
    legacyStorageKeys: ["coreLearningLog_"],
    port_priority: 2,
  },
  relationships: {
    slug: "relationships",
    label: "Relationships",
    description: "Check-ins with people who matter.",
    primaryStat: "brain",
    secondaryStats: ["willpower"],
    primaryWeight: 0.8,
    secondaryWeight: 0.3,
    legacyStorageKeys: ["coreRelationshipsLog_"],
    port_priority: 2,
  },
  money: {
    slug: "money",
    label: "Money",
    description: "Spending tracking, budget adherence.",
    primaryStat: "wallet",
    secondaryStats: ["willpower"],
    primaryWeight: 1.0,
    secondaryWeight: 0.4,
    legacyStorageKeys: ["coreMoneyLog_"],
    port_priority: 2,
  },
  career: {
    slug: "career",
    label: "Career",
    description: "Career goals, income, progression.",
    primaryStat: "wallet",
    secondaryStats: ["brain"],
    primaryWeight: 0.7,
    secondaryWeight: 0.3,
    legacyStorageKeys: ["coreCareerLog_"],
    port_priority: 3,
  },
  discipline: {
    slug: "discipline",
    label: "Discipline",
    description: "Cold showers, hard things, commitments kept.",
    primaryStat: "willpower",
    secondaryStats: [],
    primaryWeight: 1.0,
    secondaryWeight: 0,
    legacyStorageKeys: ["coreDiscLog_"],
    port_priority: 2,
  },
  routine: {
    slug: "routine",
    label: "Routine",
    description: "Morning/evening routine completion.",
    primaryStat: "willpower",
    secondaryStats: [],
    primaryWeight: 1.0,
    secondaryWeight: 0,
    legacyStorageKeys: ["coreRoutineDone_"],
    port_priority: 2,
  },
  plan: {
    slug: "plan",
    label: "Plan",
    description: "Daily task completion.",
    primaryStat: "willpower",
    secondaryStats: ["brain"],
    primaryWeight: 0.8,
    secondaryWeight: 0.3,
    legacyStorageKeys: ["corePlanDay_"],
    port_priority: 2,
  },
};

export const MODULE_LIST: Module[] = Object.values(MODULES);

/** Modules whose primary OR secondary stat == given stat. */
export function modulesForStat(stat: StatSlug): Module[] {
  return MODULE_LIST.filter(
    (m) => m.primaryStat === stat || m.secondaryStats.includes(stat),
  );
}

/** Modules whose primary stat == given stat. */
export function primaryModulesForStat(stat: StatSlug): Module[] {
  return MODULE_LIST.filter((m) => m.primaryStat === stat);
}
