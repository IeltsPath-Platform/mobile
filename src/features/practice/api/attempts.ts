// Ported from frontend/src/features/practice/reading/readingPracticeApi.ts. Keep behaviour in step with the web version.
import { apiRequest } from '@/src/lib/api-client'
import { buildReadingAttemptRequest } from '../model/attempt-request'
import { attemptCovers, isExactScope } from '../model/completed-attempt'

export type ReadingScope = 'PART' | 'FULL'
export type ReadingMode = 'practice' | 'exam'

export interface ReadingTestPart {
  sectionId: string
  partNo: number | null
  title: string
  questionCount: number
  formats: string[]
}

export interface ReadingTestCard {
  packageId: string
  packageVersionId: string
  scope: ReadingScope
  title: string
  coverUrl: string | null
  source: { code: string; name: string } | null
  formats: string[]
  questionCount: number
  timeLimitSeconds: number | null
  requiredFeatureKey: string | null
  parts: ReadingTestPart[]
}

export interface ReadingTestPage {
  totalElements: number
  page: number
  size: number
  items: ReadingTestCard[]
}

export interface ReadingProgress {
  /** `submissionId` is the graded answer to open; only Speaking and Writing name it. */
  completed: Array<{ packageId: string; partNo: number | null; submissionId?: string }>
}

export interface AttemptSection {
  id: string
  contentSectionId: string
  sortOrder: number
  partNo: number | null
  /** Set once the learner opened the section / finished it (a finished section takes no more answers). */
  startedAt?: string | null
  completedAt?: string | null
  snapshot: {
    title: string | null
    skill: string | null
    instructions: string | null
    partNo: number | null
    groups: Array<{ groupId: string; sortOrder: number; formatCode: string; instructions: string | null }>
    passage?: string | null
    audio?: { url: string; durationSeconds: number | null } | null
  }
  items: Array<{ id: string; questionVersionId: string; sortOrder: number; questionSnapshot: string }>
}

export interface AttemptStructure {
  sections: AttemptSection[]
}

export interface AttemptResponse {
  id: string
  attemptItemId: string
  payload: string
  schemaVersion: number
  revision: number
}

export interface ReadingAttempt {
  id: string
  packageVersionId?: string
  scope?: ReadingScope
  mode?: 'STANDARD' | 'TIMED'
  status?: string
  startedAt?: string | null
  submittedAt?: string | null
  expiresAt?: string | null
}

export interface ReadingResult {
  id: string
  attemptId: string
  resultVersion: number
  status: string
  completedAt: string | null
  score: number
  maxScore: number
  percent: number
  items: Array<{ attemptItemId: string; questionVersionId: string; correct: boolean | null }>
  solutions?: Array<{ attemptItemId: string; questionVersionId: string; correctAnswer: string | null; explanation: string | null }>
  sectionSolutions?: Array<{ attemptSectionId: string; transcript: string | null }>
  /** Only a practice test result has it: timing, the estimated band (full Reading/Listening) and the time per section. */
  practice?: {
    scope: 'FULL' | 'PART'
    skill: string
    mode: string
    startedAt: string | null
    submittedAt: string | null
    timeLimitSeconds: number | null
    band: number | null
    sections: Array<{ attemptSectionId: string; partNo: number | null; title: string | null; questionCount: number; timeSpentSeconds: number | null; timeLimitSeconds: number | null }>
  } | null
}

export interface ReadingHistoryItem {
  attemptId: string
  packageId: string
  packageVersionId: string
  skill: string
  scope: ReadingScope
  partNos: number[]
  status: string
  submittedAt: string | null
  percent: number | null
}

export type PracticeSkill = 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING'

export interface PracticeFormatCount {
  code: string
  sectionCount: number
}

export interface ReadingSearchInput {
  skill?: PracticeSkill
  formats?: string[]
  scope: ReadingScope
  partNo?: number
  sources?: string[]
  query?: string
  only?: Array<{ packageId: string; partNo: number | null }>
  exclude?: Array<{ packageId: string; partNo: number | null }>
  page?: number
  size?: number
}

export function searchReadingTests(input: ReadingSearchInput, signal?: AbortSignal) {
  return apiRequest<ReadingTestPage>('/api/content/practice-tests/search', {
    method: 'POST', auth: true, signal,
    body: { skill: 'READING', ...input },
  })
}

export function getReadingProgress(scope: ReadingScope, signal?: AbortSignal, skill: PracticeSkill = 'READING') {
  return apiRequest<ReadingProgress>(`/api/assessments/practice/progress?skill=${skill}&scope=${scope}`, { auth: true, signal })
}

/**
 * The tests of the catalog the learner has finished. Reading and Listening attempts are kept by Assessment; the graded
 * Speaking answers and Writing essays are kept by Learning, which names the answer to open for each test.
 */
export function getCatalogProgress(scope: ReadingScope, signal?: AbortSignal, skill: PracticeSkill = 'READING') {
  if (skill === 'SPEAKING' || skill === 'WRITING') {
    return apiRequest<ReadingProgress>(`/api/learning/practice-progress?skill=${skill}&scope=${scope}`, { auth: true, signal })
  }
  return getReadingProgress(scope, signal, skill)
}

