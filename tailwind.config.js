/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8f6',
          100: '#d5efe9',
          500: '#0f766e',
          700: '#0f5c56',
          900: '#134e4a',
        },
      },
    },
  },
  plugins: [],
};
