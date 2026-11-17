// Ported from frontend/src/features/practice/speaking/speakingPracticeApi.ts. Keep behaviour in step with the web version.
import { File as ExpoFile } from 'expo-file-system'

import { apiRequest } from '@/src/lib/api-client'

/** What AI grading of a Speaking submission costs and the largest file the server accepts for one question. */
export interface SpeakingTerms {
  enabled?: boolean
  pointCost: number
  maxRecordingBytes: number
  retentionDays: number
}

export type SpeakingSubmissionStatus =
  | 'UPLOADING' | 'QUEUED' | 'ANALYZING' | 'GRADING' | 'PAYMENT_PENDING' | 'GRADED'
  | 'FAILED_RETRYABLE' | 'NEEDS_EXAMINER' | 'ABANDONED'

export interface SpeakingSubmissionRecording {
  questionVersionId: string
  sectionId: string
  partNo: number
  questionNo: number
  uploaded: boolean
  durationMs: number | null
}

export interface SpeakingSubmission {
  id: string
  packageVersionId: string
  scope: 'FULL' | 'PART'
  status: SpeakingSubmissionStatus
  pointCost: number
  failureCode: string | null
  createdAt: string
  recordings: SpeakingSubmissionRecording[]
  result?: Record<string, unknown> | null
}

const BASE = '/api/learning/speaking-practice'
/** A recording of a couple of minutes over a slow line needs longer than the usual request time. */
const UPLOAD_TIMEOUT_MS = 120_000

export function getSpeakingTerms(signal?: AbortSignal) {
  return apiRequest<SpeakingTerms>(`${BASE}/terms`, { auth: true, signal })
}

/** Opens the submission; the server checks the points (402 when short) and that no other submission is waiting (409). */
export function createSpeakingSubmission(input: { requestId: string; packageVersionId: string; partSectionIds: string[]; consent: boolean }) {
  return apiRequest<SpeakingSubmission>(`${BASE}/submissions`, { method: 'POST', auth: true, body: input })
}

/**
 * Sends one answer: a WAV file on the device. Expo SDK 58's fetch reads a multipart part through bytes(); React Native's
 * `{ uri }` part is refused there before any request is made (it surfaced as a lost connection), so the part reads the
 * file itself.
 */
export function uploadSpeakingRecording(submissionId: string, questionVersionId: string, wavUri: string, durationMs: number) {
  const wav = new ExpoFile(wavUri)
  const form = new FormData()
  form.append('file', { name: 'answer.wav', type: 'audio/wav', bytes: () => wav.bytes() } as unknown as Blob)
  form.append('durationMs', String(Math.max(0, Math.round(durationMs))))
  return apiRequest<SpeakingSubmission>(`${BASE}/submissions/${submissionId}/recordings/${questionVersionId}`, {
    method: 'PUT', auth: true, body: form, timeoutMs: UPLOAD_TIMEOUT_MS,
  })
}

export function completeSpeakingSubmission(submissionId: string) {
  return apiRequest<SpeakingSubmission>(`${BASE}/submissions/${submissionId}/complete`, { method: 'POST', auth: true })
}

/**
 * Releases the grade of a graded submission and takes its points. The server does this in the learner's own request
 * (402 when the balance has fallen short since the check; safe to repeat), so the result page calls it by itself.
 */
export function settleSpeakingSubmission(submissionId: string) {
  return apiRequest<SpeakingSubmission>(`${BASE}/submissions/${submissionId}/settle`, { method: 'POST', auth: true })
}

export function getSpeakingSubmission(submissionId: string, signal?: AbortSignal) {
  return apiRequest<SpeakingSubmission>(`${BASE}/submissions/${submissionId}`, { auth: true, signal })
}
