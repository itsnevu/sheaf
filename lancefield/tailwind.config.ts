import type { Config } from "tailwindcss";

/**
 * Lancefield design tokens. Mirrored as CSS custom properties in src/app/globals.css.
 *
 * The arena theme: a near-black ground with light text, one bright green and one gold.
 *
 *   paper   #0A0F0C  page ground              ink    #F2EFE6  text, rules, light panels
 *   moss    #35C77E  the brand green: open, live, links, primary accent
 *   gilt    #E5B43C  prizes, wins, standings, primary CTAs
 *   clay    #F08A24  attention, destructive, judging
 *   slate   #8E8A7E  secondary text, withdrawn state
 *
 * Token names are stable; only the values changed when the theme went dark.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#0A0F0C", 2: "#10171A", 3: "#1B2327" },
        ink: { DEFAULT: "#F2EFE6", soft: "#C9C4B6", faint: "#8E8A7E" },
        moss: { DEFAULT: "#35C77E", deep: "#1F5F45", tint: "#12302A", ink: "#DFF7EA" },
        gilt: { DEFAULT: "#E5B43C", deep: "#F1DDA0", tint: "#3A2E10" },
        clay: { DEFAULT: "#F08A24", deep: "#FFC58A", tint: "#3A2410" },
        slate: { DEFAULT: "#8E8A7E", tint: "#1E2427" },
        line: { DEFAULT: "#2E3538", strong: "#3E474B" },
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
        paper: "0 1px 0 rgba(0,0,0,.35), 0 8px 24px -12px rgba(0,0,0,.45)",
        lift: "0 2px 0 rgba(0,0,0,.4), 0 18px 40px -16px rgba(0,0,0,.6)",
        inset: "inset 0 0 0 1px rgba(255,255,255,.04)",
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
