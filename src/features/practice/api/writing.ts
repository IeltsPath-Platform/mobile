// Ported from frontend/src/features/practice/writing/writingApi.ts. Keep behaviour in step with the web version.
import { apiRequest } from '@/src/lib/api-client'
import type { EssayKnowledgeJudgmentDto, EssayStudyPointDto } from '../model/types'

/** 'practice' is the screen with the guide and the dictionary; 'exam' is the timed screen that copies the real test. */
export type WritingMode = 'practice' | 'exam'

export interface WritingTask {
  packageId: string
  packageVersionId: string
  sectionId: string
  questionVersionId: string
  packageTitle: string
  title: string
  partNo: number | null
  task: 'TASK_1' | 'TASK_2' | null
  minWords: number | null
  timeLimitSeconds: number | null
  instructions: string | null
  prompt: string
  guide: string | null
  /** The model answer, one paragraph per part of the essay, with **phrases worth learning**; absent until one is written. */
  sampleAnswer?: string | null
  images: Array<{ url: string; altText: string | null }>
}

export interface GradingTerms {
  pointCost: number
  minWords: number
  maxWords: number
}

/** The next band the rubric describes above the one shown, and what it asks for; absent at the top band. */
export interface WritingNextBand {
  band: number
  descriptor: string
}

export interface WritingCriterion {
  code: string
  band: number
  strengths: string[]
  improvements: string[]
  /** True only when a band cap lowered this criterion; see `WritingSubmission.bandLimits` for why. */
  limited?: boolean
  /** Quotations that support the band; second prompt template only. */
  evidence?: string[]
  /** The rubric descriptor the band matched; second prompt template only. */
  descriptor?: string
  nextBand?: WritingNextBand
}

export interface WritingCorrection {
  excerpt: string
  suggestion: string
  category: 'GRAMMAR' | 'VOCABULARY' | 'COHERENCE' | 'TASK' | 'OTHER'
  errorCode?: string
  errorName?: string
  fixHint?: string
  severity?: number
  practiceKnowledgePointId?: string
  /** Character range of `excerpt` in `essayText` (UTF-16, as in JavaScript); absent when the excerpt has no free place. */
  start?: number
  end?: number
  /** Why it is wrong; second prompt template only. */
  reason?: string
  /** A missing value is an ERROR; a SUGGESTION is an improvement, not a mistake. */
  certainty?: 'ERROR' | 'SUGGESTION'
}

export interface WritingBandLimit {
  reason: string
  /** The criterion the cap lowers, such as TA or TR. */
  criterion: string
  cap: number
  /** Ready to show: says which rule lowered the band and to what. */
  message: string
}

/** The errors of one kind, worst first; suggestions are not counted. */
export interface WritingErrorGroup {
  errorCode: string
  errorName?: string
  category?: string
  count: number
  severity: number
  fixHint?: string
  example?: { wrong: string; right: string }
  practiceKnowledgePointId?: string
}

/** A problem to work on first. `source` is AI when the model chose it, RULE when it was derived from the errors. */
export interface WritingPriority {
  title: string
  explanation?: string
  excerpts?: string[]
  action?: string
  errorCodes?: string[]
  practiceKnowledgePointId?: string
  source: 'AI' | 'RULE'
}

/** Task 1: sentences the essay got wrong about the chart, with the statement that is right. A flag the model did not give is absent. */
export interface WritingDataChecks {
  wrong: Array<{ excerpt: string; expected: string }>
  correctCount: number
  hasOverview?: boolean
  overviewAccurate?: boolean
  hasPersonalOpinion?: boolean
}

export type QuestionPartCoverage = 'FULL' | 'PARTIAL' | 'NONE'
export type OutlineRole = 'INTRODUCTION' | 'BODY' | 'CONCLUSION'

/** Task 2: which parts of the question the essay answered, its position and its outline, and the flags drawn from them. */
export interface WritingTaskChecks {
  questionParts?: Array<{ part: string; addressed: QuestionPartCoverage; excerpt?: string }>
  position?: { required: boolean; stated: boolean; excerpt?: string; consistent?: boolean; conflictExcerpt?: string }
  outline?: Array<{ role: OutlineRole; mainIdea: string; developed: boolean; excerpt?: string }>
  partialAnswer: boolean
  noPosition: boolean
  inconsistentPosition: boolean
  noConclusion: boolean
}

/** Only for an essay sent again: how its error kinds compare with the version before. */
export interface WritingRevision {
  previousSubmissionId: string
  fixedCodes: string[]
  repeatedCodes: string[]
  newCodes: string[]
}

export interface WritingSubmission {
  submissionId: string
  /** AWAITING_EXAMINER: sent to an examiner instead of the AI; their review is read apart (see examinerApi). */
  status: 'GRADING' | 'PAYMENT_PENDING' | 'GRADED' | 'FAILED' | 'AWAITING_EXAMINER'
  task?: string
  wordCount?: number
  overallBand?: number
  passed?: boolean
  criteria?: WritingCriterion[]
  corrections?: WritingCorrection[]
  /** What to study next: weak criteria and failed knowledge points, then the grader's focus notes. */
  studyPoints?: EssayStudyPointDto[]
  /** How the essay did on each knowledge point the question practises; absent when the question has none. */
  taskKnowledgePointJudgments?: EssayKnowledgeJudgmentDto[]
  summary?: string
  pointsCharged?: number
  sampleAnswer?: string
  essayText?: string
  code?: string
  failureCode?: string
  bandLimits?: WritingBandLimit[]
  errorGroups?: WritingErrorGroup[]
  priorities?: WritingPriority[]
  dataChecks?: WritingDataChecks
  taskChecks?: WritingTaskChecks
  revision?: WritingRevision
}

export function getWritingTask(packageVersionId: string, sectionId: string, signal?: AbortSignal) {
  return apiRequest<WritingTask>(`/api/content/practice-tests/${packageVersionId}/sections/${sectionId}/writing-task`, { auth: true, signal })
}

export function getGradingTerms(signal?: AbortSignal) {
  return apiRequest<GradingTerms>('/api/learning/free-writing/grading-terms', { auth: true, signal })
}

export function submitFreeWriting(input: { requestId: string; packageVersionId: string; questionVersionId: string; essayText: string }) {
  // AI grading answers inside the gateway's 60 s limit, well past the default request timeout.
  return apiRequest<WritingSubmission>('/api/learning/free-writing/submissions', { method: 'POST', auth: true, body: input, timeoutMs: 60_000 })
}

export function getWritingSubmission(submissionId: string, signal?: AbortSignal) {
  return apiRequest<WritingSubmission>(`/api/learning/writing-submissions/${submissionId}`, { auth: true, signal })
}
