import { BookOpen, Headphones, Mic, PenLine, Trophy, type LucideIcon } from 'lucide-react-native';

import { colors } from '@/src/theme';

export type Skill = {
  key: keyof typeof colors.skill;
  label: string;
  description: string;
  color: string;
  Icon: LucideIcon;
};

export const skills: Skill[] = [
  {
    key: 'listening',
    label: 'Listening',
    description: '4 section, audio như thi máy',
    color: colors.skill.listening,
    Icon: Headphones,
  },
  {
    key: 'reading',
    label: 'Reading',
    description: '3 passage, highlight và giải thích',
    color: colors.skill.reading,
    Icon: BookOpen,
  },
  {
    key: 'writing',
    label: 'Writing',
    description: 'Task 1 & 2, chấm theo band descriptor',
    color: colors.skill.writing,
    Icon: PenLine,
  },
  {
    key: 'speaking',
    label: 'Speaking',
    description: 'Part 1–3, ghi âm và nhận xét',
    color: colors.skill.speaking,
    Icon: Mic,
  },
];

export const fullTest: Skill = {
  key: 'full',
  label: 'Full test',
  description: 'Mô phỏng trọn bài thi 4 kỹ năng',
  color: colors.skill.full,
  Icon: Trophy,
};
