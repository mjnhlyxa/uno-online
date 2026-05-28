/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'uno-red': '#E41E26',
        'uno-red-light': '#ff6b6b',
        'uno-red-dark': '#c0181f',
        'uno-yellow': '#F9E000',
        'uno-yellow-light': '#fff176',
        'uno-yellow-dark': '#c7b800',
        'uno-green': '#00A84F',
        'uno-green-light': '#69f0ae',
        'uno-green-dark': '#007d3a',
        'uno-blue': '#0072CE',
        'uno-blue-light': '#64b5f6',
        'uno-blue-dark': '#0057a3',
        'bg-page': '#0d1117',
        'bg-surface': '#161b22',
        'bg-elevated': '#21262d',
        'bg-hover': '#30363d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}