import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces — deep teal-black, matching the ARGUS reference shell
        base: "rgb(var(--c-base) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        "line-strong": "rgb(var(--c-line-strong) / <alpha-value>)",
        // Text
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        dim: "rgb(var(--c-dim) / <alpha-value>)",
        faint: "rgb(var(--c-faint) / <alpha-value>)",
        // Semantic accents
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        pos: "rgb(var(--c-pos) / <alpha-value>)",
        neg: "rgb(var(--c-neg) / <alpha-value>)",
        warn: "rgb(var(--c-warn) / <alpha-value>)",
        info: "rgb(var(--c-info) / <alpha-value>)",
        ai: "rgb(var(--c-ai) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      letterSpacing: {
        widest: "0.18em",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        glow: "0 0 0 1px var(--accent-dim), 0 0 24px -8px var(--accent)",
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 32px -16px rgba(0,0,0,0.6)",
      },
      keyframes: {
        pulseSoft: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(220%)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        ticker: "ticker 40s linear infinite",
        sweep: "sweep 2.2s ease-in-out infinite",
        "rise-in": "riseIn 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
