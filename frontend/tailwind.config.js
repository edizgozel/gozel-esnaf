/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kurumsal Gozel Software Renk Paleti
        corporate: {
          50: '#F0F5FA',
          100: '#E1EBF5',
          200: '#C2D7EB',
          300: '#94BCDE',
          400: '#5F9BCE',
          500: '#387DBE',
          600: '#2364A3',
          700: '#184F83',
          800: '#0F3A5D', // Ana kurumsal vurgu rengi (Petrol / Derin Lacivert)
          900: '#0A2942', // Koyu vurgu / hover
          950: '#051828',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          subtle: '#F1F5F9',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

