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
        background: 'rgb(var(--rgb-background) / <alpha-value>)',
        surface: 'rgb(var(--rgb-surface) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--rgb-surface-elevated) / <alpha-value>)',
        'surface-card': 'rgb(var(--rgb-surface-card) / <alpha-value>)',
        'subtle-green': 'rgb(var(--rgb-subtle-green) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--rgb-primary) / <alpha-value>)',
          hover: 'rgb(var(--rgb-primary-hover) / <alpha-value>)',
          light: 'rgb(var(--rgb-subtle-green) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--rgb-gold) / <alpha-value>)',
          hover: 'rgb(var(--rgb-gold-hover) / <alpha-value>)',
          light: 'rgb(var(--rgb-gold) / 0.14)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--rgb-secondary) / <alpha-value>)',
          hover: 'rgb(var(--rgb-secondary-hover) / <alpha-value>)',
          light: 'rgb(var(--rgb-secondary) / 0.12)',
        },
        warning: {
          DEFAULT: 'rgb(var(--rgb-warning) / <alpha-value>)',
          hover: 'rgb(var(--rgb-warning) / 0.85)',
          light: 'rgb(var(--rgb-warning) / 0.14)',
        },
        danger: {
          DEFAULT: 'rgb(var(--rgb-danger) / <alpha-value>)',
          hover: 'rgb(var(--rgb-danger) / 0.85)',
          light: 'rgb(var(--rgb-danger) / 0.14)',
        },
        text: {
          primary: 'rgb(var(--rgb-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--rgb-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--rgb-text-muted) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--rgb-border) / <alpha-value>)',
          subtle: 'rgb(var(--rgb-border-subtle) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        glass: 'var(--aurivero-shadow-glass)',
        glow: '0 4px 16px -2px rgb(var(--rgb-primary) / 0.22)',
        gold: '0 4px 16px -2px rgb(var(--rgb-gold) / 0.20)',
      }
    },
  },
  plugins: [],
}
