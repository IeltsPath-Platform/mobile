// Ported from frontend/src/features/practice/speaking/speakingApi.ts. Keep behaviour in step with the web version.
import { apiRequest } from '@/src/lib/api-client'

export interface SpeakingQuestion {
  questionVersionId: string
  sortOrder: number
  prompt: string
  /** How long the learner may speak on the question; null when the question sets no limit. */
  durationSeconds: number | null
}

/** One part (1, 2 or 3) of a Speaking practice test with its questions in the order the examiner asks them. */
export interface SpeakingTask {
  packageId: string
  packageVersionId: string
  sectionId: string
  packageTitle: string
  title: string
  partNo: number | null
  timeLimitSeconds: number | null
  instructions: string | null
  questions: SpeakingQuestion[]
}

export function getSpeakingTask(packageVersionId: string, sectionId: string, signal?: AbortSignal) {
  return apiRequest<SpeakingTask>(`/api/content/practice-tests/${packageVersionId}/sections/${sectionId}/speaking-task`, { auth: true, signal })
}
