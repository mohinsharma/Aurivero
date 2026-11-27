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
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--color-elevated) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          light: 'rgb(var(--color-primary) / 0.10)',
        },
        secondary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          light: 'rgba(59, 130, 246, 0.12)',
        },
        profit: {
          DEFAULT: '#089981',
          hover: '#067D69',
          light: 'rgba(8, 153, 129, 0.12)',
        },
        loss: {
          DEFAULT: '#F23645',
          hover: '#D92B39',
          light: 'rgba(242, 54, 69, 0.12)',
        },
        warning: {
          DEFAULT: '#D97706',
          hover: '#B45309',
          light: 'rgba(217, 119, 6, 0.12)',
        },
        danger: {
          DEFAULT: '#F23645',
          hover: '#D92B39',
          light: 'rgba(242, 54, 69, 0.12)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          subtle: 'rgb(var(--color-elevated) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Inter', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', '"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        'serif-accent': ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        glow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        ticker: 'ticker 42s linear infinite',
      },
    },
  },
  plugins: [],
}
