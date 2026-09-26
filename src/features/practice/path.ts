import { BookOpen, Headphones, Mic, PenLine, Sparkles, type LucideIcon } from 'lucide-react-native';

import { colors } from '@/src/theme';

export type PathStatus = 'done' | 'current' | 'locked';

export type PathNode = {
  id: string;
  title: string;
  subtitle: string;
  skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'bonus';
  status: PathStatus;
  xp: number;
  Icon: LucideIcon;
  color: string;
};

export type PathUnit = {
  id: string;
  label: string;
  title: string;
  progress: number;
  nodes: PathNode[];
};

export const learnerStats = {
  streak: 4,
  xp: 320,
  dailyGoal: 50,
  dailyXp: 20,
  league: 'Đồng',
};

export const pathUnits: PathUnit[] = [
  {
    id: 'unit-1',
    label: 'Unit 1',
    title: 'Khởi động 4 kỹ năng',
    progress: 0.5,
    nodes: [
      {
        id: 'n1',
        title: 'Listening · Form',
        subtitle: '5 câu note completion',
        skill: 'listening',
        status: 'done',
        xp: 20,
        Icon: Headphones,
        color: colors.skill.listening,
      },
      {
        id: 'n2',
        title: 'Reading · TFNG',
        subtitle: '6 câu True / False / NG',
        skill: 'reading',
        status: 'done',
        xp: 20,
        Icon: BookOpen,
        color: colors.skill.reading,
      },
      {
        id: 'n3',
        title: 'Writing · Overview',
        subtitle: 'Viết 1 câu overview Task 1',
        skill: 'writing',
        status: 'current',
        xp: 30,
        Icon: PenLine,
        color: colors.skill.writing,
      },
      {
        id: 'n4',
        title: 'Speaking · Part 1',
        subtitle: '3 câu về thói quen ngày',
        skill: 'speaking',
        status: 'locked',
        xp: 25,
        Icon: Mic,
        color: colors.skill.speaking,
      },
      {
        id: 'n5',
        title: 'Ôn nhanh',
        subtitle: 'Trộn lại 4 dạng vừa học',
        skill: 'bonus',
        status: 'locked',
        xp: 40,
        Icon: Sparkles,
        color: colors.accent,
      },
    ],
  },
  {
    id: 'unit-2',
    label: 'Unit 2',
    title: 'Canh giờ như thi thật',
    progress: 0,
    nodes: [
      {
        id: 'n6',
        title: 'Listening · Map',
        subtitle: '10 câu dán nhãn bản đồ',
        skill: 'listening',
        status: 'locked',
        xp: 30,
        Icon: Headphones,
        color: colors.skill.listening,
      },
      {
        id: 'n7',
        title: 'Reading · Headings',
        subtitle: '7 câu matching headings',
        skill: 'reading',
        status: 'locked',
        xp: 30,
        Icon: BookOpen,
        color: colors.skill.reading,
      },
      {
        id: 'n8',
        title: 'Writing · Task 2',
        subtitle: 'Một đoạn thân bài, 1 ý',
        skill: 'writing',
        status: 'locked',
        xp: 40,
        Icon: PenLine,
        color: colors.skill.writing,
      },
    ],
  },
];
