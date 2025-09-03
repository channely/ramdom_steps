/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0a0a',
        'dark-surface': '#1a1a1a',
        'dark-border': '#2a2a2a',
        'accent-red': '#ef4444',
        'accent-yellow': '#eab308',
        'accent-green': '#22c55e',
        'accent-blue': '#3b82f6',
      }
    },
  },
  plugins: [],
}