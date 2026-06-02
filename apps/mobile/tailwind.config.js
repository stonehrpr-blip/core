/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./constants/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#050507",
          surface: "#0E0F14",
          elevated: "#1A1C24",
        },
        border: {
          DEFAULT: "#2A2E3A",
        },
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
      },
      fontFamily: {
        display: ["SpaceGrotesk", "system-ui"],
        body: ["Inter", "system-ui"],
        mono: ["JetBrainsMono", "monospace"],
      },
    },
  },
  plugins: [],
};
