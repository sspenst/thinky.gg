module.exports = {
  content: [
    './components/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  plugins: [
    require('@headlessui/tailwindcss')
  ],
  theme: {
    extend: {
      flexBasis: {
        '22': '5.5rem',
      },
      width: {
        '22': '5.5rem',
        '100': '25rem',
        '112': '28rem',
      },
    },
  },
};
