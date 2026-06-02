export type StatSlug = "lungs" | "brain" | "wallet" | "willpower" | "body";

export type Stat = {
  slug: StatSlug;
  label: string;
  icon: string;
  colorToken: string;
  description: string;
  tagline: string;
  decayPerDayWithoutSlip: number;
  recoveryPerCleanDay: number;
  startingValue: number;
};

export const STATS: Record<StatSlug, Stat> = {
  lungs: {
    slug: "lungs",
    label: "Lungs",
    icon: "lung",
    colorToken: "stat.lungs",
    description: "Capacity, recovery, and clarity of breath.",
    tagline: "Breathe · Rinse · Reset",
    decayPerDayWithoutSlip: 0,
    recoveryPerCleanDay: 1.2,
    startingValue: 60,
  },
  brain: {
    slug: "brain",
    label: "Brain",
    icon: "brain",
    colorToken: "stat.brain",
    description: "Focus, presence, dopamine regulation.",
    tagline: "Clarity · Calm · Focus",
    decayPerDayWithoutSlip: 0,
    recoveryPerCleanDay: 1.5,
    startingValue: 60,
  },
  wallet: {
    slug: "wallet",
    label: "Wallet",
    icon: "wallet",
    colorToken: "stat.wallet",
    description: "Financial restraint and intention.",
    tagline: "Earn · Save · Grow",
    decayPerDayWithoutSlip: 0,
    recoveryPerCleanDay: 1.0,
    startingValue: 60,
  },
  willpower: {
    slug: "willpower",
    label: "Willpower",
    icon: "flame",
    colorToken: "stat.willpower",
    description: "The flame. Burned by every slip, fed by every honest log.",
    tagline: "Discipline · Habits · Drive",
    decayPerDayWithoutSlip: 0,
    recoveryPerCleanDay: 1.0,
    startingValue: 60,
  },
  body: {
    slug: "body",
    label: "Body",
    icon: "person",
    colorToken: "stat.body",
    description: "Composition, vitality, movement.",
    tagline: "Move · Fuel · Recover",
    decayPerDayWithoutSlip: 0.2,
    recoveryPerCleanDay: 0.8,
    startingValue: 60,
  },
};

export const STAT_LIST: Stat[] = Object.values(STATS);

export const STAT_MAX = 100;
export const STAT_MIN = 0;
