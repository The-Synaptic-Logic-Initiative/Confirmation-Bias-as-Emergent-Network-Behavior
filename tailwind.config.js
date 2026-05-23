module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./ConfirmationBias.jsx",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: "#080810",
        panel: "#16161f",
        border: "#2a2a3a",
        prior: "#a78bfa",
        confirming: "#fbbf24",
        contradicting: "#2dd4bf",
        conclusion: "#fb7185",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
}
