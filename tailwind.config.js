/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#07070B', 900: '#0B0B12', 800: '#12121C', 700: '#1B1B28', 600: '#2A2A3B' },
        mist: { DEFAULT: '#E9E9F2', 400: '#A3A3B8', 500: '#6E6E85' },
        neon: { cyan: '#3DF5FF', magenta: '#FF3DCB', lime: '#B6FF3D', amber: '#FFB23D' },
      },
      fontFamily: {
        mono: ['SpaceMono'],
      },
    },
  },
  plugins: [],
};
