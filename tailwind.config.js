/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090D12',
        surface: '#101720',
        'surface-elevated': '#151F29',
        'surface-card': '#192530',
        primary: {
          DEFAULT: '#31B89A',
          hover: '#29A287',
          light: 'rgba(49, 184, 154, 0.12)',
        },
        gold: {
          DEFAULT: '#C9A96E',
          hover: '#D8BA82',
          light: 'rgba(201, 169, 110, 0.14)',
        },
        secondary: {
          DEFAULT: '#50D6BD',
          hover: '#3EC4AB',
          light: 'rgba(80, 214, 189, 0.12)',
        },
        warning: {
          DEFAULT: '#D9A441',
          hover: '#C49032',
          light: 'rgba(217, 164, 65, 0.14)',
        },
        danger: {
          DEFAULT: '#E0636B',
          hover: '#CC5058',
          light: 'rgba(224, 99, 107, 0.14)',
        },
        text: {
          primary: '#F3F1EB',
          secondary: '#A5B0BB',
          muted: '#718091',
        },
        border: {
          DEFAULT: '#1F2D3B',
          subtle: '#16212C',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        glass: '0 12px 36px 0 rgba(0, 0, 0, 0.48)',
        glow: '0 0 22px -4px rgba(49, 184, 154, 0.28)',
        gold: '0 0 24px -4px rgba(201, 169, 110, 0.25)',
      }
    },
  },
  plugins: [],
}
