const { fonts } = require('./src/theme/tokens');

function channel(name) {
  return `rgb(var(--c-${name}) / <alpha-value>)`;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: channel('canvas'),
        surface: channel('surface'),
        tint: channel('tint'),
        ink: channel('ink'),
        muted: channel('muted'),
        line: channel('line'),
        edge: channel('edge'),
        accent: {
          DEFAULT: channel('accent'),
          deep: channel('accent-deep'),
          soft: channel('accent-soft'),
          edge: channel('accent-edge'),
        },
        xp: {
          DEFAULT: channel('xp'),
          deep: channel('xp-deep'),
        },
        danger: {
          DEFAULT: channel('danger'),
          soft: channel('danger-soft'),
        },
        success: {
          DEFAULT: channel('success'),
          soft: channel('success-soft'),
        },
        skill: require('./src/theme/tokens').colors.skill,
      },
      fontSize: {
        xs: ['calc(var(--font-scale, 1) * 0.75rem)', { lineHeight: 'calc(var(--font-scale, 1) * 1rem)' }],
        sm: ['calc(var(--font-scale, 1) * 0.875rem)', { lineHeight: 'calc(var(--font-scale, 1) * 1.25rem)' }],
        base: ['calc(var(--font-scale, 1) * 1rem)', { lineHeight: 'calc(var(--font-scale, 1) * 1.5rem)' }],
        lg: ['calc(var(--font-scale, 1) * 1.125rem)', { lineHeight: 'calc(var(--font-scale, 1) * 1.75rem)' }],
        xl: ['calc(var(--font-scale, 1) * 1.25rem)', { lineHeight: 'calc(var(--font-scale, 1) * 1.75rem)' }],
        '2xl': ['calc(var(--font-scale, 1) * 1.5rem)', { lineHeight: 'calc(var(--font-scale, 1) * 2rem)' }],
        '3xl': ['calc(var(--font-scale, 1) * 1.875rem)', { lineHeight: 'calc(var(--font-scale, 1) * 2.25rem)' }],
        '4xl': ['calc(var(--font-scale, 1) * 2.25rem)', { lineHeight: 'calc(var(--font-scale, 1) * 2.5rem)' }],
      },
      fontFamily: {
        body: [fonts.regular],
        'body-medium': [fonts.medium],
        'body-semibold': [fonts.semibold],
        'body-bold': [fonts.bold],
        'body-extrabold': [fonts.extrabold],
        'body-black': [fonts.black],
      },
    },
  },
  plugins: [],
};
