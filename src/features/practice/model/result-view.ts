// Ported from frontend/src/features/practice/lib/readingResultView.ts. Keep behaviour in step with the web version.
interface ResultStructure {
  sections: Array<{
    id: string
    sortOrder: number
    snapshot: string | Record<string, unknown>
    items: Array<{ id: string; sortOrder: number; questionSnapshot: string }>
  }>
}
interface ResultResponse { attemptItemId: string; payload: string }
interface ResultData {
  score: number
  maxScore: number
  percent: number
  items: Array<{ attemptItemId: string; correct: boolean | null }>
  solutions?: Array<{ attemptItemId: string; correctAnswer?: string | null; explanation?: string | null }>
  practice?: PracticeData | null
}
interface AttemptTimes { startedAt: string | null; submittedAt: string | null }
/** What the backend adds to the result of a practice test: timing, the estimated band and the time of each section. */
interface PracticeData {
  scope?: string
  startedAt?: string | null
  submittedAt?: string | null
  timeLimitSeconds?: number | null
  band?: number | null
  sections?: Array<{ attemptSectionId: string; partNo: number | null; title: string | null; questionCount: number; timeSpentSeconds: number | null; timeLimitSeconds: number | null }>
}

export interface ReadingResultItem {
  itemId: string
  number: number
  prompt: string
  formatCode: string
  yourAnswer: string | null
  correct: boolean | null
  correctAnswer?: string
  explanation?: string
}
export interface ReadingFormatResult {
  formatCode: string
  total: number
  correct: number
  incorrect: number
  blank: number
  ratio: number
}
/** One passage of the attempt: how many answers were right in it and how long the learner spent there. */
export interface ReadingSectionResult {
  sectionId: string
  partNo: number | null
  title: string
  total: number
  correct: number
  incorrect: number
  blank: number
  timeSpentSeconds: number | null
  timeLimitSeconds: number | null
}

