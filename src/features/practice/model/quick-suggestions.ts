import type { HistoryRow } from './history-view';
import type { SkillType } from './types';

/** A short session: one part of a test, sized for a break. */
export interface QuickSession {
  skill: SkillType;
  part: string;
  title: string;
  minutes: number;
}

/** The short sessions of each skill, the first one being what a learner should start with. */
export const QUICK_SESSIONS: Record<SkillType, QuickSession[]> = {
  listening: [{ skill: 'listening', part: '1', title: 'Section 1', minutes: 10 }],
  reading: [{ skill: 'reading', part: '1', title: 'Passage 1', minutes: 20 }],
  writing: [{ skill: 'writing', part: '1', title: 'Task 1', minutes: 20 }, { skill: 'writing', part: '2', title: 'Task 2', minutes: 40 }],
  speaking: [{ skill: 'speaking', part: '1', title: 'Part 1', minutes: 5 }, { skill: 'speaking', part: '2', title: 'Part 2 · cue card', minutes: 4 }],
};

export interface QuickSuggestion extends QuickSession {
  /** Why it is offered, e.g. "Chưa thử" or "Gần nhất: Band 5.5"; null when nothing is known about the learner yet. */
  reason: string | null;
  /** The one the learner needs most. */
  weakest: boolean;
}

const SKILLS: readonly SkillType[] = ['listening', 'reading', 'writing', 'speaking'];
const MAX_SUGGESTIONS = 6;

/**
 * The latest result of a skill on a 0-1 scale: a percentage as itself, a band out of 9. A graded-later result without a
 * score has none, so it ranks after the scored ones.
 */
export function scoreOf(row: HistoryRow): number | null {
  if (!row.mark) return null;
  const value = Number.parseFloat(row.mark.value);
  if (!Number.isFinite(value)) return null;
  return row.mark.label === 'Band' ? Math.min(value / 9, 1) : Math.min(value / 100, 1);
}

/**
 * Orders the short sessions by what helps the learner most: a skill never tried first, then the lowest latest score, then
 * skills still waiting for a grade. `latest` maps a skill to its latest result, `null` when it has none and `undefined`
 * while that is not known; with nothing known the usual order is kept and no reason is given.
 */
export function suggestQuick(latest: Record<SkillType, HistoryRow | null | undefined>): QuickSuggestion[] {
  const known = SKILLS.every((skill) => latest[skill] !== undefined);
  const rank = (skill: SkillType) => {
    const row = latest[skill];
    if (row === null) return -1;
    return (row && scoreOf(row)) ?? 2;
  };
  const ordered = known ? [...SKILLS].sort((a, b) => rank(a) - rank(b)) : [...SKILLS];
  const firstScored = ordered.find((skill) => rank(skill) >= 0 && rank(skill) <= 1);
  const reasonOf = (skill: SkillType): string | null => {
    const row = latest[skill];
    if (!known || row === undefined) return null;
    if (row === null) return 'Chưa thử';
    return row.mark ? `Gần nhất: ${row.mark.label} ${row.mark.value}` : 'Đang chờ chấm';
  };
  const weakestSkill = known ? (rank(ordered[0]!) === -1 ? ordered[0] : firstScored) : undefined;
  const make = (session: QuickSession): QuickSuggestion => ({ ...session, reason: reasonOf(session.skill), weakest: session.skill === weakestSkill });
  const firsts = ordered.map((skill) => make(QUICK_SESSIONS[skill][0]!));
  const seconds = ordered.flatMap((skill) => QUICK_SESSIONS[skill].slice(1).map(make));
  return [...firsts, ...seconds].slice(0, MAX_SUGGESTIONS);
}
