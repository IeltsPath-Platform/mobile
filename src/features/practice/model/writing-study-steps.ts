// Ported from frontend/src/features/practice/writing/writingStudySteps.ts. Keep behaviour in step with the web version.
import { CRITERION_NAME, focusNoteText, groupStudyPoints, practiceTargetOf } from './essay-criteria'
import type { EssayKnowledgeJudgment, EssayStudyPoint } from './types'

export interface NextStep {
  key: string
  kind: 'KNOWLEDGE_POINT' | 'CRITERION' | 'NOTE'
  title: string
  /** A weak criterion's name and band; a point of the question has none. */
  meta: string | null
  /** The sentence of the essay that shows a failed point of the question. */
  excerpt: string | null
  /** One sentence in Vietnamese saying why this is worth studying. */
  reasons: string[]
  /** The knowledge point the practice button opens, or null when there is nothing to practise. */
  target: string | null
  point: EssayStudyPoint
}

export interface NextSteps {
  steps: NextStep[]
  /** Points of the question that need nothing more, by name. */
  passed: string[]
  unassessed: string[]
}

const nameOf = (item: { name: string | null; code: string | null }) => item.name ?? item.code ?? 'Điểm kiến thức'

/**
 * One list of what to study, most specific first: the points of the question the essay failed (with the sentence that shows
 * it), then each weak criterion with the AI's advice about it, then advice that names no criterion. A failed point arrives
 * both as a judgment and as a study point; it is listed once, from the study point. The English "can do" line the catalog
 * gives a criterion is the same for every learner, so it is left out here.
 */
export function buildNextSteps(points: readonly EssayStudyPoint[], judgments: readonly EssayKnowledgeJudgment[] | undefined): NextSteps {
  const failed: NextStep[] = []
  const weak: NextStep[] = []
  const loose: NextStep[] = []
  groupStudyPoints([...points]).forEach(({ point, notes }, index) => {
    const key = `${point.kind}-${point.knowledgePointId ?? point.title ?? index}-${index}`
    if (point.kind === 'KNOWLEDGE_POINT') {
      failed.push({
        key, kind: 'KNOWLEDGE_POINT', title: point.name ?? point.title ?? 'Điểm kiến thức', meta: null,
        excerpt: point.excerpt ?? null, reasons: point.reason ? [point.reason] : [], target: practiceTargetOf(point), point,
      })
    } else if (point.kind === 'CRITERION') {
      const criterion = CRITERION_NAME[point.criterionCode ?? ''] ?? point.criterionCode
      const meta = [criterion, point.band !== null ? `band ${point.band.toFixed(1)}` : null].filter(Boolean).join(' · ')
      weak.push({
        key, kind: 'CRITERION', title: point.name ?? point.title ?? criterion ?? 'Kiến thức cần học', meta: meta || null,
        excerpt: null, reasons: notes.map(focusNoteText).filter(Boolean), target: practiceTargetOf(point), point,
      })
    } else {
      loose.push({
        key, kind: 'NOTE', title: point.title ?? 'Gợi ý từ AI', meta: null, excerpt: null,
        reasons: point.reason ? [point.reason] : [], target: null, point,
      })
    }
  })
  return {
    steps: [...failed, ...weak, ...loose],
    passed: (judgments ?? []).filter((item) => item.judgment === 'PASS').map(nameOf),
    unassessed: (judgments ?? []).filter((item) => item.judgment === 'NOT_ASSESSED').map(nameOf),
  }
}
