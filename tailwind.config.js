/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"proxima-nova"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['"source-serif-pro"', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          navy: '#0b1c2d',
          navyDark: '#06101a',
          navyLight: '#142c44',
          crimson: '#ce1226',
          crimsonHover: '#a80c1d',
          crimsonLight: '#fde8ea',
          gold: '#ffde6a',
          goldHover: '#f5c842',
          goldLight: '#fef9e7',
          amber: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
