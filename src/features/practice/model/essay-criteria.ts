// Ported from frontend/src/features/learning-path/components/essayCriteria.ts (the helpers the Writing result uses).
import type { EssayStudyPoint } from './types';

export const CRITERION_NAME: Record<string, string> = {
  TA: 'Task Achievement',
  TR: 'Task Response',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammar Range & Accuracy',
};

/** Which rubric criteria an AI focus title is about, by the words the grader's model tends to use. */
const FOCUS_TOPICS: Array<[RegExp, string[]]> = [
  [/task\s*(achievement|response)/i, ['TA', 'TR']],
  [/coheren|cohesi/i, ['CC']],
  [/lexical|vocabular/i, ['LR']],
  [/grammat/i, ['GRA']],
];

/** A title that only names the criterion says nothing the criterion's own entry does not. */
const GENERIC_FOCUS_TITLE =
  /^(task\s*(achievement|response)|coherence(\s*(and|&)\s*cohesion)?|lexical\s*resource|vocabulary|grammatical?\s*range(\s*(and|&)\s*accuracy)?|grammar)$/i;

/**
 * The knowledge point a study point's practice button opens. A failed question point is practised only when it has a
 * practice set of its own, so it never falls back to its id; a weak criterion practises its own point.
 */
export function practiceTargetOf(point: EssayStudyPoint): string | null {
  if (point.kind === 'KNOWLEDGE_POINT') return point.practiceKnowledgePointId ?? null;
  if (point.kind === 'CRITERION') return point.practiceKnowledgePointId ?? point.knowledgePointId;
  return null;
}

export interface StudyPointGroup {
  point: EssayStudyPoint;
  /** AI suggestions about the same criterion, shown with the point they belong to. */
  notes: EssayStudyPoint[];
}

/** Folds each AI suggestion into the criterion it talks about; suggestions about nothing known stay on their own. */
export function groupStudyPoints(points: EssayStudyPoint[]): StudyPointGroup[] {
  const groups: StudyPointGroup[] = points.map((point) => ({ point, notes: [] }));
  const criteria = groups.filter((group) => group.point.kind === 'CRITERION');
  return groups.filter((group) => {
    if (group.point.kind !== 'AI') return true;
    const title = group.point.title ?? '';
    const codes = FOCUS_TOPICS.find(([pattern]) => pattern.test(title))?.[1];
    const target = codes && criteria.find((candidate) => codes.includes(candidate.point.criterionCode ?? ''));
    if (!target) return true;
    target.notes.push(group.point);
    return false;
  });
}

export function focusNoteText(note: EssayStudyPoint): string {
  const title = (note.title ?? '').trim();
  const reason = (note.reason ?? '').trim();
  if (!reason) return title;
  return !title || GENERIC_FOCUS_TITLE.test(title) ? reason : `${title}: ${reason}`;
}
