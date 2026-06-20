/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        brand: 'var(--color-brand)',
        fg: 'var(--color-fg)',
        'fg-secondary': 'var(--color-fg-secondary)',
        'fg-muted': 'var(--color-fg-muted)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
      },
    },
  },
  plugins: [],
};
