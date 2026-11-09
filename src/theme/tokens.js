/**
 * IELTSPath mobile palette (light). Chunky, playful learning UI: one brand blue taken from the owl
 * mascot, semantic green / red / gold / orange, and a darker "shade" of each for 3D button edges.
 * The dark palette lives in `runtime.ts`.
 */
const colors = {
  canvas: '#ffffff',
  surface: '#ffffff',
  surfaceTint: '#f1f5fb',
  ink: '#16233a',
  muted: '#64748b',
  line: '#e4e9f1',
  edge: '#d3dbe7',
  accent: '#1d86f5',
  accentDeep: '#1459b8',
  accentSoft: '#e8f3ff',
  accentEdge: '#b7d6fb',
  // Streak / CTA warm accent.
  accentWarm: '#ff9600',
  xp: '#ffc800',
  xpDeep: '#9a6200',
  danger: '#e5383b',
  dangerSoft: '#ffe8e8',
  success: '#2fa84a',
  successSoft: '#e5f7e8',
  community: {
    general: { foreground: '#1741a6', background: '#e9efff', border: '#c9d6ff' },
    question: { foreground: '#a92d49', background: '#fff0f2', border: '#ffd1d9' },
    discussion: { foreground: '#087448', background: '#e6f5ee', border: '#bce8d2' },
    writing: { foreground: '#6534a0', background: '#f3edff', border: '#ddccff' },
    speaking: { foreground: '#075c86', background: '#e8f6fc', border: '#bde7f6' },
    resources: { foreground: '#87540b', background: '#fff5df', border: '#f4dfaa' },
  },
  heroStart: '#2169dc',
  heroEnd: '#4ea6ff',
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
