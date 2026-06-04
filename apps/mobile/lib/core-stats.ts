/**
 * core-stats — the six RPG "Core Stats" shown on the profile, derived from the
 * five habit-driven game-state stats + social graph. Mirrors CORE_STATS in
 * previews/23-profile.html so the app and the preview read identically:
 *
 *   Strength ← body      Focus ← brain       Wealth ← wallet
 *   Health   ← lungs      Purpose ← willpower (+ streak)
 *   Social   ← friends (no habit stat backs it; grows with the social graph)
 *
 * This is a DISPLAY layer — it intentionally does NOT add a 6th key to the
 * game-state Stats type (social isn't lowered by slips, so it doesn't belong in
 * the habit-decay model). The persisted 6th `social` slug (migrations 0004/0005)
 * is for cross-device sync, not local mechanics.
 */
import type { Stats, StatKey } from "@/stores/game-state-store";

export type CoreStat = {
  key: string;
  name: string;
  emoji: string;
  color: string;
  value: number;
  blurb: string; // what the stat means
  tip: string; // how to raise it
  model: StatKey | null; // backing game-state stat (null = derived, e.g. Social)
};

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function coreStats(stats: Stats, ctx: { friends: number; streakDays: number }): CoreStat[] {
  return [
    { key: "strength", name: "Strength", emoji: "⚔️", color: "#FF6B6B", value: clamp(stats.body), model: "body",
      blurb: "Train your body and push your physical limits.", tip: "Log workouts and physical quests to build Strength." },
    { key: "focus", name: "Focus", emoji: "🧠", color: "#4A8FFF", value: clamp(stats.brain), model: "brain",
      blurb: "Deep work, learning and sharp attention.", tip: "Deep work and learning quests sharpen your Focus." },
    { key: "wealth", name: "Wealth", emoji: "💰", color: "#FFC56B", value: clamp(stats.wallet), model: "wallet",
      blurb: "Earn, save and build your resources.", tip: "Save, earn and clear money quests to grow Wealth." },
    { key: "health", name: "Health", emoji: "❤️", color: "#34D399", value: clamp(stats.lungs), model: "lungs",
      blurb: "Recovery, sleep, nutrition and breath.", tip: "Sleep, breathe and recover — health quests raise this." },
    { key: "social", name: "Social", emoji: "👥", color: "#B388FF", value: clamp(ctx.friends * 4), model: null,
      blurb: "Connection, relationships and community.", tip: "Add friends and finish social quests to level up." },
    { key: "purpose", name: "Purpose", emoji: "🎯", color: "#5EEAD4", value: clamp(stats.willpower + ctx.streakDays), model: "willpower",
      blurb: "Discipline, meaning and direction.", tip: "Hold your streak and complete daily quests for Purpose." },
  ];
}

export function coreStatAvg(items: CoreStat[]): number {
  if (!items.length) return 0;
  return Math.round(items.reduce((a, s) => a + s.value, 0) / items.length);
}
