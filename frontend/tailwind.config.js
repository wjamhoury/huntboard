/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      // Safe area insets for iOS notch/home indicator
      padding: {
        'safe-area-t': 'env(safe-area-inset-top)',
        'safe-area-b': 'env(safe-area-inset-bottom)',
        'safe-area-l': 'env(safe-area-inset-left)',
        'safe-area-r': 'env(safe-area-inset-right)',
      },
      height: {
        'safe-area-b': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
