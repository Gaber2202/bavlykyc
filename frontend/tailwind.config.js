/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0a0a0a",
          50: "#1a1a1a",
          100: "#141414",
          200: "#0f0f0f",
        },
        gold: {
          50: "#fffdf5",
          100: "#fef7e0",
          200: "#f5e6c8",
          300: "#e8cf95",
          400: "#d4af37",
          500: "#c99700",
          600: "#a67c00",
          700: "#7a5c00",
          800: "#5c4500",
          900: "#3d2f00",
        },
      },
      fontFamily: {
        sans: ['"Noto Kufi Arabic"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
