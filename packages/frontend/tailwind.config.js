/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          DEFAULT: '#25D366',
          dark: '#075E54',
          light: '#DCF8C6',
        },
      },
    },
  },
  plugins: [],
};
