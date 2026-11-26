import { describe, expect, it } from 'vitest'
import type { WritingCorrection } from '@/src/features/practice/api/writing'
import { certaintyOf, correctedEssay, errorNames, markEssay, segmentAt } from '@/src/features/practice/model/writing-result-model'

const ESSAY = 'The chart shows sales. Sales rose to 40 in 2020. Sales fell to 10 in 2021. I think this is sad.'
const FELL = 'Sales fell to 10 in 2021.'

function correction(excerpt: string, suggestion: string, extra: Partial<WritingCorrection> = {}): WritingCorrection {
  return { excerpt, suggestion, category: 'GRAMMAR', ...extra }
}

describe('certaintyOf', () => {
  it('treats a correction without a certainty as an error, and reads a suggestion as one', () => {
    expect(certaintyOf(correction('a', 'b'))).toBe('ERROR')
    expect(certaintyOf(correction('a', 'b', { certainty: 'ERROR' }))).toBe('ERROR')
    expect(certaintyOf(correction('a', 'b', { certainty: 'SUGGESTION' }))).toBe('SUGGESTION')
  })
})

describe('markEssay', () => {
  it('cuts the essay at the range the server sent', () => {
    const segments = markEssay(ESSAY, [correction(FELL, 'Sales fell to 15 in 2021.', { start: 49, end: 74 })])

    expect(segments.map((segment) => segment.text).join('')).toBe(ESSAY)
    const marked = segments.filter((segment) => segment.correction)
    expect(marked).toHaveLength(1)
    expect(marked[0]).toMatchObject({ text: FELL, start: 49 })
  })

  it('marks the occurrence the server named when the same words appear twice', () => {
    const essay = 'It is good. It is good.'
    const segments = markEssay(essay, [correction('It is good.', 'It is fine.', { start: 12, end: 23 })])

    expect(segments.map((segment) => [segment.text, segment.start, Boolean(segment.correction)])).toEqual([
      ['It is good. ', 0, false],
      ['It is good.', 12, true],
    ])
  })

  it('falls back to the first occurrence for a grade stored without a range', () => {
    const segments = markEssay(ESSAY, [correction(FELL, 'x')])

    expect(segments.find((segment) => segment.correction)).toMatchObject({ text: FELL, start: 49 })
  })

  it('does not trust a range that no longer reads as the excerpt', () => {
    const segments = markEssay(ESSAY, [correction(FELL, 'x', { start: 0, end: 25 })])

    expect(segments.find((segment) => segment.correction)).toMatchObject({ text: FELL, start: 49 })
  })

  it('draws the correction that starts first when two overlap, and leaves the other to the list', () => {
    const first = correction('Sales rose to 40', 'a', { start: 23, end: 39 })
    const second = correction('to 40 in 2020', 'b', { start: 33, end: 46 })

    const marked = markEssay(ESSAY, [second, first]).filter((segment) => segment.correction)

    expect(marked.map((segment) => segment.correction)).toEqual([first])
  })

  it('leaves out a correction whose excerpt is not in the essay, and keeps the essay whole', () => {
    const segments = markEssay(ESSAY, [correction('not written here', 'x'), correction('', 'y')])

    expect(segments).toEqual([{ text: ESSAY, start: 0 }])
  })

  it('returns no segments for an empty essay', () => {
    expect(markEssay('', [correction('a', 'b')])).toEqual([])
  })
})

describe('correctedEssay', () => {
  it('puts each suggestion in place of the words it replaces and marks what changed', () => {
    const segments = correctedEssay(ESSAY, [correction(FELL, 'Sales fell to 15 in 2021.', { start: 49, end: 74 })])

    expect(segments.map((segment) => segment.text).join('')).toBe(ESSAY.replace(FELL, 'Sales fell to 15 in 2021.'))
    expect(segments.filter((segment) => segment.changed).map((segment) => segment.text)).toEqual(['Sales fell to 15 in 2021.'])
  })

  it('leaves the essay as it is when no correction can be placed', () => {
    expect(correctedEssay(ESSAY, [correction('not written here', 'x')])).toEqual([{ text: ESSAY, changed: false }])
  })
})

describe('segmentAt', () => {
  it('finds the segment that holds an excerpt, and none for text the essay lacks', () => {
    const segments = markEssay(ESSAY, [correction(FELL, 'x', { start: 49, end: 74 })])

    expect(segmentAt(segments, ESSAY, 'Sales rose')?.start).toBe(0)
    expect(segmentAt(segments, ESSAY, 'fell to 10')?.start).toBe(49)
    expect(segmentAt(segments, ESSAY, 'absent')).toBeNull()
    expect(segmentAt(segments, ESSAY, '')).toBeNull()
  })
})

describe('errorNames', () => {
  it('reads names from the groups and the corrections of the result', () => {
    const names = errorNames(
      [correction('a', 'b', { errorCode: 'TENSE', errorName: 'Thì' }), correction('c', 'd', { errorCode: 'NO_NAME' })],
      [{ errorCode: 'ARTICLE', errorName: 'Mạo từ', count: 1, severity: 2 }, { errorCode: 'BARE', count: 1, severity: 1 }],
    )

    expect(names.get('TENSE')).toBe('Thì')
    expect(names.get('ARTICLE')).toBe('Mạo từ')
    expect(names.has('NO_NAME')).toBe(false)
    expect(names.has('BARE')).toBe(false)
  })
})
