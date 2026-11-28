// Ported from frontend/src/features/learning-path/placement/{placementGroups,placementSkills,placementPools}.ts.
import type { TestSection } from '@/src/features/practice/model/sections';

import type { PlacementPool, PlacementSkill } from './api';

export type GroupSkill = PlacementSkill | 'OTHER';

/** One exam skill as the learner sees it: the consecutive sections of the attempt that share a skill. */
export interface PlacementGroup {
  /** Id of the first section; stable for the lifetime of the attempt. */
  id: string;
  skill: GroupSkill;
  sections: TestSection[];
}

export function skillOf(section: TestSection): GroupSkill {
  const skill = section.snapshot?.skill?.toUpperCase();
  return skill === 'LISTENING' || skill === 'READING' || skill === 'WRITING' || skill === 'SPEAKING' ? skill : 'OTHER';
}

/** Gathers consecutive sections of one skill; sections of an unknown skill each stay on their own. */
export function groupSections(sections: TestSection[]): PlacementGroup[] {
  const buckets: { skill: GroupSkill; sections: TestSection[] }[] = [];
  for (const section of [...sections].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const skill = skillOf(section);
    const last = buckets[buckets.length - 1];
    if (last && skill !== 'OTHER' && last.skill === skill) last.sections.push(section);
    else buckets.push({ skill, sections: [section] });
  }
  return buckets.map(({ skill, sections: members }) => ({ id: members[0].id, skill, sections: members }));
}

export const isGroupDone = (group: PlacementGroup) => group.sections.every((section) => Boolean(section.completedAt));

export const questionItems = (section: TestSection) => section.items.filter((item) => item.question !== null);

export const SKILL_LABEL: Record<GroupSkill, string> = {
  LISTENING: 'Listening', READING: 'Reading', WRITING: 'Writing', SPEAKING: 'Speaking', OTHER: 'Phần khác',
};

export const POOL_META: Record<PlacementPool, { title: string; detail: string }> = {
  BAND_0_3: { title: 'Mới bắt đầu', detail: 'Đề dễ, đo được tới band 3.0' },
  BAND_3_5: { title: 'Trung cấp', detail: 'Đề vừa, đo được tới band 5.0' },
  BAND_5_9: { title: 'Nâng cao', detail: 'Đề đầy đủ, đo được tới band 9.0' },
};

/* Writing answers are saved as `{"parts":[...]}` (the web splits an essay into four parts); the phone writes one essay
 * into the first part, and reads back whatever parts a web draft left. */
export function readEssay(raw: string | undefined): string {
  if (!raw) return '';
  try {
    const value = JSON.parse(raw) as { parts?: unknown };
    if (value && Array.isArray(value.parts)) return value.parts.map((part) => String(part ?? '').trim()).filter(Boolean).join('\n\n');
  } catch {
    // A plain-text draft from an older version.
  }
  return raw;
}

export const essayAnswer = (essay: string) => JSON.stringify({ parts: [essay, '', '', ''] });

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/* A Speaking answer is saved as `{"spokenSeconds":N}` so a resumed section knows which questions were recorded. */
export function readSpokenSeconds(raw: string | undefined): number {
  try {
    const value = raw ? JSON.parse(raw) as { spokenSeconds?: unknown } : null;
    return value && typeof value.spokenSeconds === 'number' ? value.spokenSeconds : 0;
  } catch {
    return 0;
  }
}

export const spokenAnswer = (seconds: number) => JSON.stringify({ spokenSeconds: seconds });

/** The word count a Writing prompt asks for ("Write at least 150 words"), or null when it names none. */
export function minimumWords(prompt: string | null | undefined): number | null {
  const match = /at least\s+(\d+)\s+words/i.exec(prompt ?? '');
  return match ? Number(match[1]) : null;
}
