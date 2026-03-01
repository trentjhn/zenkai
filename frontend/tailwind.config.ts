import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "zen-gold":   "#F4D03F",
        "zen-void":   "#1A1B26",
        "zen-slate":  "#24283B",
        "zen-sakura": "#FF4D6D",
        "zen-plasma": "#7AA2F7",
        "zen-purple": "#9B8EC4",
        "zen-teal":   "#00D4C8",
      },
      fontFamily: {
        heading: ["Geist", "Satoshi", "sans-serif"],
        body:    ["Geist", "Satoshi", "sans-serif"],
        mono:    ["Geist Mono", "monospace"],
      },
      spacing: {
        ma: "24px",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: (u: object) => void }) {
      addUtilities({
        ".clipped-corners": {
          "clip-path": "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)",
        },
        ".clipped-corners-sm": {
          "clip-path": "polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)",
        },
      })
    },
  ],
}

export default config
