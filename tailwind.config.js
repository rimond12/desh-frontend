/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        leaf: {
          green: '#16520A',
          light: '#22C55E',
          mid: '#2D7A1F',
        },
        earth: {
          brown: '#97542A',
          orange: '#E2670C',
          yellow: '#F8A514',
        },
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
