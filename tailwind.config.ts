// Merge `theme.extend` into your existing tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: { DEFAULT: '#F4EBDD', card: '#FFF9EF', line: '#E2D2BA', photo: '#D9C3A5' },
        bark: {
          DEFAULT: '#3B2A1E',
          deep: '#4A3122',
          muted: '#6B5342',
          field: '#CDB89A',
          soft: '#E9DAC3',
          off: '#D9CBB8',
          offink: '#5A4636',
        },
        ochre: { DEFAULT: '#C58A3D', chip: '#F3DCA8', ink: '#5E4008' },
        savanna: { chip: '#DDE3BF', ink: '#36421A' },
        brick: { chip: '#EBCABF', ink: '#6E2619' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
} satisfies Config;
