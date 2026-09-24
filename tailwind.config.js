/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        coraline: {
          yellow: "#e8c848",
          yellowDark: "#d1b22a",
          blue: "#005cbf",
          blueLight: "#4db0c6",
          mist: "#b0b7bd",
          purple: "#2b1b60",
          blackBtn: "#111116",
          magenta: "#652f5f",
          orange: "#e29a36",
          green: "#a3c139",
        }
      }
    },
  },
  plugins: [],
}
