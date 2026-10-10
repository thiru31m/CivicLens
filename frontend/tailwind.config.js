/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfd',
          300: '#7cc2fb',
          400: '#36a2f7',
          500: '#0c85eb',
          600: '#0267c8',
          700: '#0252a2',
          800: '#064684',
          900: '#0b3b6d',
          950: '#072548',
        }
      }
    },
  },
  plugins: [],
}
