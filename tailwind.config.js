// Colours are CSS variables so each tab ("world") can repaint everything
// below it: Home is cream paper, Hiking is sage, Night out is burgundy.
// The values live in src/components/ui/theme.ts.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  // The app sets its own light/dark per tab (see theme.ts), so dark mode is never
  // driven by the OS media query; NativeWind needs 'class' to allow that.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        card: token('card'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        chip: token('chip'),
        accent: token('accent'),
        'on-accent': token('on-accent'),
        alert: token('alert'),
        // Fixed brand colours, same in every world.
        forest: '#3F5A48',
        ember: '#E2703A',
        rose: '#E8577C',
        wine: '#5C1428',
        sage: '#D9E2CF',
        blush: '#F0D4D2',
      },
      fontFamily: {
        display: ['Newsreader_600SemiBold'],
        'display-italic': ['Newsreader_500Medium_Italic'],
        sans: ['DMSans_400Regular'],
        'sans-medium': ['DMSans_500Medium'],
        'sans-semibold': ['DMSans_600SemiBold'],
        mono: ['DMMono_400Regular'],
      },
    },
  },
  plugins: [],
};
