import { StatSlug } from "./stats";

export type HabitSlug =
  | "vape"
  | "doomscroll"
  | "drink"
  | "spend"
  | "porn"
  | "junk_food"
  | "weed"
  | "nicotine_pouch";

export type Habit = {
  slug: HabitSlug;
  label: string;
  shortLabel: string;
  metaphor: "smoke" | "melt" | "darken" | "drain" | "glitch" | "bloat" | "haze" | "hum";
  primaryStatImpact: StatSlug;
  secondaryStatImpacts: StatSlug[];
  xpLossPerSlip: number;
  soundKey: string;
  description: string;
};

export const HABITS: Record<HabitSlug, Habit> = {
  vape: {
    slug: "vape",
    label: "Vaping",
    shortLabel: "Vape",
    metaphor: "smoke",
    primaryStatImpact: "lungs",
    secondaryStatImpacts: ["willpower"],
    xpLossPerSlip: 25,
    soundKey: "exhale",
    description: "Each puff darkens your lungs and chips away at your willpower.",
  },
  doomscroll: {
    slug: "doomscroll",
    label: "Doom-scrolling",
    shortLabel: "Scroll",
    metaphor: "melt",
    primaryStatImpact: "brain",
    secondaryStatImpacts: ["willpower"],
    xpLossPerSlip: 15,
    soundKey: "static",
    description: "Mindless scrolling melts your focus and dims your willpower flame.",
  },
  drink: {
    slug: "drink",
    label: "Drinking",
    shortLabel: "Drink",
    metaphor: "darken",
    primaryStatImpact: "body",
    secondaryStatImpacts: ["willpower"],
    xpLossPerSlip: 30,
    soundKey: "pour",
    description: "Each drink tints your body stat and weakens recovery.",
  },
  spend: {
    slug: "spend",
    label: "Impulse spending",
    shortLabel: "Spend",
    metaphor: "drain",
    primaryStatImpact: "wallet",
    secondaryStatImpacts: ["willpower"],
    xpLossPerSlip: 20,
    soundKey: "coin",
    description: "Coins fly out of your wallet — and your willpower follows.",
  },
  porn: {
    slug: "porn",
    label: "Porn",
    shortLabel: "Porn",
    metaphor: "glitch",
    primaryStatImpact: "willpower",
    secondaryStatImpacts: ["brain"],
    xpLossPerSlip: 25,
    soundKey: "buzz",
    description: "Glitches your willpower flame and dulls dopamine sensitivity.",
  },
  junk_food: {
    slug: "junk_food",
    label: "Junk food",
    shortLabel: "Junk",
    metaphor: "bloat",
    primaryStatImpact: "body",
    secondaryStatImpacts: ["willpower"],
    xpLossPerSlip: 15,
    soundKey: "crunch",
    description: "Bloats your body avatar — a momentary spike, a long crash.",
  },
  weed: {
    slug: "weed",
    label: "Weed",
    shortLabel: "Weed",
    metaphor: "haze",
    primaryStatImpact: "lungs",
    secondaryStatImpacts: ["brain", "willpower"],
    xpLossPerSlip: 25,
    soundKey: "exhale",
    description: "Smoke and haze layer across your lungs and brain.",
  },
  nicotine_pouch: {
    slug: "nicotine_pouch",
    label: "Nicotine pouch",
    shortLabel: "Pouch",
    metaphor: "hum",
    primaryStatImpact: "willpower",
    secondaryStatImpacts: ["lungs"],
    xpLossPerSlip: 15,
    soundKey: "hum",
    description: "Quiet hum of dependency — lungs decay slower, willpower drains faster.",
  },
};

export const HABIT_LIST: Habit[] = Object.values(HABITS);
