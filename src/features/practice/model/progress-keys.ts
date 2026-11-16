// Ported from frontend/src/features/practice/lib/progressKeys.ts. Keep behaviour in step with the web version.
export interface CatalogProgressKey {
  packageId: string
  partNo: number | null
}

export type ProgressTab = 'uncompleted' | 'completed'
export type CatalogKeyFilter = { only?: CatalogProgressKey[]; exclude?: CatalogProgressKey[] } | 'EMPTY'

/** The key a finished test is known by: its package and part ("full" for a whole test). */
export function progressKey(packageId: string, partNo: number | null) {
  return `${packageId}:${partNo ?? 'full'}`
}

/**
 * The graded answer to open for each finished test. Speaking and Writing name it in their progress list; Reading and
 * Listening do not, and are looked up in the attempt history when the learner asks for the result.
 */
export function submissionsByKey(completed: Array<{ packageId: string; partNo: number | null; submissionId?: string }>) {
  const found = new Map<string, string>()
  for (const item of completed) {
    if (item.submissionId) found.set(progressKey(item.packageId, item.partNo), item.submissionId)
  }
  return found
}

/** Builds the catalog's only/exclude filter while respecting the API meaning of only: []. */
export function toCatalogKeyFilter(tab: ProgressTab, completed: CatalogProgressKey[]): CatalogKeyFilter {
  const keys = completed.slice(0, 500)
  if (tab === 'completed') return keys.length === 0 ? 'EMPTY' : { only: keys }
  return keys.length === 0 ? {} : { exclude: keys }
}
