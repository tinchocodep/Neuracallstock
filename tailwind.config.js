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
        // Custom colors based on screenshots (approximate)
        background: '#0f172a', // Dark blue/slate background
        surface: '#1e293b', // Lighter slate for cards
        primary: '#0ea5e9', // Sky blue
        secondary: '#64748b', // Slate gray
        success: '#10b981', // Emerald green
        danger: '#ef4444', // Red
        warning: '#f59e0b', // Amber
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
