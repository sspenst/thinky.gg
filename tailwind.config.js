module.exports = {
  content: [
    './components/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      width: {
        '112': '28rem',
      },
    },
  },
  plugins: [
    require('@headlessui/tailwindcss')
  ],
};
