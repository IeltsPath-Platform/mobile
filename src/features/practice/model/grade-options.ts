// Ported from frontend/src/features/practice/writing/gradeOptions.ts. Keep behaviour in step with the web version.
import type { Subscription } from '../api/access'

/** Sending the essay to a teacher: allowed with Premium and a grading credit left. */
export interface TeacherOption {
  enabled: boolean
  /** Credits left; null when the subscription could not be read (the server then decides). */
  credits: number | null
  /** Why it is not open; null when it is. */
  reason: string | null
}

/** Letting the AI grade: allowed when the points cover the cost. */
export interface AiOption {
  enabled: boolean
  cost: number
  reason?: string | null
  /** null when the balance could not be read (the grader then decides). */
  balance: number | null
  shortBy: number
}

export interface GradeOptions { teacher: TeacherOption; ai: AiOption }

export const NO_PREMIUM = 'Cần gói Premium để gửi giáo viên chấm.'
export const NO_CREDITS = 'Gói Premium của bạn đã hết lượt giáo viên chấm.'
export const TEACHER_PENDING = 'Bài này đã gửi giáo viên và đang chờ chấm. Bạn gửi lại được sau khi giáo viên chấm xong.'

/**
 * What the learner may choose when finishing an essay. `subscription` is null for a learner without any, undefined when it
 * could not be read; `balance` is null when it could not be read. An unreadable value leaves the option open, because the
 * server checks it again when the essay is sent.
 */
export function gradeOptions({ balance, cost, subscription, now = Date.now(), teacherPending = false }: {
  balance: number | null
  cost: number
  subscription: Subscription | null | undefined
  now?: number
  /** The last essay for this prompt was sent to a teacher who has not graded it yet: sending again would cost another credit. */
  teacherPending?: boolean
}): GradeOptions {
  const teacher = teacherOption(subscription, now)
  return {
    teacher: teacherPending && teacher.enabled ? { ...teacher, enabled: false, reason: TEACHER_PENDING } : teacher,
    ai: aiOption(balance, cost),
  }
}

function teacherOption(subscription: Subscription | null | undefined, now: number): TeacherOption {
  if (subscription === undefined) return { enabled: true, credits: null, reason: null }
  const expired = subscription !== null && subscription.endsAt !== null && Date.parse(subscription.endsAt) <= now
  if (subscription === null || subscription.status !== 'ACTIVE' || expired) return { enabled: false, credits: 0, reason: NO_PREMIUM }
  if (subscription.remainingCredits <= 0) return { enabled: false, credits: 0, reason: NO_CREDITS }
  return { enabled: true, credits: subscription.remainingCredits, reason: null }
}

function aiOption(balance: number | null, cost: number): AiOption {
  if (balance === null) return { enabled: true, cost, balance, shortBy: 0 }
  return { enabled: balance >= cost, cost, balance, shortBy: Math.max(0, cost - balance) }
}
