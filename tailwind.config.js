/** @type {import('tailwindcss').Config} */

// Same token bridge the super-admin panel uses, so both apps share one colour
// vocabulary. Every colour is a channel triplet in index.css, which keeps
// `<alpha-value>` working (`bg-surface/60`, `border-accent/30`) and lets light
// and dark swap in one place instead of needing a `dark:` variant per element.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        border: token('border'),
        'border-strong': token('border-strong'),

        text: token('text'),
        'text-muted': token('text-muted'),
        'text-subtle': token('text-subtle'),

        accent: token('accent'),
        'accent-hover': token('accent-hover'),
        'accent-soft': token('accent-soft'),
        'accent-fg': token('accent-fg'),

        success: token('success'),
        'success-soft': token('success-soft'),
        warning: token('warning'),
        'warning-soft': token('warning-soft'),
        danger: token('danger'),
        'danger-soft': token('danger-soft'),
        info: token('info'),
        'info-soft': token('info-soft'),

        'series-1': token('series-1'),
        'series-2': token('series-2'),
        'series-3': token('series-3'),
        'series-4': token('series-4'),
        grid: token('grid'),
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        // Matches the panel's shimmer so both apps load the same way.
        shimmer: 'shimmer 1.6s infinite',
      },
      boxShadow: {
        card: 'var(--shadow-sm)',
        raised: 'var(--shadow-md)',
        overlay: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};
