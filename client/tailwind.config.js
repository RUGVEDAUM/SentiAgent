/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        positive: { light: '#d1fae5', DEFAULT: '#10b981', dark: '#065f46' },
        neutral_: { light: '#e5e7eb', DEFAULT: '#6b7280', dark: '#374151' },
        negative: { light: '#fee2e2', DEFAULT: '#ef4444', dark: '#7f1d1d' },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      boxShadow: {
        glow:      '0 0 20px -5px rgba(99,102,241,0.5)',
        'glow-lg': '0 0 40px -10px rgba(99,102,241,0.6)',
        'glow-green': '0 0 20px -5px rgba(16,185,129,0.4)',
        'glow-red':   '0 0 20px -5px rgba(239,68,68,0.4)',
        glass:     '0 8px 32px rgba(0,0,0,0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e293b 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
