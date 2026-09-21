import type { Config } from "tailwindcss";

/**
 * Sheaf palette. Hex literals (not var()) so Tailwind 3 opacity modifiers work.
 * The same values are mirrored as CSS custom properties in src/app/globals.css.
 *
 *   ink       #141518  charcoal text and primary actions
 *   canvas    #f6f5f1  warm off-white page
 *   surface   #ffffff  cards
 *   veil      #1d7a6f  the one accent: primary CTA, emphasis, focus
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // Variant classes are composed at runtime (`btn-${variant}`, `badge-${tone}`); keep them.
  safelist: [{ pattern: /^(btn|badge)-(primary|accent|secondary|ghost|danger|sm|lg|neutral|info|progress|success|warning)$/ }],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f5f1",
        surface: "#ffffff",
        field: "#efeeea",
        line: "#e3e1db",
        "line-strong": "#cfccc4",
        ink: "#141518",
        "ink-soft": "#585b63",
        "ink-faint": "#8b8e96",
        "on-ink": "#f7f6f2",
        veil: "#1d7a6f",
        "veil-deep": "#155e56",
        "veil-tint": "#e2f0ec",
        success: "#1f7a4d",
        "success-tint": "#e3f3e9",
        warning: "#9a6700",
        "warning-tint": "#fbf0d6",
        danger: "#b42318",
        "danger-tint": "#fbe6e3",
        info: "#3352c7",
        "info-tint": "#e6eafb",
        night: "#0f1012",
        "night-2": "#17181c",
        "night-line": "#2a2c33",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        panel: "18px",
        card: "14px",
        pill: "999px",
      },
      boxShadow: {
        raised: "0 1px 2px rgba(20,21,24,.05), 0 6px 16px -8px rgba(20,21,24,.14)",
        lifted: "0 2px 4px rgba(20,21,24,.05), 0 16px 32px -12px rgba(20,21,24,.24)",
        inset: "inset 0 1px 2px rgba(20,21,24,.07), inset 0 0 0 1px rgba(20,21,24,.05)",
        focus: "0 0 0 3px rgba(29,122,111,.28)",
      },
      maxWidth: { site: "1200px", wide: "1360px" },
      screens: { xs: "480px" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        pulse2: { "0%, 100%": { opacity: "1" }, "50%": { opacity: ".35" } },
        drift: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-up": "fade-up .55s cubic-bezier(.2,.8,.2,1) both",
        "fade-in": "fade-in .3s ease both",
        shimmer: "shimmer 1.6s linear infinite",
        pulse2: "pulse2 1.8s ease-in-out infinite",
        drift: "drift 60s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