/** Question formats found in the published practice tests of a skill (for the catalog filter). */
export function getPracticeFormats(skill: PracticeSkill, signal?: AbortSignal) {
  return apiRequest<PracticeFormatCount[]>(`/api/content/practice-tests/formats?skill=${skill}`, { auth: true, signal })
}

export function startReadingAttempt(test: Pick<ReadingTestCard, 'scope' | 'packageVersionId' | 'parts'>, mode: ReadingMode, partNo?: number, signal?: AbortSignal) {
  return apiRequest<ReadingAttempt>('/api/assessments/attempts', {
    method: 'POST', auth: true, signal,
    body: buildReadingAttemptRequest(test, mode, partNo),
  })
}

export function getReadingAttempt(attemptId: string, signal?: AbortSignal) {
  return apiRequest<ReadingAttempt>(`/api/assessments/attempts/${attemptId}`, { auth: true, signal })
}

export function getAttemptStructure(attemptId: string, signal?: AbortSignal) {
  return apiRequest<AttemptStructure>(`/api/assessments/attempts/${attemptId}/structure`, { auth: true, signal })
}

export function getAttemptResponses(attemptId: string, signal?: AbortSignal) {
  return apiRequest<AttemptResponse[]>(`/api/assessments/attempts/${attemptId}/responses`, { auth: true, signal })
}

export function startAttemptSection(attemptId: string, sectionId: string) {
  return apiRequest<void>(`/api/assessments/attempts/${attemptId}/sections/${sectionId}/start`, { method: 'POST', auth: true })
}

export function saveAttemptAnswer(attemptId: string, itemId: string, answer: string, expectedRevision: number) {
  return apiRequest<AttemptResponse>(`/api/assessments/attempts/${attemptId}/items/${itemId}/response`, {
    method: 'PUT', auth: true,
    body: { payload: JSON.stringify({ answer }), schemaVersion: 1, expectedRevision },
  })
}

/** Seconds the learner was active in each section (keyed by the attempt section id); the result shows where the time went. */
export type SectionSeconds = Record<string, number>

export function submitReadingAttempt(attemptId: string, sectionSeconds: SectionSeconds = {}) {
  const entries = Object.entries(sectionSeconds).filter(([, seconds]) => seconds > 0)
    .map(([sectionId, seconds]) => ({ sectionId, seconds: Math.min(Math.round(seconds), 86_400) }))
  return apiRequest<ReadingAttempt>(`/api/assessments/attempts/${attemptId}/submit`, {
    method: 'POST', auth: true,
    ...(entries.length ? { body: { sectionSeconds: entries } } : {}),
  })
}

export function getReadingResult(attemptId: string, signal?: AbortSignal) {
  return apiRequest<ReadingResult>(`/api/assessments/attempts/${attemptId}/result`, { auth: true, signal })
}

export function getPracticeHistory(skill: PracticeSkill, page: number, size: number, signal?: AbortSignal) {
  return apiRequest<{ totalElements: number; page: number; size: number; items: ReadingHistoryItem[] }>(
    `/api/assessments/practice/history?skill=${skill}&page=${page}&size=${size}`, { auth: true, signal },
  )
}

const HISTORY_PAGE_SIZE = 50
/** Far more than a learner's real history; stops the search from walking an endless list. */
const MAX_HISTORY_PAGES = 20

/**
 * The attempt whose result a "completed" catalog card should open: the learner's most recent submitted run of that test
 * (history comes newest first). A run of the card's own scope wins; a full attempt that included the part is the fallback.
 * Null when no submitted attempt is found.
 */
export async function findSubmittedAttemptId(skill: PracticeSkill, card: Pick<ReadingTestCard, 'packageId' | 'scope'>, partNo: number | undefined, signal?: AbortSignal): Promise<string | null> {
  const wantedPart = card.scope === 'PART' ? partNo : undefined
  let fallback: string | null = null
  for (let page = 0; page < MAX_HISTORY_PAGES; page += 1) {
    const result = await getPracticeHistory(skill, page, HISTORY_PAGE_SIZE, signal)
    for (const item of result.items) {
      if (!attemptCovers(item, card.packageId, wantedPart)) continue
      if (isExactScope(item, card.scope)) return item.attemptId
      fallback ??= item.attemptId
    }
    if ((page + 1) * HISTORY_PAGE_SIZE >= result.totalElements) break
  }
  return fallback
}

export function restartReadingAttempt(packageVersionId: string, scope: ReadingScope, sectionIds: string[], mode: ReadingMode) {
  return apiRequest<ReadingAttempt>('/api/assessments/attempts', {
    method: 'POST', auth: true,
    body: {
      packageVersionId,
      ...(scope === 'PART' ? { sectionIds } : {}),
      mode: mode === 'exam' ? 'TIMED' : 'STANDARD',
      channel: 'MOBILE',
    },
  })
}
