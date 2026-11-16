import { describe, expect, it } from 'vitest'
import { priorityFormats, rateFormats, skippedFormats, weakFormats } from '@/src/features/practice/model/practice-analysis'
import type { FormatStat } from '@/src/features/practice/model/practice-analysis'

const stat = (formatCode: string, total: number, correct: number, incorrect: number): FormatStat => ({
  formatCode, total, correct, incorrect, blank: total - correct - incorrect,
})

const priorities = (stats: FormatStat[]) =>
  rateFormats(stats).filter((format) => format.priority).map((format) => [format.formatCode, format.priority])

describe('rateFormats: which formats are a priority', () => {
  it('ranks only formats the learner answered', () => {
    // Only True/False/Not Given was really attempted; everything else was left blank.
    expect(priorities([
      stat('MULTIPLE_CHOICE_ONE', 6, 0, 0),
      stat('MATCHING_INFORMATION', 4, 0, 0),
      stat('GAP_FILLING', 3, 0, 0),
      stat('TRUE_FALSE_NOT_GIVEN', 6, 1, 2),
    ])).toEqual([['TRUE_FALSE_NOT_GIVEN', 1]])
  })

  it('gives priority 1 to the lowest share and priority 2 to the next lowest', () => {
    expect(priorities([stat('MULTIPLE_CHOICE_ONE', 10, 4, 6), stat('GAP_FILLING', 3, 0, 3), stat('MATCHING', 4, 4, 0)]))
      .toEqual([['GAP_FILLING', 1], ['MULTIPLE_CHOICE_ONE', 2]])
  })

  it('gives every format at the lowest share priority 1, instead of picking one of them', () => {
    // Both answered and both wrong: 0% and 0%.
    const rated = rateFormats([stat('MULTIPLE_CHOICE_ONE', 3, 0, 3), stat('MATCHING_INFORMATION', 2, 0, 2)])
    expect(rated.map((format) => [format.formatCode, format.priority])).toEqual([['MULTIPLE_CHOICE_ONE', 1], ['MATCHING_INFORMATION', 1]])
  })

  it('lists tied formats with the one that lost more questions first', () => {
    const rated = rateFormats([stat('GAP_FILLING', 2, 0, 2), stat('MULTIPLE_CHOICE_ONE', 6, 0, 6)])
    expect(priorityFormats(rated, 1).map((format) => format.formatCode)).toEqual(['MULTIPLE_CHOICE_ONE', 'GAP_FILLING'])
  })

  it('can tie at the second share as well', () => {
    // B and C are both 25%; C lost more questions, so it is listed before B.
    expect(priorities([stat('A', 4, 0, 4), stat('B', 4, 1, 3), stat('C', 8, 2, 6)])).toEqual([['A', 1], ['C', 2], ['B', 2]])
  })

  it('names no priority beyond the second share', () => {
    expect(priorities([stat('A', 10, 0, 10), stat('B', 10, 2, 8), stat('C', 10, 4, 6)])).toEqual([['A', 1], ['B', 2]])
  })

  it('treats formats at or above the weak line as no priority', () => {
    expect(priorities([stat('A', 4, 2, 2), stat('B', 4, 4, 0)])).toEqual([])
  })

  it('compares the shown percent, so 33% and 33% tie even when the exact shares differ', () => {
    expect(priorities([stat('A', 3, 1, 2), stat('B', 6, 2, 4)])).toEqual([['B', 1], ['A', 1]])
  })

  it('counts a format with some answers and some blanks by its share of all its questions', () => {
    // 1 right, 2 wrong, 3 blank is 17%: lower than 3 questions answered 1 right (33%).
    expect(priorities([stat('A', 6, 1, 2), stat('B', 3, 1, 2)])).toEqual([['A', 1], ['B', 2]])
  })

  it('gives no priority when nothing was answered', () => {
    expect(priorities([stat('A', 3, 0, 0), stat('B', 2, 0, 0)])).toEqual([])
  })
})

describe('rateFormats: order and lists', () => {
  const stats = [
    stat('MULTIPLE_CHOICE_ONE', 6, 0, 0),
    stat('MATCHING_INFORMATION', 4, 0, 0),
    stat('GAP_FILLING', 3, 0, 0),
    stat('TRUE_FALSE_NOT_GIVEN', 6, 1, 2),
  ]

  it('lists the priority first and the unanswered formats last, marked as not done', () => {
    const rated = rateFormats(stats)
    expect(rated.map((format) => format.formatCode)).toEqual(['TRUE_FALSE_NOT_GIVEN', 'MULTIPLE_CHOICE_ONE', 'MATCHING_INFORMATION', 'GAP_FILLING'])
    expect(rated.slice(1).every((format) => format.rating === 'skipped')).toBe(true)
  })

  it('keeps unanswered formats out of the weak list and reports them separately', () => {
    const rated = rateFormats(stats)
    expect(weakFormats(rated).map((format) => format.formatCode)).toEqual(['TRUE_FALSE_NOT_GIVEN'])
    expect(skippedFormats(rated).map((format) => format.formatCode)).toEqual(['MULTIPLE_CHOICE_ONE', 'MATCHING_INFORMATION', 'GAP_FILLING'])
  })

  it('puts answered formats that are fine between the priorities and the unanswered ones', () => {
    const rated = rateFormats([stat('FINE', 4, 4, 0), stat('WEAK', 4, 0, 4), stat('NOT_DONE', 2, 0, 0), stat('OK', 4, 3, 1)])
    expect(rated.map((format) => format.formatCode)).toEqual(['WEAK', 'OK', 'FINE', 'NOT_DONE'])
  })
})
