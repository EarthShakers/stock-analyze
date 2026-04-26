/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0e17',
          card: '#111827',
          hover: '#182133',
        },
        accent: {
          DEFAULT: '#3b82f6',
          gold: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        border: {
          DEFAULT: '#1e293b',
        },
      },
    },
  },
  plugins: [],
};
