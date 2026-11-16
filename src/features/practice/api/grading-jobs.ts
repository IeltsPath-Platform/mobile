// Ported from frontend/src/features/practice/writing/gradingJobApi.ts. Keep behaviour in step with the web version.
import { z } from 'zod'
import { ApiError, apiRequest } from '@/src/lib/api-client'

/** Where a learner's job stands: waiting for the chosen examiner, late (48 hours), finished or closed (human-review-v1). */
export const jobStateSchema = z.enum(['AWAITING_CHOICE', 'WAITING', 'OVERDUE', 'COMPLETED', 'CANCELLED', 'CLOSED'])
export type JobState = z.infer<typeof jobStateSchema>

export const myGradingJobSchema = z.object({
  id: z.guid(),
  /** The review id Learning holds for a Practice or Lesson essay; absent for exam attempts. */
  reviewSubmissionId: z.guid().nullish(),
  skill: z.string().nullish(),
  source: z.string().nullish(),
  state: jobStateSchema,
  examinerId: z.guid().nullish(),
  requestedAt: z.string().nullish(),
  deadline: z.string().nullish(),
  canChoose: z.boolean(),
  /** True for a late job whose examiner can no longer be changed: the learner may cancel it and take the credit back. */
  canCancel: z.boolean().default(false),
  /** How many more times the learner may replace the examiner; starts at 2. */
  changesLeft: z.number().int().nonnegative(),
  createdAt: z.string(),
  /** The examiner's band and when they finished; only there once the job is COMPLETED. */
  band: z.number().nullish(),
  completedAt: z.string().nullish(),
})
export type MyGradingJob = z.infer<typeof myGradingJobSchema>

export async function getMyGradingJobs(signal?: AbortSignal) {
  return z.array(myGradingJobSchema).parse(await apiRequest<unknown>('/api/assessments/grading-jobs/mine', { auth: true, signal }))
}

/** The learner's job for a Practice or Lesson essay, found by the review id; null when there is none. */
export async function findJobOfReview(reviewSubmissionId: string, signal?: AbortSignal) {
  return (await getMyGradingJobs(signal)).find((job) => job.reviewSubmissionId === reviewSubmissionId) ?? null
}

/** Replaces the examiner of a late job. The learner keeps the Premium credit already spent: nothing more is charged. */
export async function changeExaminer(jobId: string, examinerId: string) {
  return myGradingJobSchema.parse(await apiRequest<unknown>(`/api/assessments/grading-jobs/${z.guid().parse(jobId)}/examiner`, {
    auth: true, method: 'POST', body: { examinerId },
  }))
}

/**
 * Gives up a late request whose examiner can no longer be changed. The Premium credit goes back to the learner, who can send
 * the essay again. Repeating it after a failure finishes what was left.
 */
export function cancelRequest(reviewSubmissionId: string) {
  return apiRequest<unknown>(`/api/learning/examiner-reviews/${z.guid().parse(reviewSubmissionId)}/cancel`, { auth: true, method: 'POST' })
}

/** What to tell the learner when cancelling did not work. */
export function cancelRequestMessage(cause: unknown) {
  if (!(cause instanceof ApiError)) return 'Chưa hủy được yêu cầu. Hãy thử lại.'
  if (cause.code === 'REVIEW_CANCEL_NOT_ALLOWED') return 'Chưa hủy được: bài chưa quá hạn hoặc bạn vẫn còn lần đổi giáo viên.'
  if (cause.status === 409) return 'Giáo viên vừa chấm xong bài này nên không hủy được. Hãy tải lại trang để xem kết quả.'
  if (cause.status === 503) return 'Chưa hoàn được lượt chấm. Bài đã hủy, hãy bấm hủy lại để nhận lại lượt.'
  return cause.message
}

const CHANGE_REFUSED: Record<string, string> = {
  NOT_OVERDUE: 'Chưa quá 48 giờ nên chưa đổi được giáo viên.',
  LIMIT_REACHED: 'Bạn đã dùng hết 2 lần đổi giáo viên cho bài này.',
  SAME_EXAMINER: 'Hãy chọn một giáo viên khác với giáo viên hiện tại.',
}

/** What to tell the learner when replacing the examiner did not work. */
export function changeExaminerMessage(cause: unknown) {
  if (!(cause instanceof ApiError)) return 'Chưa đổi được giáo viên. Hãy thử lại.'
  if (cause.code === 'EXAMINER_UNAVAILABLE') return 'Giáo viên này vừa đủ bài hôm nay, đang tắt nhận bài hoặc tạm chưa nhận bài mới. Hãy chọn giáo viên khác.'
  if (cause.code === 'EXAMINER_CHANGE_NOT_ALLOWED') {
    const reason = cause.details.reason ?? ''
    return CHANGE_REFUSED[reason] ?? cause.message
  }
  if (cause.status === 409) return 'Bài này đã được chấm xong, không đổi giáo viên được nữa.'
  return cause.message
}
