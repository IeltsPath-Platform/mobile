// Ported from frontend/src/features/practice/history/submissionHistoryApi.ts. Keep behaviour in step with the web version.
import { z } from 'zod'
import { apiRequest } from '@/src/lib/api-client'
import { queryString } from '../model/query-string'

export const HISTORY_PAGE_SIZE = 10

/**
 * One submission of the learner, as Learning lists it (contract `submission-history-v1`). `kind` is PRACTICE, WRITING,
 * SPEAKING, TOPIC_TEST, COURSE_TEST or PRACTICE_TEST; a field that does not apply to the kind is null. A kind this version does
 * not know still parses, and the view shows it as a plain line.
 */
export const submissionHistoryItemSchema = z.object({
  kind: z.string(),
  id: z.guid(),
  submittedAt: z.string(),
  skill: z.string().nullish(),
  task: z.string().nullish(),
  promptPreview: z.string().nullish(),
  band: z.number().nullish(),
  percent: z.number().nullish(),
  correctCount: z.number().int().nullish(),
  totalCount: z.number().int().nullish(),
  passed: z.boolean().nullish(),
  status: z.string().nullish(),
  lessonId: z.guid().nullish(),
  topicId: z.guid().nullish(),
  courseId: z.guid().nullish(),
  attemptId: z.guid().nullish(),
  packageVersionId: z.guid().nullish(),
  revisionNo: z.number().int().nullish(),
  /** KP_PRACTICE only: the point practised; its code and name are missing when the catalog did not answer. */
  knowledgePointId: z.guid().nullish(),
  knowledgePointCode: z.string().nullish(),
  knowledgePointName: z.string().nullish(),
})
export type SubmissionHistoryItem = z.infer<typeof submissionHistoryItemSchema>

const pageSchema = z.object({
  items: z.array(submissionHistoryItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  hasNext: z.boolean(),
})
export type SubmissionHistoryPage = z.infer<typeof pageSchema>

/**
 * What was submitted inside a course (`COURSE`), the free practice Writing or Speaking of the practice bank (`FREE`), or the free
 * practice sets on one knowledge point (`KNOWLEDGE`).
 */
export type HistoryScope = 'COURSE' | 'FREE' | 'KNOWLEDGE'

export async function listSubmissionHistory(
  scope: HistoryScope, skill: 'WRITING' | 'SPEAKING' | null, page: number, size: number = HISTORY_PAGE_SIZE, signal?: AbortSignal,
) {
  const query = queryString({ scope, page, size, skill })
  return pageSchema.parse(await apiRequest<unknown>(`/api/learning/submission-history?${query}`, { auth: true, signal }))
}

/** The free practice of one knowledge point since an essay: how many sets, and the latest of them. */
export const practiceSinceSchema = z.object({
  knowledgePointId: z.guid(),
  attempts: z.number().int().nonnegative(),
  lastAttemptId: z.guid(),
  lastSubmittedAt: z.string(),
  lastCorrectCount: z.number().int().nullish(),
  lastTotalCount: z.number().int().nullish(),
  lastPassed: z.boolean().nullish(),
})
export type PracticeSince = z.infer<typeof practiceSinceSchema>

/** At most this many points are asked about at once (the service refuses more). */
export const MAX_PRACTICE_POINTS = 20

/** What the learner practised on `knowledgePointIds` since essay `submissionId`; a point not practised since is absent. */
export async function getPracticeSinceEssay(submissionId: string, knowledgePointIds: readonly string[], signal?: AbortSignal) {
  const ids = [...new Set(knowledgePointIds)].slice(0, MAX_PRACTICE_POINTS)
  if (ids.length === 0) return []
  const query = queryString({ submissionId, knowledgePointIds: ids.join(',') })
  return z.array(practiceSinceSchema).parse(
    await apiRequest<unknown>(`/api/learning/submission-history/practice-since-essay?${query}`, { auth: true, signal }),
  )
}
