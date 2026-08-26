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
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        glow: '0 0 25px rgba(255, 107, 0, 0.35)',
        'glow-lg': '0 0 40px rgba(255, 107, 0, 0.5)',
        card: '0 10px 30px -10px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
}
