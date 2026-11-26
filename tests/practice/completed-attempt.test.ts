import { describe, expect, it } from 'vitest'
import { attemptCovers, isExactScope } from '@/src/features/practice/model/completed-attempt'
import type { ReadingHistoryItem } from '@/src/features/practice/api/attempts'

const item = (overrides: Partial<ReadingHistoryItem>): ReadingHistoryItem => ({
  attemptId: 'a1', packageId: 'p1', packageVersionId: 'v1', skill: 'READING', scope: 'PART', partNos: [2], status: 'SUBMITTED', submittedAt: '2026-10-30T10:00:00Z', percent: 50,
  ...overrides,
})

describe('attemptCovers', () => {
  it('matches a submitted attempt of the same part', () => {
    expect(attemptCovers(item({}), 'p1', 2)).toBe(true)
  })

  it('does not match another part or another test', () => {
    expect(attemptCovers(item({}), 'p1', 3)).toBe(false)
    expect(attemptCovers(item({}), 'other', 2)).toBe(false)
  })

  it('lets a full attempt stand in for a part it included', () => {
    expect(attemptCovers(item({ scope: 'FULL', partNos: [1, 2, 3] }), 'p1', 3)).toBe(true)
  })

  it('matches a full card only with a full attempt', () => {
    expect(attemptCovers(item({ scope: 'FULL', partNos: [1, 2, 3] }), 'p1', undefined)).toBe(true)
    expect(attemptCovers(item({}), 'p1', undefined)).toBe(false)
  })

  it('ignores an attempt that was not submitted', () => {
    expect(attemptCovers(item({ status: 'IN_PROGRESS' }), 'p1', 2)).toBe(false)
  })
})

describe('isExactScope', () => {
  it('prefers an attempt of the card\'s own scope', () => {
    expect(isExactScope(item({ scope: 'PART' }), 'PART')).toBe(true)
    expect(isExactScope(item({ scope: 'FULL' }), 'PART')).toBe(false)
  })
})
