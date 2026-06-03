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
        primary: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        patho: {
          pink:   "#e879a0",
          purple: "#7c3aed",
          teal:   "#0d9488",
          amber:  "#d97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        shimmer: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.35)" },
          "50%":       { boxShadow: "0 0 0 7px rgba(249, 115, 22, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-4px)" },
        },
        "spin-once": {
          "0%":   { transform: "rotate(0deg) scale(1)" },
          "50%":  { transform: "rotate(180deg) scale(1.1)" },
          "100%": { transform: "rotate(360deg) scale(1)" },
        },
      },
      animation: {
        shimmer:    "shimmer 2.4s ease-in-out infinite",
        "fade-in":  "fade-in 0.2s ease-out forwards",
        "pulse-glow": "pulse-glow 2.2s ease-in-out infinite",
        float:      "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
