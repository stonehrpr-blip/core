export const colors = {
  bg: {
    primary: "#050507",
    surface: "#0E0F14",
    elevated: "#1A1C24",
  },
  border: "#2A2E3A",
  text: {
    primary: "#F5F7FB",
    muted: "#8A92A6",
    dim: "#4A5060",
  },
  stat: {
    lungs: "#FF6BAA",
    brain: "#B388FF",
    wallet: "#FFD05C",
    willpower: "#FF7A45",
    body: "#5CE1E6",
  },
  status: {
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    info: "#60A5FA",
  },
  decay: "#3A3D4A",
} as const;

export const motion = {
  micro: 150,
  standard: 250,
  large: 400,
  smokeLifeMs: 1800,
  statDecayMs: 600,
  streakBreakMs: 800,
} as const;

export const spacing = {
  px: 1,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;
