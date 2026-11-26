// Ported from frontend/src/features/practice/writing/examinerReviewsView.ts. Keep behaviour in step with the web version.
import type { ExaminerReviewItem } from '../api/examiner-reviews'
import type { MyGradingJob } from '../api/grading-jobs'

export type ReviewFilter = 'ALL' | 'DONE' | 'WAITING'

/** One essay of the list: what Learning knows of it, joined with how the examiner's job stands. */
export interface ReviewRow extends ExaminerReviewItem {
  done: boolean
  /** The learner gave up the request and took the credit back: it is neither waiting nor graded. */
  cancelled: boolean
  band: number | null
  completedAt: string | null
  /** The job, so a late one can be told from one still within its 48 hours. */
  job: MyGradingJob | null
}

/** Joins the essays with the learner's jobs by the review id; an essay whose job is not found counts as still waiting. */
export function joinReviews(items: readonly ExaminerReviewItem[], jobs: readonly MyGradingJob[]): ReviewRow[] {
  const byReview = new Map(jobs.filter((job) => job.reviewSubmissionId).map((job) => [job.reviewSubmissionId as string, job] as const))
  return items.map((item) => {
    const job = byReview.get(item.reviewSubmissionId) ?? null
    const done = job?.state === 'COMPLETED'
    return { ...item, job, done, cancelled: job?.state === 'CANCELLED', band: done ? job?.band ?? null : null, completedAt: done ? job?.completedAt ?? null : null }
  })
}

const isWaiting = (row: ReviewRow) => !row.done && !row.cancelled

/** Graded essays first (newest grade first), then the ones still waiting in the order they were sent, cancelled ones last. */
export function viewReviews(rows: readonly ReviewRow[], filter: ReviewFilter): ReviewRow[] {
  const shown = rows.filter((row) => filter === 'ALL' || (filter === 'DONE' ? row.done : isWaiting(row)))
  const finishedAt = (row: ReviewRow) => (row.completedAt ? Date.parse(row.completedAt) : 0)
  return [...shown].sort((a, b) => Number(b.done) - Number(a.done) || Number(a.cancelled) - Number(b.cancelled)
    || finishedAt(b) - finishedAt(a) || Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
}

export const countReviews = (rows: readonly ReviewRow[]) => ({
  ALL: rows.length,
  DONE: rows.filter((row) => row.done).length,
  WAITING: rows.filter(isWaiting).length,
})

const SOURCE_TEXT: Record<string, string> = {
  FREE_WRITING: 'Luyện viết tự do',
  PRACTICE_ITEM: 'Luyện tập',
  LESSON_BLOCK: 'Bài học',
}

export const sourceText = (source: string | null | undefined) => SOURCE_TEXT[source ?? ''] ?? 'Bài viết'

export const taskText = (task: string | null | undefined) => (task === 'TASK_1' ? 'Task 1' : task === 'TASK_2' ? 'Task 2' : 'Writing')

export function dateText(iso: string | null | undefined) {
  const date = iso ? new Date(iso) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN') : ''
}

/** Date and time to the minute, e.g. "21:30, 6/11/2026"; empty when there is no valid moment. */
export function dateTimeText(iso: string | null | undefined) {
  const date = iso ? new Date(iso) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${time}, ${date.toLocaleDateString('vi-VN')}`
}
