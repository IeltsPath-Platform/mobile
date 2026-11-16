// Ported from frontend/src/features/practice/writing/reviewMarks.ts. Keep behaviour in step with the web version.
import type { ReviewAnnotation } from '../api/examiners'

export interface MarkedSegment {
  text: string
  /** The error marked in this piece; absent for plain text. */
  annotation?: ReviewAnnotation
  /** 1-based, in reading order, as in the list under the essay. */
  number?: number
}

/**
 * Cuts the essay at the places the examiner marked. A mark counts only when it quotes the essay at its position, and one
 * that overlaps the mark before it is left out, so what is shown is always the learner's own text.
 */
export function markByOffsets(essay: string, annotations: readonly ReviewAnnotation[]): MarkedSegment[] {
  const ordered = [...annotations]
    .filter((item) => item.start >= 0 && item.end > item.start && item.end <= essay.length && essay.slice(item.start, item.end) === item.excerpt)
    .sort((a, b) => a.start - b.start)
  const segments: MarkedSegment[] = []
  let cursor = 0
  let number = 0
  for (const annotation of ordered) {
    if (annotation.start < cursor) continue
    if (annotation.start > cursor) segments.push({ text: essay.slice(cursor, annotation.start) })
    segments.push({ text: essay.slice(annotation.start, annotation.end), annotation, number: ++number })
    cursor = annotation.end
  }
  if (cursor < essay.length) segments.push({ text: essay.slice(cursor) })
  return segments.length > 0 ? segments : [{ text: essay }]
}

/** The marks that are shown, in the order of the numbers in the essay. */
export function shownMarks(segments: readonly MarkedSegment[]) {
  return segments.filter((segment): segment is MarkedSegment & { annotation: ReviewAnnotation; number: number } => segment.annotation !== undefined)
}

const CRITERION_NAME: Record<string, string> = {
  taskResponse: 'Task Response / Achievement',
  coherence: 'Coherence & Cohesion',
  lexical: 'Lexical Resource',
  grammar: 'Grammatical Range & Accuracy',
}

export const criterionName = (key: string) => CRITERION_NAME[key] ?? key
