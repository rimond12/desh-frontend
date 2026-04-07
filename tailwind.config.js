/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#EFF9F4', 100: '#D6F5E3', 200: '#A8EFC0',
          300: '#5DD882', 400: '#34C961', 500: '#22A84B',
          600: '#1E9140', 700: '#1A7A35', 800: '#145C28',
          900: '#0D3B1A', 950: '#051A0A',
        },
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
        outfit: ['Montserrat', 'sans-serif'],
        jakarta: ['Nunito', 'sans-serif'],
        syne: ['Montserrat', 'sans-serif'],
        dm: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
