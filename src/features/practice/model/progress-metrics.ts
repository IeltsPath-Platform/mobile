// Ported from frontend/src/features/practice/lib/progressMetrics.ts. Keep behaviour in step with the web version.
export interface ProgressMetrics {
  completed: number
  percentage: number
  total: number
}

export function getProgressMetrics(completed: number, total: number): ProgressMetrics {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0
  const safeCompleted = Number.isFinite(completed) ? Math.min(Math.max(Math.trunc(completed), 0), safeTotal) : 0
  const percentage = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100)

  return { completed: safeCompleted, percentage, total: safeTotal }
}
