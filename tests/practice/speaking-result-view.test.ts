import { describe, expect, it } from 'vitest'
import { averageBand, bandComment, groupErrors, learnerIpa, parseSpeakingResult, summaryLine, weakestCriteria, weakestCriterion } from '@/src/features/practice/model/speaking-result-view'

describe('parseSpeakingResult', () => {
  it('reads a partly filled or wrongly typed result without throwing', () => {
    const view = parseSpeakingResult({
      overallBand: 'six', criteria: [{ code: 'FC', band: 6 }, { band: 5 }, { code: 'LR', band: '5' }],
      errors: [{ excerpt: '' }, { code: 'SPK_X', excerpt: 'hello', partNo: 2 }], weakWords: 'none',
    })

    expect(view.overallBand).toBeNull()
    expect(view.criteria.map((item) => [item.code, item.band])).toEqual([['FC', 6], ['LR', null]])
    expect(view.errors).toEqual([{ name: 'SPK_X', partNo: 2, excerpt: 'hello', suggestion: '' }])
    expect(view.weakWords).toEqual([])
    expect(view.label).toBe('Điểm ước lượng để luyện tập')
  })

  it('tolerates a missing result altogether', () => {
    expect(parseSpeakingResult(null).criteria).toEqual([])
    expect(parseSpeakingResult(undefined).transcripts).toEqual([])
  })
})

describe('weakestCriterion and averageBand', () => {
  const criteria = parseSpeakingResult({ criteria: [{ code: 'FC', band: 6 }, { code: 'LR', band: 4.5 }, { code: 'GRA', band: 5 }] }).criteria

  it('finds the lowest band', () => expect(weakestCriterion(criteria)?.code).toBe('LR'))
  it('has no weakest one with a single graded criterion', () => expect(weakestCriterion(criteria.slice(0, 1))).toBeNull())
  const of = (...bands: number[]) => parseSpeakingResult({
    criteria: bands.map((band, index) => ({ code: ['FC', 'LR', 'GRA', 'PR'][index], band })),
  }).criteria

  it('marks every criterion that shares the lowest band, not just the first', () => {
    expect(weakestCriteria(of(5, 5, 5, 7)).map((item) => item.code)).toEqual(['FC', 'LR', 'GRA'])
    expect(weakestCriteria(of(5, 6, 5, 7)).map((item) => item.code)).toEqual(['FC', 'GRA'])
  })
  it('marks none when every criterion has the same band, so nothing is picked by position', () => {
    expect(weakestCriteria(of(6, 6, 6, 6))).toEqual([])
    expect(weakestCriterion(of(6, 6, 6, 6))).toBeNull()
  })
  it('still opens on the first of the weakest ones', () => expect(weakestCriterion(of(6, 5, 5, 7))?.code).toBe('LR'))

  it('rounds the mean to the nearest half band, so 5.17 is 5', () => expect(averageBand(criteria)).toBe(5))
  it('rounds below a quarter down: 5.125 is 5, never 5.1', () => expect(averageBand(of(5, 5, 5, 5.5))).toBe(5))
  it('rounds a quarter up to the next half band', () => expect(averageBand(of(5, 5, 5, 6))).toBe(5.5))
  it('rounds three quarters up to the next whole band', () => expect(averageBand(of(5, 6, 6, 6))).toBe(6))
  it('has no average without bands', () => expect(averageBand([])).toBeNull())
})

describe('groupErrors', () => {
  const error = (name: string, excerpt: string, partNo: number | null = 1) => ({ name, partNo, excerpt, suggestion: `fix ${excerpt}` })

  it('puts every place of one kind of mistake under one name, keeping the order they first appear', () => {
    const groups = groupErrors([
      error('Sai thì', 'I go yesterday'), error('Mạo từ', 'I have dog'), error('Sai thì', 'she visit last year', 2),
    ])

    expect(groups.map((group) => group.name)).toEqual(['Sai thì', 'Mạo từ'])
    expect(groups[0].items.map((item) => item.excerpt)).toEqual(['I go yesterday', 'she visit last year'])
    expect(groups[0].items[1].partNo).toBe(2)
  })

  it('has no group without errors', () => expect(groupErrors([])).toEqual([]))
})

describe('bandComment', () => {
  it('speaks differently to a high and a low band', () => {
    expect(bandComment(8)).not.toBe(bandComment(4))
  })
})

describe('summaryLine', () => {
  it('keeps the first sentence only', () => expect(summaryLine('Câu còn ngắn. Từ nối cơ bản.')).toBe('Câu còn ngắn.'))
  it('cuts a long sentence at a word and adds an ellipsis', () => {
    const line = summaryLine(`${'chữ '.repeat(60)}hết.`, 40)
    expect(line.endsWith('…')).toBe(true)
    expect(line.length).toBeLessThanOrEqual(41)
  })
  it('is empty for an empty comment', () => expect(summaryLine('')).toBe(''))
})

describe('learnerIpa', () => {
  it('writes the sounds as a learner dictionary does', () => {
    expect(['ɹ', 'ɚ', 'ɝ', 'ɡ'].map(learnerIpa)).toEqual(['r', 'ər', 'ɜr', 'g'])
    expect(['æ', 'ŋ', 'θ', 'tʃ'].map(learnerIpa)).toEqual(['æ', 'ŋ', 'θ', 'tʃ'])
  })

  it('applies to a result stored with the strict letters, in the words, the weak sounds and what was heard instead', () => {
    const view = parseSpeakingResult({
      pronunciation: { weakSounds: [{ symbol: 'ɹ', count: 2, accuracy: 23, heardAs: 'w', words: ['angry'], tip: '' }] },
      transcripts: [{ partNo: 1, questionNo: 1, words: [{ text: 'angry', accuracy: 20, errorType: null, sounds: [{ symbol: 'ɹ', accuracy: 23, heardAs: 'ɡ' }] }] }],
    })

    expect(view.weakSounds[0]!.symbol).toBe('r')
    expect(view.transcripts[0]!.words[0]!.sounds[0]).toEqual({ symbol: 'r', accuracy: 23, heardAs: 'g' })
  })
})
