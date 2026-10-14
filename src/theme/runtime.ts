import { vars } from 'nativewind';

import { colors as lightTokens } from './tokens';

type TokenColors = typeof lightTokens;

export type AppColors = TokenColors & {
  warmSoft: string;
  listeningSoft: string;
};

export const FONT_SCALE = { S: 0.9, M: 1, L: 1.15 } as const;

export const lightColors: AppColors = {
  ...lightTokens,
  warmSoft: '#fff1e7',
  listeningSoft: '#e8effc',
};

export const darkColors: AppColors = {
  canvas: '#0e1424',
  surface: '#172033',
  surfaceTint: '#1c2a4a',
  ink: '#f3f5fb',
  muted: '#a3adc2',
  line: '#2c3854',
  edge: '#243049',
  accent: '#123ab5',
  accentDeep: '#b9c9ff',
  accentSoft: '#1a2748',
  accentEdge: '#0a1f6e',
  accentWarm: '#ff7624',
  xp: '#ff7624',
  xpDeep: '#ff8a45',
  danger: '#f07168',
  dangerSoft: '#3a1e1c',
  success: '#3dcea0',
  successSoft: '#143028',
  heroStart: '#061c64',
  heroEnd: '#1647d6',
  skill: lightTokens.skill,
  warmSoft: '#3a2418',
  listeningSoft: '#1a2748',
};

const COLOR_VARS = [
  ['canvas', '--c-canvas'],
  ['surface', '--c-surface'],
  ['surfaceTint', '--c-tint'],
  ['ink', '--c-ink'],
  ['muted', '--c-muted'],
  ['line', '--c-line'],
  ['edge', '--c-edge'],
  ['accent', '--c-accent'],
  ['accentDeep', '--c-accent-deep'],
  ['accentSoft', '--c-accent-soft'],
  ['accentEdge', '--c-accent-edge'],
  ['xp', '--c-xp'],
  ['xpDeep', '--c-xp-deep'],
  ['danger', '--c-danger'],
  ['dangerSoft', '--c-danger-soft'],
  ['success', '--c-success'],
  ['successSoft', '--c-success-soft'],
] as const;

function channels(hex: string) {
  const value = hex.replace('#', '');
  const rgb = Number.parseInt(value, 16);
  return `${(rgb >> 16) & 255} ${(rgb >> 8) & 255} ${rgb & 255}`;
}

export function themeVars(palette: AppColors, fontScale = 1) {
  const record: Record<`--${string}`, string | number> = { '--font-scale': fontScale };
  for (const [key, cssVar] of COLOR_VARS) {
    record[cssVar] = channels(palette[key]);
  }
  return vars(record);
}

let active: AppColors = lightColors;

export function setActivePalette(palette: AppColors) {
  active = palette;
}

export const colors: AppColors = new Proxy(lightColors, {
  get(_target, key: string) {
    return active[key as keyof AppColors];
  },
});
