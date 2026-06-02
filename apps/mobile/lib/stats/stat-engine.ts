import { HABITS, HabitSlug } from "@/constants/habits";
import { MODULES, MODULE_LIST, ModuleSlug } from "@/constants/modules";
import { STAT_LIST, STAT_MAX, STAT_MIN, StatSlug } from "@/constants/stats";

/**
 * Inputs the engine needs to derive a stat value.
 * All inputs are observed state; the engine itself is pure.
 */
export type EngineInputs = {
  /** Today's module scores (0-100 each), e.g. { gym: 64, food: 80, sleep: 50 } */
  moduleScores: Partial<Record<ModuleSlug, number>>;
  /** Slips logged today, in order */
  slipsToday: { habit: HabitSlug; xpLost: number; recovered: number }[];
  /** Days since the user started — used for decay accumulation */
  daysActive: number;
  /** Optional baseline override (defaults to 60) */
  baseline?: number;
};

const DEFAULT_BASELINE = 60;
const PRIMARY_WEIGHT = 0.7;
const SECONDARY_WEIGHT = 0.3;

function clamp(n: number, min = STAT_MIN, max = STAT_MAX): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Weighted average of module scores for a stat.
 * Each module knows its own primary/secondary weight (from constants/modules.ts).
 */
function moduleContribution(
  stat: StatSlug,
  moduleScores: Partial<Record<ModuleSlug, number>>,
): { primary: number; secondary: number } {
  let primarySum = 0;
  let primaryWeightTotal = 0;
  let secondarySum = 0;
  let secondaryWeightTotal = 0;

  for (const module of MODULE_LIST) {
    const score = moduleScores[module.slug];
    if (score === undefined) continue;

    if (module.primaryStat === stat) {
      primarySum += score * module.primaryWeight;
      primaryWeightTotal += module.primaryWeight;
    } else if (module.secondaryStats.includes(stat)) {
      secondarySum += score * module.secondaryWeight;
      secondaryWeightTotal += module.secondaryWeight;
    }
  }

  return {
    primary: primaryWeightTotal > 0 ? primarySum / primaryWeightTotal : 0,
    secondary: secondaryWeightTotal > 0 ? secondarySum / secondaryWeightTotal : 0,
  };
}

/** Sum of XP lost today from habit slips that impact this stat. */
function habitImpactToday(stat: StatSlug, slips: EngineInputs["slipsToday"]): {
  lost: number;
  recovered: number;
} {
  let lost = 0;
  let recovered = 0;

  for (const slip of slips) {
    const habit = HABITS[slip.habit];
    if (!habit) continue;
    const affects =
      habit.primaryStatImpact === stat ||
      habit.secondaryStatImpacts.includes(stat);
    if (!affects) continue;

    // primary impact is full, secondary impact is half
    const multiplier = habit.primaryStatImpact === stat ? 1.0 : 0.5;
    lost += slip.xpLost * multiplier;
    recovered += slip.recovered * multiplier;
  }

  return { lost, recovered };
}

/** Compute the current value of a single stat. */
export function computeStatValue(stat: StatSlug, inputs: EngineInputs): number {
  const baseline = inputs.baseline ?? DEFAULT_BASELINE;
  const statDef = STAT_LIST.find((s) => s.slug === stat)!;

  const { primary, secondary } = moduleContribution(stat, inputs.moduleScores);
  const { lost, recovered } = habitImpactToday(stat, inputs.slipsToday);

  // Decay is per-day-without-slip, and accumulates if user is inactive.
  // For a simple v1 model, decay only kicks in when there's neither slip activity nor module data for this stat today.
  const hasActivity =
    primary > 0 || secondary > 0 || lost > 0 || recovered > 0;
  const decay = hasActivity ? 0 : statDef.decayPerDayWithoutSlip;

  const value =
    baseline +
    PRIMARY_WEIGHT * primary +
    SECONDARY_WEIGHT * secondary -
    lost +
    recovered -
    decay;

  return clamp(Math.round(value));
}

/** Compute all 5 stats at once — convenient for dashboards. */
export function computeAllStats(
  inputs: EngineInputs,
): Record<StatSlug, number> {
  const out: Partial<Record<StatSlug, number>> = {};
  for (const stat of STAT_LIST) {
    out[stat.slug] = computeStatValue(stat.slug, inputs);
  }
  return out as Record<StatSlug, number>;
}

/** Overall Life Score = average of the 5 stats. */
export function computeLifeScore(inputs: EngineInputs): number {
  const stats = computeAllStats(inputs);
  const values = Object.values(stats);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return clamp(Math.round(avg));
}

/**
 * Trend helper — compare today's stat to a previous value.
 * Returns positive/negative/zero with a magnitude.
 */
export type Trend = { delta: number; direction: "up" | "down" | "flat" };

export function trend(current: number, previous: number): Trend {
  const delta = current - previous;
  if (delta > 0) return { delta, direction: "up" };
  if (delta < 0) return { delta, direction: "down" };
  return { delta: 0, direction: "flat" };
}
