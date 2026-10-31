import { BookOpen, Headphones, Mic, PenLine, Sparkles, type LucideIcon } from 'lucide-react-native';

import type { LessonStatus, LessonSummaryDto, TopicSummaryDto } from '@/src/features/learning/types';
import { colors } from '@/src/theme';

export type PathStatus = 'done' | 'current' | 'locked';

export type PathNode = {
  id: string;
  title: string;
  subtitle: string;
  skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'bonus';
  status: PathStatus;
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

export function flattenNodes(units: PathUnit[]): PathNode[] {
  return units.flatMap((unit) => unit.nodes);
}

export function findCurrentNode(units: PathUnit[]): PathNode | null {
  return flattenNodes(units).find((node) => node.status === 'current') ?? null;
}

type SkillKey = PathNode['skill'];

const SKILL_META: Record<SkillKey, { Icon: LucideIcon; color: string }> = {
  listening: { Icon: Headphones, color: colors.skill.listening },
  reading: { Icon: BookOpen, color: colors.skill.reading },
  writing: { Icon: PenLine, color: colors.skill.writing },
  speaking: { Icon: Mic, color: colors.skill.speaking },
  bonus: { Icon: Sparkles, color: colors.accent },
};

export function skillFromTopic(topic: Pick<TopicSummaryDto, 'code' | 'name'>): SkillKey {
  const blob = `${topic.code} ${topic.name}`.toLowerCase();
  if (blob.includes('listen') || blob.includes('nghe')) return 'listening';
  if (blob.includes('writ') || blob.includes('viết') || blob.includes('viet')) return 'writing';
  if (blob.includes('speak') || blob.includes('nói') || blob.includes('noi')) return 'speaking';
  return 'reading';
}

function pathStatus(status: LessonStatus): PathStatus {
  if (status === 'COMPLETED') return 'done';
  if (status === 'AVAILABLE') return 'current';
  return 'locked';
}

function lessonNode(lesson: LessonSummaryDto, skill: SkillKey): PathNode {
  const meta = SKILL_META[skill];
  const status = pathStatus(lesson.status);
  return {
    id: lesson.lessonId,
    title: lesson.title,
    subtitle: status === 'done' ? 'Đã xong' : status === 'current' ? 'Khoảng 5–8 phút' : 'Chưa mở',
    skill,
    status,
    Icon: meta.Icon,
    color: meta.color,
  };
}

/**
 * Topic → unit, lesson → node. Every AVAILABLE lesson is `current` so the sheet can start it.
 * `findCurrentNode` still returns the first one as "bài tiếp theo".
 */
export function mapLessonsToPathUnits(
  topics: TopicSummaryDto[],
  lessonsByTopic: Record<string, LessonSummaryDto[]>,
): PathUnit[] {
  const sorted = [...topics].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const units: PathUnit[] = [];

  for (const topic of sorted) {
    const skill = skillFromTopic(topic);
    const meta = SKILL_META[skill];
    const lessons = lessonsByTopic[topic.topicId];
    let nodes: PathNode[];

    if (!lessons) {
      if (topic.status !== 'LOCKED') continue;
      nodes = [
        {
          id: `locked-${topic.topicId}`,
          title: topic.name,
          subtitle: 'Mở sau khi xong phần trước',
          skill,
          status: 'locked',
          Icon: meta.Icon,
          color: meta.color,
        },
      ];
    } else if (lessons.length === 0) {
      continue;
    } else {
      nodes = [...lessons]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((lesson) => lessonNode(lesson, skill));
    }

    const done = nodes.filter((node) => node.status === 'done').length;
    units.push({
      id: topic.topicId,
      label: `Unit ${units.length + 1}`,
      title: topic.name,
      progress: nodes.length ? done / nodes.length : 0,
      nodes,
    });
  }

  return units;
}
