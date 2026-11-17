// Ported from frontend/src/features/practice/lib/historyTitles.ts. Keep behaviour in step with the web version.
import type { ReadingHistoryItem, ReadingScope, ReadingTestCard } from '../api/attempts'

export interface HistoryTitleRequest {
  scope: ReadingScope
  only: Array<{ packageId: string; partNo: number | null }>
}

export function historyTitleRequests(items: ReadingHistoryItem[]): HistoryTitleRequest[] {
  if (items.length === 0) return []
  const partKeys = new Map<string, { packageId: string; partNo: number | null }>()
  const fullKeys = new Map<string, { packageId: string; partNo: null }>()
  for (const item of items) {
    if (item.scope === 'PART') {
      for (const partNo of item.partNos) partKeys.set(`${item.packageId}:${partNo}`, { packageId: item.packageId, partNo })
    } else {
      fullKeys.set(item.packageId, { packageId: item.packageId, partNo: null })
    }
  }
  const requests: HistoryTitleRequest[] = []
  if (partKeys.size) requests.push({ scope: 'PART', only: [...partKeys.values()].slice(0, 500) })
  if (fullKeys.size) requests.push({ scope: 'FULL', only: [...fullKeys.values()].slice(0, 500) })
  return requests
}

export function historyTitleMap(requests: Array<{ scope: ReadingScope; items: ReadingTestCard[] }>) {
  const titles = new Map<string, string>()
  for (const request of requests) {
    for (const card of request.items) {
      titles.set(`${request.scope}:${card.packageId}:${request.scope === 'PART' ? card.parts[0]?.partNo ?? '' : ''}`, card.title)
    }
  }
  return titles
}
