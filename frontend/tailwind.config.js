/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf9',
          100: '#ccfbf1',
          500: '#14b8a6', // Teal
          600: '#0d9488',
          700: '#0f766e',
        },
        cricket: {
          50: '#f6fee7',
          100: '#ecfcc9',
          500: '#84cc16', // Cricket grass green
          600: '#65a30d',
          700: '#4d7c0f',
        },
        dark: {
          bg: '#0b0f19',      // Deep dark blue-grey
          card: '#111827',    // slate-900/gray-900
          border: '#1f2937',  // gray-800
          text: '#f9fafb',    // gray-50
          muted: '#9ca3af',   // gray-400
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
