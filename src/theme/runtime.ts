import { vars } from 'nativewind';

import { colors as lightTokens } from './tokens';

type TokenColors = typeof lightTokens;

/** Semantic colors that are not part of the brand token file but must follow light/dark. */
export type AppColors = TokenColors & {
  warmSoft: string;
  listeningSoft: string;
  /** Text / icons placed on accent or status-colored fills. */
  onAccent: string;
  /** Amber for "almost" states (Wordly present letter, progress highlights). */
  warning: string;
  /** Neutral for ruled-out states (Wordly absent letter). */
  absent: string;
  /** Streak flame, XP coin and social accent shared by home / profile summaries. */
  flame: string;
  coin: string;
  social: string;
  /** Soft elevation tint for cards. */
  shadow: string;
  /** Reaction accents used by the community reaction tray and summaries. */
  reaction: Record<'like' | 'love' | 'helpful' | 'accurate', string>;
};

export const FONT_SCALE = { S: 0.9, M: 1, L: 1.15 } as const;

export const lightColors: AppColors = {
  ...lightTokens,
  warmSoft: '#fff3ea',
  listeningSoft: '#e8effc',
  onAccent: '#ffffff',
  warning: '#e6a321',
  flame: '#ff864b',
  coin: '#f4c44e',
  social: '#d76280',
  absent: '#7d8799',
  shadow: '#14213d',
  reaction: { like: '#1877f2', love: '#e41e3f', helpful: '#d97706', accurate: '#059669' },
};

export const darkColors: AppColors = {
  canvas: '#050607',
  surface: '#121518',
  surfaceTint: '#1b2025',
  ink: '#f3f5fb',
  muted: '#a1a8b0',
  line: '#292f35',
  edge: '#22282e',
  accent: '#1eabf2',
  accentDeep: '#55c1ff',
  accentSoft: '#102d3d',
  accentEdge: '#084363',
  accentWarm: '#ff7624',
  xp: '#ff7624',
  xpDeep: '#ffad79',
  danger: '#f07168',
  dangerSoft: '#3a1e1c',
  success: '#3dcea0',
  successSoft: '#143028',
  community: {
    general: { foreground: '#a9bfff', background: '#26365e', border: '#40598d' },
    question: { foreground: '#ff9eaa', background: '#492b38', border: '#744252' },
    discussion: { foreground: '#72d8ae', background: '#1c4038', border: '#2d6554' },
    writing: { foreground: '#c7a4ff', background: '#382c52', border: '#5b477b' },
    speaking: { foreground: '#82d6f5', background: '#1d3a4a', border: '#326177' },
    resources: { foreground: '#ffca76', background: '#49391f', border: '#70582e' },
  },
  heroStart: '#062235',
  heroEnd: '#087fbc',
  skill: lightTokens.skill,
  warmSoft: '#332319',
  listeningSoft: '#172832',
  onAccent: '#ffffff',
  warning: '#f0b84a',
  flame: '#ff9c6b',
  coin: '#f4c44e',
  social: '#e8809a',
  absent: '#4a5260',
  shadow: '#000000',
  reaction: { like: '#4c9bff', love: '#ff5a78', helpful: '#f0a23a', accurate: '#34c48f' },
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
