// Ported from frontend/src/features/practice/lib/time.ts. Keep behaviour in step with the web version.
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}
