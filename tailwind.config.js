/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0f2942',
          navyDark: '#0a1d30',
          navyLight: '#183b5d',
          gold: '#f59e0b',
          goldHover: '#d97706',
          goldLight: '#fef3c7',
        }
      }
    },
  },
  plugins: [],
}
