import { describe, expect, it } from 'vitest'
import { locateEvidence, parseEvidence } from '@/src/features/practice/model/evidence'

const paragraphs = [
  { label: 'A', text: 'For most of the twentieth century, cities judged noise by complaint.' },
  { label: 'C', text: 'The data produced a surprise. The loudest places were often not main roads but narrow streets where sound bounces between tall buildings. Planting hedges cut the levels.' },
]

describe('parseEvidence', () => {
  it('reads the paragraph letter and the quoted sentence', () => {
    expect(parseEvidence('Đoạn C: «The loudest places were often not main roads»')).toEqual({ label: 'C', quote: 'The loudest places were often not main roads' })
  })

  it('accepts a line with a letter but no quote', () => {
    expect(parseEvidence('Đoạn B nói về chi phí.')).toEqual({ label: 'B', quote: null })
  })

  it('returns null for a line that names no paragraph and quotes nothing', () => {
    expect(parseEvidence('Đó là các con phố hẹp.')).toBeNull()
  })
})

describe('locateEvidence', () => {
  it('finds the quote inside the paragraph with the named letter', () => {
    const spot = locateEvidence(paragraphs, { label: 'C', quote: 'The loudest places were often not main roads' })!
    expect(spot.index).toBe(1)
    expect(paragraphs[1]!.text.slice(spot.start, spot.end)).toBe('The loudest places were often not main roads')
  })

  it('ignores case and white-space differences', () => {
    const spot = locateEvidence(paragraphs, { label: 'C', quote: 'the loudest  places\nwere often not main roads' })!
    expect(paragraphs[1]!.text.slice(spot.start, spot.end).toLowerCase()).toBe('the loudest places were often not main roads')
  })

  it('marks from the first to the last piece of a quote that skips words with an ellipsis', () => {
    const text = paragraphs[1]!.text
    const spot = locateEvidence(paragraphs, { label: 'C', quote: 'The data produced a surprise… Planting hedges cut the levels.' })!
    expect(text.slice(spot.start, spot.end)).toBe(text)
  })

  it('marks the whole paragraph when the letter is right but the quote is not in it', () => {
    expect(locateEvidence(paragraphs, { label: 'A', quote: 'something else' })).toEqual({ index: 0, start: 0, end: paragraphs[0]!.text.length })
  })

  it('looks for the quote everywhere when the letter is unknown', () => {
    const spot = locateEvidence(paragraphs, { label: 'Z', quote: 'Planting hedges' })!
    expect(spot.index).toBe(1)
  })

  it('returns null when nothing matches', () => {
    expect(locateEvidence(paragraphs, { label: null, quote: 'not in the passage' })).toBeNull()
  })
})
