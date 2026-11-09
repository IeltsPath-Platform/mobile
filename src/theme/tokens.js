/**
 * IELTSPath mobile palette (light). Chunky, playful learning UI: one brand blue taken from the owl
 * mascot, semantic green / red / gold / orange, and a darker "shade" of each for 3D button edges.
 * The dark palette lives in `runtime.ts`.
 */
const colors = {
  canvas: '#f7f8fa',
  surface: '#ffffff',
  surfaceTint: '#eef2f7',
  ink: '#1b2733',
  muted: '#6b7785',
  line: '#e3e7ec',
  edge: '#cfd5dc',
  accent: '#1a73e8',
  accentDeep: '#1257b8',
  accentSoft: '#e5f0ff',
  accentEdge: '#a9c9f5',
  // Streak / CTA warm accent.
  accentWarm: '#ff9600',
  xp: '#ffc800',
  xpDeep: '#9a6200',
  danger: '#e5383b',
  dangerSoft: '#ffe8e8',
  success: '#2f9e44',
  successSoft: '#e3f7e3',
  community: {
    general: { foreground: '#1741a6', background: '#e9efff', border: '#c9d6ff' },
    question: { foreground: '#a92d49', background: '#fff0f2', border: '#ffd1d9' },
    discussion: { foreground: '#087448', background: '#e6f5ee', border: '#bce8d2' },
    writing: { foreground: '#6534a0', background: '#f3edff', border: '#ddccff' },
    speaking: { foreground: '#075c86', background: '#e8f6fc', border: '#bde7f6' },
    resources: { foreground: '#87540b', background: '#fff5df', border: '#f4dfaa' },
  },
  heroStart: '#1a4fb4',
  heroEnd: '#3b8cf0',
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
