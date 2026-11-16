// Ported from frontend/src/features/practice/writing/examinerApi.ts. Keep behaviour in step with the web version.
import { z } from 'zod'
import { apiRequest } from '@/src/lib/api-client'
import { queryString } from '../model/query-string'
import type { WritingSubmission } from './writing'

/** Public base URL of the Supabase avatars bucket, the same default the web app uses. */
const AVATARS_BUCKET_URL = (process.env.EXPO_PUBLIC_SUPABASE_AVATARS_URL ?? 'https://kndrsdqzbzsaiuuruqno.supabase.co/storage/v1/object/public/avatars').replace(/\/+$/, '')

/** A full avatar URL from what user-service stores: a URL as is, or a key inside the avatars bucket. */
function resolveSupabaseAvatarUrl(rawReference: string, fallbackUrl: string): string {
  const trimmed = rawReference.trim()
  if (!trimmed) return fallbackUrl
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const normalized = trimmed.replace(/^\/+/, '').replace(/^Buckets\/avatars\/+/i, '').replace(/^avatars\/+/i, '')
    .replace(/^storage\/v1\/object\/public\/avatars\/+/i, '').replace(/^\/+/, '')
  if (!normalized || normalized.includes('..')) return fallbackUrl
  return `${AVATARS_BUCKET_URL}/${normalized}`
}

const certificateSchema = z.object({
  name: z.string(),
  issuer: z.string().nullish(),
  year: z.number().nullish(),
  score: z.string().nullish(),
})

/** What a learner sees of an examiner when choosing who grades: name, photo, band, certificates. No workload limit. */
export const examinerSchema = z.object({
  id: z.guid(),
  displayName: z.string(),
  avatarUrl: z.string().nullish().transform((val) => (val ? resolveSupabaseAvatarUrl(val, val) : val)),
  bio: z.string().nullish(),
  ieltsBand: z.number().nullish(),
  certificates: z.array(certificateSchema),
  acceptingSubmissions: z.boolean(),
})
export type Examiner = z.infer<typeof examinerSchema>

const availabilitySchema = z.array(z.object({ examinerId: z.guid(), full: z.boolean(), backlog: z.boolean().default(false) }))
const MAX_AVAILABILITY_IDS = 50

/** Examiners who cannot take another submission: {@code full} is all of them, {@code backlog} those held back by late jobs. */
export interface ExaminerAvailability { full: Set<string>; backlog: Set<string> }

/** The examiners who take new submissions. */
export async function listExaminers(signal?: AbortSignal) {
  return z.array(examinerSchema).parse(await apiRequest<unknown>('/api/users/examiners', { auth: true, signal }))
}

export async function getExaminer(examinerId: string, signal?: AbortSignal) {
  return examinerSchema.parse(await apiRequest<unknown>(`/api/users/examiners/${z.guid().parse(examinerId)}`, { auth: true, signal }))
}

/**
 * Which of the examiners cannot take another submission now: their daily limit is reached, they stopped taking work, or too
 * many of their jobs are late (they take no new one until they grade some).
 */
export async function getFullExaminers(ids: string[], signal?: AbortSignal): Promise<ExaminerAvailability> {
  if (ids.length === 0) return { full: new Set(), backlog: new Set() }
  const unique = [...new Set(ids)].slice(0, MAX_AVAILABILITY_IDS)
  const query = queryString({ ids: unique.join(',') })
  const rows = availabilitySchema.parse(await apiRequest<unknown>(`/api/assessments/examiners/availability?${query}`, { auth: true, signal }))
  return {
    full: new Set(rows.filter((row) => row.full).map((row) => row.examinerId)),
    backlog: new Set(rows.filter((row) => row.backlog).map((row) => row.examinerId)),
  }
}

export interface ExaminerSubmissionInput {
  requestId: string
  packageVersionId: string
  questionVersionId: string
  essayText: string
  examinerId: string
}

/** Sends the essay to the chosen examiner instead of the AI. Needs Premium with a grading credit left. */
export function submitToExaminer(input: ExaminerSubmissionInput) {
  return apiRequest<WritingSubmission>('/api/learning/free-writing/examiner-submissions', { method: 'POST', auth: true, body: input })
}

const pendingSchema = z.object({ pending: z.boolean(), submissionId: z.guid().nullish() })

/**
 * The learner's last essay for this prompt that went to a teacher who has not graded it yet, or null. Asked before writing
 * again, so the learner hears it before spending time on an essay that cannot be sent.
 */
export async function getPendingExaminerSubmission(questionVersionId: string, signal?: AbortSignal) {
  const query = queryString({ questionVersionId: z.guid().parse(questionVersionId) })
  const answer = pendingSchema.parse(await apiRequest<unknown>(`/api/learning/free-writing/examiner-submissions/pending?${query}`, { auth: true, signal }))
  return answer.pending ? answer.submissionId ?? null : null
}

const annotationSchema = z.object({
  excerpt: z.string(),
  start: z.number().int(),
  end: z.number().int(),
  errorCode: z.string().nullish(),
  suggestion: z.string().nullish(),
})

/**
 * The examiner's review of an essay: PENDING until they finish; the grade fields are only there when DONE. CANCELLED when
 * the learner gave up a late request and took the credit back.
 */
export const humanReviewSchema = z.object({
  reviewSubmissionId: z.guid(),
  examinerId: z.guid().nullish(),
  status: z.enum(['PENDING', 'DONE', 'CANCELLED']),
  band: z.number().nullish(),
  criteria: z.array(z.object({ criterion: z.string(), band: z.number(), comment: z.string().nullish() })).nullish(),
  errorCodes: z.array(z.string()).nullish(),
  feedback: z.string().nullish(),
  annotations: z.array(annotationSchema).nullish(),
  // Read one by one by readStudyPoints, so a point that does not match is left out instead of failing the whole review.
  studyPoints: z.array(z.unknown()).nullish(),
})
export type HumanReview = z.infer<typeof humanReviewSchema>
export type ReviewAnnotation = z.infer<typeof annotationSchema>

/** What the learner should study after the examiner's grade: a marked error or a weak criterion, applied to mastery. */
const examinerStudyPointSchema = z.object({
  kind: z.enum(['ERROR_CODE', 'CRITERION']),
  errorCode: z.string().nullish(),
  count: z.number().int().nullish(),
  criterionCode: z.string().nullish(),
  band: z.number().nullish(),
  knowledgePointId: z.guid().nullish(),
  code: z.string().nullish(),
  name: z.string().nullish(),
  practiceKnowledgePointId: z.guid().nullish(),
  reviewItemId: z.guid().nullish(),
})
export type ExaminerStudyPoint = z.infer<typeof examinerStudyPointSchema>

/** The readable study points of a review; any other entry is dropped. */
export function readStudyPoints(raw: readonly unknown[] | null | undefined): ExaminerStudyPoint[] {
  return (raw ?? []).flatMap((item) => {
    const parsed = examinerStudyPointSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

export async function getHumanReview(submissionId: string, signal?: AbortSignal) {
  return humanReviewSchema.parse(await apiRequest<unknown>(`/api/learning/writing-submissions/${z.guid().parse(submissionId)}/human-review`, { auth: true, signal }))
}
