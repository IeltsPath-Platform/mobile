// Ported from frontend/src/features/practice/writing/examinerReviewsApi.ts. Keep behaviour in step with the web version.
import { z } from 'zod'
import { apiRequest } from '@/src/lib/api-client'
import { queryString } from '../model/query-string'

export const REVIEWS_PAGE_SIZE = 10

/** An essay the learner sent to an examiner; whether it was graded comes from the learner's grading jobs. */
export const examinerReviewItemSchema = z.object({
  submissionId: z.guid(),
  reviewSubmissionId: z.guid(),
  source: z.string().nullish(),
  task: z.string().nullish(),
  promptPreview: z.string().nullish(),
  wordCount: z.number().int().nonnegative(),
  requestedAt: z.string(),
})
export type ExaminerReviewItem = z.infer<typeof examinerReviewItemSchema>

const pageSchema = z.object({
  items: z.array(examinerReviewItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  hasNext: z.boolean(),
})

/** The learner's essays sent to an examiner, newest first. */
export async function listExaminerReviews(page: number, size: number = REVIEWS_PAGE_SIZE, signal?: AbortSignal) {
  const query = queryString({ page, size })
  return pageSchema.parse(await apiRequest<unknown>(`/api/learning/examiner-reviews?${query}`, { auth: true, signal }))
}

/** What an error the examiner marked means and how to fix it: only reviewed codes, the same a learner is ever shown. */
export const learnerErrorTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
  category: z.string().nullish(),
  fixHint: z.string().nullish(),
})
export type LearnerErrorType = z.infer<typeof learnerErrorTypeSchema>

export async function getApprovedErrorTypes(signal?: AbortSignal) {
  return z.array(learnerErrorTypeSchema).parse(await apiRequest<unknown>('/api/content/error-types/approved', { auth: true, signal }))
}

/** The error types by code, for looking a marked error up. Empty when the catalogue could not be read. */
export function errorTypesByCode(types: readonly LearnerErrorType[] | null | undefined) {
  return new Map((types ?? []).map((type) => [type.code, type] as const))
}
