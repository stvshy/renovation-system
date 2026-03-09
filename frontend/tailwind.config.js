/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#1173d4",
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        "dependable-blue": "#005A9C",
        "neutral-gray": "#6C757D",
        "vibrant-orange": "#FFA500",
        "off-white": "#F8F9FA",
        "text-dark": "#212529",
        "text-light": "#333333",
        accent: "#F39C12",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}