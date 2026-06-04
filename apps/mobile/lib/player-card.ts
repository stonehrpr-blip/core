/**
 * Player-card derivations shared by the profile screen and the sync store.
 * Mirrors the formulas in previews/_lib/core-state.js so the RN card matches
 * the web preview exactly.
 */

/** Level from total XP — matches core-state.js levelFor: floor(xp/300)+1. */
export function levelFor(xp: number): number {
  return Math.floor(Math.max(0, xp) / 300) + 1;
}

/**
 * CORE Power — core-state.js:516.
 *   level*100 + xp + streak*25 + items*50 + achievements*75 + friends*30
 * RN has no inventory/achievements model yet, so items/achievements default 0
 * (see plan Phase 6 — derived achievements are a follow-up).
 */
export function corePower(args: {
  xp: number;
  streakDays: number;
  friends?: number;
  items?: number;
  achievements?: number;
}): number {
  const level = levelFor(args.xp);
  return (
    level * 100 +
    args.xp +
    args.streakDays * 25 +
    (args.items ?? 0) * 50 +
    (args.achievements ?? 0) * 75 +
    (args.friends ?? 0) * 30
  );
}

/** Public card shape returned by the lookup_player_by_code / list_friend_cards RPCs. */
export type PublicCard = {
  id: string;
  player_id: string;
  display_name: string | null;
  class: string;
  title: string;
  frame: string;
  level: number;
  xp: number;
  streak_days: number;
  power: number;
};

export type FriendCard = PublicCard & {
  status: "pending" | "accepted" | "blocked";
  initiated_by_me: boolean;
};
