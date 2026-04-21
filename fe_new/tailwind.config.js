/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#155EEF',
        covered: '#0F9D7A',
        excluded: '#D64545',
        partial: '#C47F17',
        bg: '#F3F6FB',
        border: '#D7DFEA',
        panel: '#FFFFFF',
        ink: '#0B1120',
        muted: '#5B6475',
        accent: '#7C3AED',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(11, 17, 32, 0.07)',
        lift: '0 16px 40px rgba(21, 94, 239, 0.12)',
      },
      borderRadius: {
        xl2: '12px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.3s linear infinite',
        floatIn: 'floatIn 0.2s ease-out',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