export interface ReadingResultView {
  /** FULL when the learner took the whole test, PART for a single passage; null when the backend did not say. */
  scope: 'FULL' | 'PART' | null
  /** Estimated band, only for a full test. */
  band: number | null
  timeLimitSeconds: number | null
  sections: ReadingSectionResult[]
  score: number
  maxScore: number
  percent: number
  counts: { correct: number; incorrect: number; blank: number }
  durationSeconds: number | null
  items: ReadingResultItem[]
  byFormat: ReadingFormatResult[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
function jsonRecord(raw: string | Record<string, unknown>): Record<string, unknown> {
  if (record(raw)) return raw
  try { const parsed: unknown = JSON.parse(raw); return record(parsed) ? parsed : {} } catch { return {} }
}
function answer(payload: string | undefined): string | null {
  if (!payload) return null
  const value = jsonRecord(payload).answer
  return typeof value === 'string' && value.trim() ? value : null
}
function groupFormats(snapshot: Record<string, unknown>) {
  const result = new Map<string, string>()
  if (!Array.isArray(snapshot.groups)) return result
  for (const raw of snapshot.groups) {
    if (!record(raw) || typeof raw.groupId !== 'string' || typeof raw.formatCode !== 'string') continue
    result.set(raw.groupId, raw.formatCode)
  }
  return result
}

export function buildReadingResultView(input: {
  structure: ResultStructure
  responses: ResultResponse[]
  result: ResultData
  attempt: AttemptTimes
}): ReadingResultView {
  const responseMap = new Map(input.responses.map((item) => [item.attemptItemId, item.payload]))
  const correctMap = new Map(input.result.items.map((item) => [item.attemptItemId, item.correct]))
  const solutionMap = new Map((input.result.solutions ?? []).map((item) => [item.attemptItemId, item]))
  let number = 0
  const items = [...input.structure.sections].sort((a, b) => a.sortOrder - b.sortOrder).flatMap((section) => {
    const snapshot = jsonRecord(section.snapshot)
    const formats = groupFormats(snapshot)
    return [...section.items].sort((a, b) => a.sortOrder - b.sortOrder).map((item) => {
      number += 1
      const question = jsonRecord(item.questionSnapshot)
      const groupId = typeof question.groupId === 'string' ? question.groupId : ''
      const solution = solutionMap.get(item.id)
      return {
        itemId: item.id,
        number,
        prompt: typeof question.stem === 'string' ? question.stem : typeof question.prompt === 'string' ? question.prompt : '',
        formatCode: formats.get(groupId) ?? 'OTHER',
        yourAnswer: answer(responseMap.get(item.id)),
        correct: correctMap.get(item.id) ?? null,
        ...(solution?.correctAnswer ? { correctAnswer: solution.correctAnswer } : {}),
        ...(solution?.explanation ? { explanation: solution.explanation } : {}),
      }
    })
  })
  const byFormatMap = new Map<string, ReadingFormatResult>()
  const counts = { correct: 0, incorrect: 0, blank: 0 }
  for (const item of items) {
    const isBlank = item.yourAnswer === null
    if (isBlank) counts.blank += 1
    else if (item.correct === true) counts.correct += 1
    else if (item.correct === false) counts.incorrect += 1
    const summary = byFormatMap.get(item.formatCode) ?? { formatCode: item.formatCode, total: 0, correct: 0, incorrect: 0, blank: 0, ratio: 0 }
    summary.total += 1
    if (isBlank) summary.blank += 1
    else if (item.correct === true) summary.correct += 1
    else if (item.correct === false) summary.incorrect += 1
    summary.ratio = summary.total ? Math.round(summary.correct / summary.total * 100) : 0
    byFormatMap.set(item.formatCode, summary)
  }
  const practice = input.result.practice ?? null
  const startedAt = practice?.startedAt ?? input.attempt.startedAt
  const submittedAt = practice?.submittedAt ?? input.attempt.submittedAt
  const started = startedAt ? Date.parse(startedAt) : NaN
  const submitted = submittedAt ? Date.parse(submittedAt) : NaN

  const timeBySection = new Map((practice?.sections ?? []).map((section) => [section.attemptSectionId, section]))
  const itemsBySection = new Map<string, ReadingResultItem[]>()
  for (const section of [...input.structure.sections].sort((a, b) => a.sortOrder - b.sortOrder)) {
    itemsBySection.set(section.id, [...section.items].sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => items.find((candidate) => candidate.itemId === item.id)).filter((item): item is ReadingResultItem => Boolean(item)))
  }
  const sectionResults = [...input.structure.sections].sort((a, b) => a.sortOrder - b.sortOrder).map((section, index): ReadingSectionResult => {
    const sectionItems = itemsBySection.get(section.id) ?? []
    const known = timeBySection.get(section.id)
    const snapshot = jsonRecord(section.snapshot)
    const blank = sectionItems.filter((item) => item.yourAnswer === null).length
    return {
      sectionId: section.id,
      partNo: known?.partNo ?? (typeof snapshot.partNo === 'number' ? snapshot.partNo : null),
      title: known?.title ?? (typeof snapshot.title === 'string' ? snapshot.title : `Passage ${index + 1}`),
      total: sectionItems.length,
      correct: sectionItems.filter((item) => item.yourAnswer !== null && item.correct === true).length,
      incorrect: sectionItems.filter((item) => item.yourAnswer !== null && item.correct === false).length,
      blank,
      timeSpentSeconds: known?.timeSpentSeconds ?? null,
      timeLimitSeconds: known?.timeLimitSeconds ?? null,
    }
  })

  return {
    scope: practice?.scope === 'FULL' || practice?.scope === 'PART' ? practice.scope : null,
    band: typeof practice?.band === 'number' ? practice.band : null,
    timeLimitSeconds: practice?.timeLimitSeconds ?? null,
    sections: sectionResults,
    score: input.result.score,
    maxScore: input.result.maxScore,
    percent: input.result.percent,
    counts,
    durationSeconds: Number.isFinite(started) && Number.isFinite(submitted) ? Math.max(0, Math.floor((submitted - started) / 1000)) : null,
    items,
    byFormat: [...byFormatMap.values()],
  }
}
