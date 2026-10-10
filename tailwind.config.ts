import type { Config } from "tailwindcss";

/**
 * Loaded from globals.css via `@config`. Glass utilities live in globals.css.
 *
 * `dark.*` and `celebration.*` are the canonical brand tokens. The older names
 * (`obsidian`, `champagne`, `tangerine`, `lavender`, `mint`, `mist`) are kept as
 * aliases of the same values so existing components keep working.
 */
const palette = {
  bg: "#050608", // canvas void
  base: "#0A0B10", // base dark
  card: "#12131C", // cards & elevated panels
  gold: "#F5D061", // primary champagne gold — buttons, high-tier features
  goldHover: "#E5BF4F",
  coral: "#FF5E5B", // active alerts & SOS express badges
  lavender: "#A78BFA", // interactive accents & backlights
  success: "#10B981", // trust badges, dietary, confirmations
} as const;

const config: Config = {
  // src/ layout — app/, components/ and lib/ all live under it.
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        dark: { bg: palette.bg, base: palette.base, card: palette.card },
        celebration: {
          gold: palette.gold,
          goldHover: palette.goldHover,
          coral: palette.coral,
          lavender: palette.lavender,
          success: palette.success,
        },

        // Aliases (same values) used throughout the existing UI.
        obsidian: { DEFAULT: palette.base, 950: palette.bg, 900: palette.base, 800: palette.card, 700: "#1C1E2B", 600: "#262938" },
        champagne: { DEFAULT: palette.gold, 300: "#F9E29A", 500: palette.gold, 700: palette.goldHover },
        tangerine: { DEFAULT: palette.coral, 300: "#FF918F", 500: palette.coral, 700: "#D93F3C" },
        lavender: { DEFAULT: palette.lavender, 300: "#C9B8FD", 500: palette.lavender, 700: "#7C5CE6" },
        mint: { DEFAULT: palette.success, 300: "#6EE7B7", 500: palette.success, 700: "#047857" },
        mist: { DEFAULT: "#F8FAFC", muted: "#94A3B8", faint: "#64748B" },
      },
      fontFamily: {
        display: ["var(--font-clash)", "sans-serif"], // headlines
        sans: ["var(--font-satoshi)", "sans-serif"], // readable UI + body
        sub: ["var(--font-sub)", "var(--font-satoshi)", "sans-serif"], // pricing chips, buttons
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"], // timers & ID numbers
      },
      backgroundImage: {
        "party-radial": "radial-gradient(circle at 50% 50%, rgba(30, 27, 75, 0.4) 0%, rgba(5, 6, 8, 1) 100%)",
        "glow-violet": "radial-gradient(circle at 80% 20%, rgba(167, 139, 250, 0.15) 0%, transparent 50%)",
        "glow-gold": "radial-gradient(circle at 20% 80%, rgba(245, 208, 97, 0.08) 0%, transparent 50%)",
      },
      boxShadow: {
        "gold-glow": "0 0 25px -5px rgba(245, 208, 97, 0.4)",
        "glass-highlight": "inset 0 1px 0 0 rgba(255, 255, 255, 0.12)",
        // Aliases used by existing components.
        "glow-gold": "0 0 25px -5px rgba(245, 208, 97, 0.4)",
        "glow-coral": "0 0 25px -5px rgba(255, 94, 91, 0.45)",
        "glow-lavender": "0 0 40px -6px rgba(167, 139, 250, 0.55)",
        "glow-mint": "0 0 22px -4px rgba(16, 185, 129, 0.4)",
      },
      backdropBlur: { glass: "20px" },
      borderRadius: { glass: "1.75rem" },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
