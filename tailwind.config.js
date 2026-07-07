/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a10",
        panel: "#15151d",
        panel2: "#1c1c26",
        border: "rgba(255,255,255,0.08)",
        accent: "#8b5cf6",
        accent2: "#ec4899",
      },
      keyframes: {
        bounceDot: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        bounceDot: "bounceDot 1.2s infinite ease-in-out",
        fadeIn: "fadeIn 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
