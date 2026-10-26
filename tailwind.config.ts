import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#0a0a0a",
          50: "#1a1a1a",
          100: "#2a2a2a",
          200: "#3a3a3a",
          300: "#4a4a4a",
          400: "#6a6a6a",
          500: "#8a8a8a",
          600: "#aaaaaa",
          700: "#cccccc",
          800: "#e0e0e0",
          900: "#f0f0f0",
        },
        surface: {
          DEFAULT: "#0a0a0a",
          light: "#111111",
          card: "rgba(255,255,255,0.03)",
          hover: "rgba(255,255,255,0.06)",
          border: "rgba(255,255,255,0.06)",
        },
        primary: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        premium: {
          gold: "#f59e0b",
          green: "#10b981",
          coral: "#ef4444",
          blue: "#3b82f6",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        display: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0,0,0,0.5)",
        "glass-sm": "0 4px 16px 0 rgba(0,0,0,0.3)",
        glow: "0 0 24px rgba(245,158,11,0.15)",
        "glow-gold": "0 0 24px rgba(245,158,11,0.3)",
        "glow-lg": "0 0 40px rgba(245,158,11,0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "fade-in-fast": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-up-sm": "slideUpSm 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.25s ease-out",
        float: "float 3s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUpSm: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
