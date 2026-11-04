/**
 * IELTSPath mobile palette: warm paper, ink, cobalt and marigold.
 * Mobile uses the shared owl/blue brand with a softer, more tactile native feel.
 */
const colors = {
  canvas: '#f5f3ed',
  surface: '#fffefa',
  surfaceTint: '#edf2fa',
  ink: '#182536',
  muted: '#647185',
  line: '#e2e4e3',
  edge: '#e9e8e1',
  accent: '#2867d8',
  accentDeep: '#1a4fae',
  accentSoft: '#e8f0ff',
  accentEdge: '#b9cff8',
  // CTA / streak warm = FE --classroom-warning / site-orange
  accentWarm: '#ef8b49',
  xp: '#e9a63b',
  xpDeep: '#a85c20',
  danger: '#bd4d43',
  dangerSoft: '#f9e9e5',
  success: '#39856a',
  successSoft: '#e3f1e9',
  community: {
    general: { foreground: '#1741a6', background: '#e9efff', border: '#c9d6ff' },
    question: { foreground: '#a92d49', background: '#fff0f2', border: '#ffd1d9' },
    discussion: { foreground: '#087448', background: '#e6f5ee', border: '#bce8d2' },
    writing: { foreground: '#6534a0', background: '#f3edff', border: '#ddccff' },
    speaking: { foreground: '#075c86', background: '#e8f6fc', border: '#bde7f6' },
    resources: { foreground: '#87540b', background: '#fff5df', border: '#f4dfaa' },
  },
  heroStart: '#193e77',
  heroEnd: '#3279d8',
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
