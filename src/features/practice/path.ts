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

/** Deep-clone path (statuses are mutable on Home mock progress). */
export function clonePathUnits(units: PathUnit[] = pathUnits): PathUnit[] {
  return units.map((unit) => ({
    ...unit,
    nodes: unit.nodes.map((node) => ({ ...node })),
  }));
}

export function flattenNodes(units: PathUnit[]): PathNode[] {
  return units.flatMap((unit) => unit.nodes);
}

export function findCurrentNode(units: PathUnit[]): PathNode | null {
  return flattenNodes(units).find((node) => node.status === 'current') ?? null;
}

/** Mark node done, unlock the next unfinished node as current. Returns next current id (if any). */
export function completePathNode(
  units: PathUnit[],
  nodeId: string,
): { units: PathUnit[]; nextNodeId: string | null } {
  const next = clonePathUnits(units);
  const nodes = flattenNodes(next);
  const index = nodes.findIndex((node) => node.id === nodeId);
  if (index < 0) return { units: next, nextNodeId: null };
  if (nodes[index].status === 'locked') return { units: next, nextNodeId: null };

  nodes[index].status = 'done';

  let nextNodeId: string | null = null;
  for (let i = 0; i < nodes.length; i++) {
    if (i === index) continue;
    if (nodes[i].status === 'current') {
      nodes[i].status = i < index ? 'done' : 'locked';
    }
  }
  for (let i = index + 1; i < nodes.length; i++) {
    if (nodes[i].status !== 'done') {
      nodes[i].status = 'current';
      nextNodeId = nodes[i].id;
      break;
    }
  }

  for (const unit of next) {
    const done = unit.nodes.filter((n) => n.status === 'done').length;
    unit.progress = unit.nodes.length ? done / unit.nodes.length : 0;
  }

  return { units: next, nextNodeId };
}

export const pathUnits: PathUnit[] = [
  {
    id: 'unit-1',
    label: 'Unit 1',
    title: 'Khởi động 4 kỹ năng',
    progress: 0,
    nodes: [
      {
        id: 'n1',
        title: 'Listening · Form',
        subtitle: '5 câu note completion',
        skill: 'listening',
        status: 'current',
        xp: 20,
        Icon: Headphones,
        color: colors.skill.listening,
      },
      {
        id: 'n2',
        title: 'Reading · TFNG',
        subtitle: '6 câu True / False / NG',
        skill: 'reading',
        status: 'locked',
        xp: 20,
        Icon: BookOpen,
        color: colors.skill.reading,
      },
      {
        id: 'n3',
        title: 'Writing · Overview',
        subtitle: 'Viết 1 câu overview Task 1',
        skill: 'writing',
        status: 'locked',
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
