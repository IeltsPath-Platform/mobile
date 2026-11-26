// Ported from frontend/src/features/practice/lib/completedAttempt.ts. Keep behaviour in step with the web version.
import type { ReadingHistoryItem, ReadingScope } from '../api/attempts'

/**
 * Whether a submitted attempt is a run of the test on a catalog card. A card for one part (`partNo` given) is covered by
 * an attempt of that part and also by a full-test attempt that included it; a card for the full test only by a full attempt.
 */
export function attemptCovers(item: ReadingHistoryItem, packageId: string, partNo: number | undefined): boolean {
  if (item.status !== 'SUBMITTED' || item.packageId !== packageId) return false
  return partNo === undefined ? item.scope === 'FULL' : item.partNos.includes(partNo)
}

/** The attempt to show first: one of the same scope as the card, which beats a full attempt standing in for a part. */
export function isExactScope(item: ReadingHistoryItem, cardScope: ReadingScope): boolean {
  return item.scope === cardScope
}
