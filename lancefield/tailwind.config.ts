import type { Config } from "tailwindcss";

/**
 * Lancefield design tokens. Mirrored as CSS custom properties in src/app/globals.css.
 *
 *   paper   #F6F2E9  warm cream ground        ink    #16171A  text, rules, primary buttons
 *   moss    #1F5F45  the brand green: open, live, primary accent
 *   gilt    #C79A2E  prizes, wins, standings
 *   clay    #C94F3C  attention, destructive, judging
 *   slate   #5D6470  secondary text
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#F6F2E9", 2: "#EFEAE0", 3: "#E6E0D3" },
        ink: { DEFAULT: "#16171A", soft: "#3F4248", faint: "#8A8F98" },
        moss: { DEFAULT: "#1F5F45", deep: "#164634", tint: "#DCE9E1", ink: "#0F2E22" },
        gilt: { DEFAULT: "#C79A2E", deep: "#9C7620", tint: "#F3E6C7" },
        clay: { DEFAULT: "#C94F3C", deep: "#9E3B2C", tint: "#F5DCD6" },
        slate: { DEFAULT: "#5D6470", tint: "#E3E5E8" },
        line: { DEFAULT: "#D9D3C6", strong: "#B9B2A3" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 6.5vw, 5.5rem)", { lineHeight: "0.98", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.25rem, 4.5vw, 3.75rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.08", letterSpacing: "-0.015em" }],
        "display-sm": ["clamp(1.375rem, 2vw, 1.75rem)", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        eyebrow: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.12em" }],
      },
      borderRadius: { sm: "4px", DEFAULT: "8px", md: "12px", lg: "18px", xl: "28px", pill: "999px" },
      boxShadow: {
        paper: "0 1px 0 rgba(22,23,26,.06), 0 8px 24px -12px rgba(22,23,26,.18)",
        lift: "0 2px 0 rgba(22,23,26,.06), 0 18px 40px -16px rgba(22,23,26,.28)",
        inset: "inset 0 0 0 1px rgba(22,23,26,.08)",
      },
      maxWidth: { content: "72rem", prose: "42rem" },
      screens: { xs: "480px" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        wave: { "0%,100%": { transform: "skewY(0deg)" }, "50%": { transform: "skewY(-6deg)" } },
        drift: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.2,.8,.2,1) both",
        wave: "wave 2.4s ease-in-out infinite",
        drift: "drift 50s linear infinite",
      },
      transitionTimingFunction: { out: "cubic-bezier(.2,.8,.2,1)" },
    },
  },
  plugins: [],
};
export default config;
