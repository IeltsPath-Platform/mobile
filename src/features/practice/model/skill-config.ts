// Ported from frontend/src/features/practice/lib/practiceSkillConfig.ts. Keep behaviour in step with the web version.
import type { SkillType } from './types'
import type { PracticeSkill, ReadingScope } from '../api/attempts'

/** What a learner can pick inside a skill: one part of a test, or the full test. */
export type PracticePart = number | 'full'

export interface PracticeSkillConfig {
  skill: SkillType
  apiSkill: PracticeSkill
  label: string
  /** Name of one part: Passage, Section, Task, Part. */
  partLabel: string
  /** Part numbers offered under "Bài lẻ" (they match `part_no` in the library). */
  parts: readonly number[]
  hasFull: boolean
  /** What the question count of a card counts. */
  unit: string
}

export const PRACTICE_SKILL_CONFIG: Record<SkillType, PracticeSkillConfig> = {
  reading: { skill: 'reading', apiSkill: 'READING', label: 'Reading', partLabel: 'Passage', parts: [1, 2, 3], hasFull: true, unit: 'câu' },
  listening: { skill: 'listening', apiSkill: 'LISTENING', label: 'Listening', partLabel: 'Section', parts: [1, 2, 3, 4], hasFull: true, unit: 'câu' },
  writing: { skill: 'writing', apiSkill: 'WRITING', label: 'Writing', partLabel: 'Task', parts: [1, 2], hasFull: false, unit: 'bài viết' },
  speaking: { skill: 'speaking', apiSkill: 'SPEAKING', label: 'Speaking', partLabel: 'Part', parts: [1, 2, 3], hasFull: true, unit: 'câu' },
}

export function defaultPracticePart(config: PracticeSkillConfig): PracticePart {
  return config.parts[0] ?? 'full'
}

export function toScopeAndPart(part: PracticePart): { scope: ReadingScope; partNo?: number } {
  return part === 'full' ? { scope: 'FULL' } : { scope: 'PART', partNo: part }
}

export function partBadge(config: PracticeSkillConfig, scope: ReadingScope, partNo: number | null | undefined): string {
  if (scope === 'FULL') return 'Full đề'
  return partNo ? `${config.partLabel} ${partNo}` : config.partLabel
}
