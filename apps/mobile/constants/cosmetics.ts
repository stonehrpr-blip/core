/**
 * Cosmetics catalog — ported from previews/23-profile.html.
 *
 * Titles + profile-frame swatches the player can equip on their card. Selection
 * lives in profile-sync-store and syncs to profiles.title / profiles.frame.
 *
 * The "Streak" frame is gated (earned via streak rewards) and is appended to the
 * base set only when unlocked — see FRAME_KEYS vs FRAMES.
 */

export const TITLES = [
  "First Step",
  "Quest Starter",
  "Focused",
  "Disciplined",
  "Unbreakable",
] as const;
export type Title = (typeof TITLES)[number];

export type FrameDef = { sw: string };

// Full frame catalog incl. the gated "Streak" border. `sw` is the ring/glow tint.
export const FRAMES: Record<string, FrameDef> = {
  Default: { sw: "#6b7280" },
  Blue: { sw: "#4A8FFF" },
  Gold: { sw: "#FFD24D" },
  Crystal: { sw: "#5eead4" },
  Aurora: { sw: "#9b8cff" },
  CORE: { sw: "#E6F0FF" },
  Streak: { sw: "#FF8A3D" },
};

// Base (always-available) frames. "Streak" is appended at runtime when unlocked.
export const FRAME_KEYS = ["Default", "Blue", "Gold", "Crystal", "Aurora", "CORE"];

export const DEFAULT_TITLE: Title = TITLES[0];
export const DEFAULT_FRAME = "Default";
export const DEFAULT_CLASS = "warrior";

export const CLASSES = ["warrior", "mage", "ranger", "sage"] as const;
export type PlayerClass = (typeof CLASSES)[number];

/** Title-case a class slug for display ("warrior" → "Warrior"). */
export function classLabel(c: string): string {
  return c.replace(/^\w/, (m) => m.toUpperCase());
}

/** Resolve a frame's swatch colour, always returning a string (falls back to Default). */
export function frameSwatch(frame: string): string {
  return (FRAMES[frame] ?? FRAMES[DEFAULT_FRAME])?.sw ?? "#6b7280";
}
