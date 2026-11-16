import { describe, expect, it } from 'vitest'
import { progressKey, submissionsByKey, toCatalogKeyFilter } from '@/src/features/practice/model/progress-keys'

describe('progressKey', () => {
  it('names a part test by its package and part, and a full test by "full"', () => {
    expect(progressKey('pkg-1', 2)).toBe('pkg-1:2')
    expect(progressKey('pkg-1', null)).toBe('pkg-1:full')
  })
})

describe('submissionsByKey', () => {
  it('maps each finished test to its graded answer', () => {
    const found = submissionsByKey([
      { packageId: 'pkg-1', partNo: 2, submissionId: 'sub-a' },
      { packageId: 'pkg-1', partNo: null, submissionId: 'sub-b' },
    ])

    expect(found.get(progressKey('pkg-1', 2))).toBe('sub-a')
    expect(found.get(progressKey('pkg-1', null))).toBe('sub-b')
  })

  it('leaves out a finished test that names no answer, as Reading and Listening do', () => {
    expect(submissionsByKey([{ packageId: 'pkg-1', partNo: 1 }]).size).toBe(0)
  })
})

describe('toCatalogKeyFilter', () => {
  it('lists only the finished tests for the done tab, and none at all when nothing is finished', () => {
    expect(toCatalogKeyFilter('completed', [])).toBe('EMPTY')
    expect(toCatalogKeyFilter('completed', [{ packageId: 'pkg-1', partNo: 2 }])).toEqual({ only: [{ packageId: 'pkg-1', partNo: 2 }] })
  })

  it('hides the finished tests from the other tab', () => {
    expect(toCatalogKeyFilter('uncompleted', [])).toEqual({})
    expect(toCatalogKeyFilter('uncompleted', [{ packageId: 'pkg-1', partNo: null }])).toEqual({ exclude: [{ packageId: 'pkg-1', partNo: null }] })
  })
})
