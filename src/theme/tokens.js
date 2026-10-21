/**
 * IELTS mobile tokens — aligned with FE classroom/site brand.
 * Source: frontend/src/styles/globals.css + practice.css
 */
const colors = {
  canvas: '#f6f7fb',
  surface: '#ffffff',
  surfaceTint: '#eef3ff',
  ink: '#202a3a',
  muted: '#697586',
  line: '#e5eaf2',
  edge: '#edf1f6',
  // Primary = FE --classroom-primary
  accent: '#3159c8',
  accentDeep: '#2448ad',
  accentSoft: '#edf2ff',
  accentEdge: '#1f3f9e',
  // CTA / streak warm = FE --classroom-warning / site-orange
  accentWarm: '#f28a4b',
  xp: '#f28a4b',
  xpDeep: '#d96d2f',
  danger: '#c2332b',
  dangerSoft: '#fdecea',
  success: '#13845a',
  successSoft: '#e6f5ee',
  heroStart: '#183477',
  heroEnd: '#4269d4',
  skill: {
    listening: '#0e44cf',
    reading: '#ff7624',
    writing: '#c2332b',
    speaking: '#13845a',
    full: '#123ab5',
  },
};

const fonts = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
  extrabold: 'BeVietnamPro_800ExtraBold',
  black: 'BeVietnamPro_900Black',
};

module.exports = { colors, fonts };
