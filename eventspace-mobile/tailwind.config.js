/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          audio: '#9333ea',
          task: '#2563eb',
          chaser: '#d97706',
          info: '#059669',
          picture: '#e11d48',
          note: '#475569',
        }
      }
    },
  },
  plugins: [],
}

