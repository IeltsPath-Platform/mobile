import { describe, expect, it } from 'vitest'
import { criterionName, markByOffsets, shownMarks } from '@/src/features/practice/model/review-marks'

const essay = 'The figure have rose dramatically. Business led in 2010.'
const mark = (start: number, end: number, suggestion = 'fix') => ({ excerpt: essay.slice(start, end), start, end, errorCode: 'VERB_FORM', suggestion })

describe('markByOffsets', () => {
  it('cuts the essay at the marks, numbers them in reading order and keeps every character', () => {
    const segments = markByOffsets(essay, [mark(35, 55, 'later'), mark(11, 20, 'have risen')])

    expect(segments.map((segment) => segment.number)).toEqual([undefined, 1, undefined, 2, undefined])
    expect(segments.map((segment) => segment.text).join('')).toBe(essay)
    expect(segments[1].annotation?.suggestion).toBe('have risen')
  })

  it('leaves out a mark that does not quote the essay at its place or that overlaps the one before', () => {
    const wrongText = { ...mark(11, 20), excerpt: 'something else' }
    const outside = { excerpt: 'x', start: 999, end: 1000, errorCode: 'A', suggestion: 'b' }

    expect(shownMarks(markByOffsets(essay, [wrongText, outside]))).toEqual([])
    expect(shownMarks(markByOffsets(essay, [mark(11, 20), mark(15, 25)]))).toHaveLength(1)
  })

  it('shows an unmarked or empty essay as one piece', () => {
    expect(markByOffsets(essay, [])).toEqual([{ text: essay }])
    expect(markByOffsets('', [])).toEqual([{ text: '' }])
  })
})

describe('criterionName', () => {
  it('names the four criteria and passes an unknown one through', () => {
    expect(criterionName('taskResponse')).toBe('Task Response / Achievement')
    expect(criterionName('grammar')).toBe('Grammatical Range & Accuracy')
    expect(criterionName('other')).toBe('other')
  })
})
