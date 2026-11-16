import { BookOpen, Headphones, Mic, PenLine, type LucideIcon } from 'lucide-react-native';

import { colors } from '@/src/theme';
import { darkColors } from '@/src/theme/runtime';

import type { SkillType } from './types';

export const SKILL_ORDER: readonly SkillType[] = ['listening', 'reading', 'writing', 'speaking'];

export const SKILL_META: Record<SkillType, { label: string; subtitle: string; Icon: LucideIcon }> = {
  listening: { label: 'Listening', subtitle: '4 section · nghe và trả lời', Icon: Headphones },
  reading: { label: 'Reading', subtitle: '3 passage · đọc hiểu', Icon: BookOpen },
  writing: { label: 'Writing', subtitle: 'Task 1 & 2 · AI hoặc giáo viên chấm', Icon: PenLine },
  speaking: { label: 'Speaking', subtitle: '3 part · ghi âm, AI chấm', Icon: Mic },
};

/** The skill's brand colour from the design tokens. */
export function skillColor(skill: SkillType) {
  return colors.skill[skill];
}

const DARK_INK: Record<SkillType, string> = { listening: '#8fb0ff', reading: '#ffad7a', writing: '#ff8f87', speaking: '#5fd3a0' };

/** The skill colour for text and icons on a surface: the brand colour, lightened on the dark theme so it stays readable. */
export function skillInk(skill: SkillType) {
  return colors.surface === darkColors.surface ? DARK_INK[skill] : colors.skill[skill];
}

export function parseSkill(value: unknown): SkillType {
  return SKILL_ORDER.find((skill) => skill === value) ?? 'reading';
}
