module.exports = {
  content: [
    './components/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      width: {
        '100': '25rem',
        '112': '28rem',
      },
    },
  },
  plugins: [
    require('@headlessui/tailwindcss')
  ],
};
