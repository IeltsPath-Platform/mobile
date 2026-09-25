const { colors, fonts } = require('./src/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: colors.canvas,
        surface: colors.surface,
        tint: colors.surfaceTint,
        ink: colors.ink,
        muted: colors.muted,
        line: colors.line,
        edge: colors.edge,
        accent: {
          DEFAULT: colors.accent,
          deep: colors.accentDeep,
          soft: colors.accentSoft,
          edge: colors.accentEdge,
        },
        danger: {
          DEFAULT: colors.danger,
          soft: colors.dangerSoft,
        },
        success: {
          DEFAULT: colors.success,
          soft: colors.successSoft,
        },
        skill: colors.skill,
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
