// Ported from frontend/src/features/practice/writing/writingResultModel.ts. Keep behaviour in step with the web version.
import type { WritingCorrection, WritingErrorGroup } from '../api/writing'

/** A stretch of the essay: `start` is its offset in the essay, `correction` is set when it is marked. */
export interface EssaySegment {
  text: string
  start: number
  correction?: WritingCorrection
}

/** A stretch of the corrected essay: `changed` is true where a suggestion replaced the learner's words. */
export interface CorrectedSegment {
  text: string
  changed: boolean
}

interface Placed {
  correction: WritingCorrection
  start: number
  end: number
}

/** A correction without a `certainty` is an ERROR; only the second prompt template can say SUGGESTION. */
export function certaintyOf(correction: Pick<WritingCorrection, 'certainty'>): 'ERROR' | 'SUGGESTION' {
  return correction.certainty === 'SUGGESTION' ? 'SUGGESTION' : 'ERROR'
}

/**
 * Where each correction sits in the essay. The range the server sent is used while it still reads as the excerpt; a grade
 * stored without a range falls back to the first occurrence. Of two corrections that overlap, the one that starts first is
 * placed and the other is left out (it still shows in the list of corrections).
 */
function place(essay: string, corrections: WritingCorrection[]): Placed[] {
  const found: Placed[] = []
  for (const correction of corrections) {
    if (!correction.excerpt) continue
    const { start, end } = correction
    if (start != null && end != null && essay.slice(start, end) === correction.excerpt) {
      found.push({ correction, start, end })
      continue
    }
    const at = essay.indexOf(correction.excerpt)
    if (at >= 0) found.push({ correction, start: at, end: at + correction.excerpt.length })
  }
  found.sort((a, b) => a.start - b.start)
  const placed: Placed[] = []
  let cursor = 0
  for (const item of found) {
    if (item.start < cursor) continue
    placed.push(item)
    cursor = item.end
  }
  return placed
}

/** The essay cut at each placed correction, so the marks never overlap. */
export function markEssay(essay: string, corrections: WritingCorrection[]): EssaySegment[] {
  const segments: EssaySegment[] = []
  let cursor = 0
  for (const { correction, start, end } of place(essay, corrections)) {
    if (start > cursor) segments.push({ text: essay.slice(cursor, start), start: cursor })
    segments.push({ text: essay.slice(start, end), start, correction })
    cursor = end
  }
  if (cursor < essay.length) segments.push({ text: essay.slice(cursor), start: cursor })
  return segments
}

/** The essay with each placed suggestion in place of the words it replaces; nothing is written that the grader did not say. */
export function correctedEssay(essay: string, corrections: WritingCorrection[]): CorrectedSegment[] {
  const segments: CorrectedSegment[] = []
  let cursor = 0
  for (const { correction, start, end } of place(essay, corrections)) {
    if (start > cursor) segments.push({ text: essay.slice(cursor, start), changed: false })
    segments.push({ text: correction.suggestion, changed: true })
    cursor = end
  }
  if (cursor < essay.length) segments.push({ text: essay.slice(cursor), changed: false })
  return segments
}

/** The segment that holds the first occurrence of `excerpt`, to scroll to; null when the essay does not contain it. */
export function segmentAt(segments: EssaySegment[], essay: string, excerpt: string): EssaySegment | null {
  const at = excerpt ? essay.indexOf(excerpt) : -1
  if (at < 0) return null
  return segments.find((segment) => at >= segment.start && at < segment.start + segment.text.length) ?? null
}

/** Display names for error codes, from what this result already carries. A code with no name is left to the caller. */
export function errorNames(corrections: WritingCorrection[], groups: WritingErrorGroup[]): Map<string, string> {
  const names = new Map<string, string>()
  for (const group of groups) if (group.errorName) names.set(group.errorCode, group.errorName)
  for (const correction of corrections) if (correction.errorCode && correction.errorName) names.set(correction.errorCode, correction.errorName)
  return names
}
