/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B1017',
        surface: '#141C25',
        'surface-elevated': '#1A2531',
        primary: {
          DEFAULT: '#45D6B5',
          hover: '#37bf9f',
          light: 'rgba(69, 214, 181, 0.12)',
        },
        secondary: {
          DEFAULT: '#78A9FF',
          hover: '#6196f0',
          light: 'rgba(120, 169, 255, 0.12)',
        },
        warning: {
          DEFAULT: '#F5B942',
          hover: '#e0a42e',
          light: 'rgba(245, 185, 66, 0.12)',
        },
        danger: {
          DEFAULT: '#F16D75',
          hover: '#dc555e',
          light: 'rgba(241, 109, 117, 0.12)',
        },
        text: {
          primary: '#F3F6F8',
          secondary: '#93A2B4',
          muted: '#5F7085',
        },
        border: {
          DEFAULT: '#223142',
          subtle: '#192634',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 20px -3px rgba(69, 214, 181, 0.3)',
      }
    },
  },
  plugins: [],
}
