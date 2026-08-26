/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1B4332',
          dark: '#0F291E',
          darker: '#091A13',
          light: '#2D6A4F',
          soft: '#D8F3DC',
        },
        amber: {
          gold: '#E8A33D',
          goldHover: '#D4922D',
          light: 'rgba(232, 163, 61, 0.15)',
        },
        brique: {
          DEFAULT: '#B8442C',
          hover: '#9C3823',
          light: 'rgba(184, 68, 44, 0.12)',
        },
        cream: {
          DEFAULT: '#FBF7EF',
          card: '#F3ECE0',
          dark: '#EADECB',
          border: '#E2D5C3',
        },
        brand: {
          black: '#111111',
          card: '#1A1A1A',
          hover: '#242424',
          border: '#2A2A2A',
          orange: '#FF6B00',
          orangeHover: '#E56000',
          orangeLight: 'rgba(255, 107, 0, 0.15)',
          gold: '#FFD700',
          textMuted: '#9CA3AF',
        },
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-work-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        glow: '0 0 25px rgba(232, 163, 61, 0.35)',
        'glow-brique': '0 0 25px rgba(184, 68, 44, 0.35)',
        card: '0 10px 30px -10px rgba(27, 67, 50, 0.12)',
      },
    },
  },
  plugins: [],
}
