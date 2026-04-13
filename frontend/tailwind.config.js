/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#1a5c2e',
          deep: '#0f3a1c',
          light: '#2a7a42',
        },
        burgundy: {
          DEFAULT: '#8b1a2b',
          dark: '#5c101c',
          light: '#a82d3f',
        },
        gold: {
          DEFAULT: '#d4af37',
          dim: '#b8941f',
          bright: '#f0d060',
        },
        ivory: '#faf3e0',
        walnut: {
          DEFAULT: '#3d2914',
          mid: '#2a1c0e',
          light: '#5c4030',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'felt-radial':
          'radial-gradient(ellipse 120% 100% at 50% 45%, #2a7a42 0%, #1a5c2e 42%, #0f3a1c 100%)',
        'walnut-wood':
          'linear-gradient(145deg, rgba(61,41,20,0.95) 0%, rgba(42,28,14,0.98) 50%, rgba(30,20,10,1) 100%)',
        'gold-shine':
          'linear-gradient(120deg, transparent 0%, rgba(212,175,55,0.35) 45%, rgba(255,248,220,0.5) 50%, rgba(212,175,55,0.35) 55%, transparent 100%)',
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(212,175,55,0.5), 0 4px 24px rgba(0,0,0,0.45)',
        'gold-glow': '0 0 20px rgba(212,175,55,0.45), 0 0 40px rgba(212,175,55,0.15)',
        'inner-felt': 'inset 0 0 120px rgba(0,0,0,0.35)',
      },
      animation: {
        'pulse-gold': 'pulseGold 2.4s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        deal: 'deal 0.5s ease-out forwards',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(212,175,55,0.35)' },
          '50%': { boxShadow: '0 0 28px rgba(212,175,55,0.65)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        deal: {
          '0%': { opacity: '0', transform: 'translateY(40px) rotate(-8deg)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
};
