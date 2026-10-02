/**
 * IELTS mobile tokens — aligned with FE classroom/site brand.
 * Source: frontend/src/styles/globals.css + practice.css
 */
const colors = {
  canvas: '#f8f9fc',
  surface: '#ffffff',
  surfaceTint: '#eef3ff',
  ink: '#202633',
  muted: '#77808e',
  line: '#e3e7ef',
  edge: '#e9edf4',
  // Primary = FE --classroom-primary
  accent: '#123ab5',
  accentDeep: '#0d2b8d',
  accentSoft: '#eef3ff',
  accentEdge: '#0d2b8d',
  // CTA / streak warm = FE --classroom-warning / site-orange
  accentWarm: '#ff7624',
  xp: '#ff7624',
  xpDeep: '#ff7100',
  danger: '#c2332b',
  dangerSoft: '#fdecea',
  success: '#13845a',
  successSoft: '#e6f5ee',
  heroStart: '#061c64',
  heroEnd: '#1647d6',
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
