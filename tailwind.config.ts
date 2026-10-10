import type { Config } from "tailwindcss";

/**
 * Loaded from globals.css via `@config`. Glass utilities live in globals.css.
 *
 * Every colour resolves to a CSS variable on :root (globals.css), so the
 * palette is defined once. The theme is "Maison": ivory paper, espresso ink,
 * antique gold. `dark.*` / `obsidian.*` are the canvas and surface scale (now
 * light); `mist.*` is the text scale (now espresso). The old names are kept so
 * existing components keep working. `ink` / `ivory` are the explicit pair for
 * overlays and text on dark CTAs.
 */
const v = (name: string) => `var(--${name})`;

const palette = {
  bg: v("bg"), // ivory canvas
  base: v("base"), // paper
  card: v("card"), // porcelain cards & elevated panels
  gold: v("gold"), // antique gold — accents, text-safe on ivory
  goldHover: v("gold-deep"),
  coral: v("coral"), // garnet — alerts & SOS express badges
  lavender: v("lavender"), // dusk plum — interactive accents
  success: v("success"), // emerald — trust badges, confirmations
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
        obsidian: { DEFAULT: palette.base, 950: palette.bg, 900: palette.base, 800: palette.card, 700: v("surface-700"), 600: v("surface-600") },
        champagne: { DEFAULT: palette.gold, 300: v("gold-soft"), 500: palette.gold, 700: palette.goldHover },
        tangerine: { DEFAULT: palette.coral, 300: v("coral-text"), 500: palette.coral, 700: v("coral-deep") },
        lavender: { DEFAULT: palette.lavender, 300: v("lavender-text"), 500: palette.lavender, 700: v("lavender-deep") },
        mint: { DEFAULT: palette.success, 300: v("success-text"), 500: palette.success, 700: v("success-deep") },
        mist: { DEFAULT: v("ink"), muted: v("ink-muted"), faint: v("ink-faint") },
        ink: v("ink"),
        ivory: v("ivory"),
      },
      fontFamily: {
        display: ["var(--font-serif)", "var(--font-clash)", "serif"], // editorial headlines
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-satoshi)", "sans-serif"], // readable UI + body
        sub: ["var(--font-sub)", "var(--font-satoshi)", "sans-serif"], // pricing chips, buttons
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"], // timers & ID numbers
      },
      backgroundImage: {
        "party-radial": "radial-gradient(circle at 50% 40%, rgba(255, 253, 248, 1) 0%, rgba(247, 242, 233, 1) 100%)",
        "glow-violet": "radial-gradient(circle at 80% 20%, rgba(214, 170, 160, 0.18) 0%, transparent 50%)",
        "glow-gold": "radial-gradient(circle at 20% 80%, rgba(201, 162, 87, 0.16) 0%, transparent 50%)",
        "gold-foil": "linear-gradient(135deg, #7A5520 0%, #C9A257 28%, #F1DFAE 48%, #B8893E 68%, #7A5520 100%)",
      },
      boxShadow: {
        "gold-glow": "0 10px 30px -12px rgba(138, 100, 39, 0.45)",
        "glass-highlight": "inset 0 1px 0 0 rgba(255, 255, 255, 0.9)",
        // Aliases used by existing components. On ivory a "glow" is a soft tinted drop shadow.
        "glow-gold": "0 10px 30px -12px rgba(138, 100, 39, 0.45)",
        "glow-coral": "0 10px 28px -12px rgba(168, 67, 59, 0.5)",
        "glow-lavender": "0 14px 40px -16px rgba(110, 83, 133, 0.45)",
        "glow-mint": "0 10px 26px -12px rgba(45, 115, 84, 0.4)",
        luxe: "0 1px 0 0 rgba(255, 255, 255, 0.9) inset, 0 0 0 1px rgba(138, 100, 39, 0.14), 0 24px 60px -32px rgba(60, 42, 18, 0.35)",
      },
      backdropBlur: { glass: "20px" },
      borderRadius: { glass: "1.75rem" },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        sheen: {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "100%": { transform: "translateX(220%) skewX(-20deg)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        sheen: "sheen 0.9s cubic-bezier(0.4,0,0.2,1)",
      },
    },
  },
  plugins: [],
};

export default config;
