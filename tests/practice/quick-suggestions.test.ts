import { describe, expect, it } from 'vitest'
import type { HistoryRow } from '@/src/features/practice/model/history-view'
import { scoreOf, suggestQuick } from '@/src/features/practice/model/quick-suggestions'

const row = (mark: HistoryRow['mark']): HistoryRow => ({ key: 'k', tone: 'done', mark, meta: '', title: '', facts: [], status: '', href: null, openLabel: '' })
const band = (value: string) => row({ label: 'Band', value })
const percent = (value: string) => row({ label: 'Điểm', value })

describe('scoreOf', () => {
  it('reads a percentage and a band on the same 0-1 scale', () => {
    expect(scoreOf(percent('90%'))).toBeCloseTo(0.9)
    expect(scoreOf(band('4.5'))).toBeCloseTo(0.5)
    expect(scoreOf(row(null))).toBeNull()
  })
})

describe('suggestQuick', () => {
  it('keeps the usual order without a reason while results are not known', () => {
    const list = suggestQuick({ listening: undefined, reading: undefined, writing: undefined, speaking: undefined })
    expect(list.map((item) => item.skill).slice(0, 4)).toEqual(['listening', 'reading', 'writing', 'speaking'])
    expect(list.every((item) => item.reason === null && !item.weakest)).toBe(true)
  })

  it('puts a skill never tried first, then the lowest score', () => {
    const list = suggestQuick({ listening: percent('88%'), reading: percent('40%'), writing: band('6.5'), speaking: null })
    expect(list.map((item) => item.skill).slice(0, 4)).toEqual(['speaking', 'reading', 'writing', 'listening'])
    expect(list[0]).toMatchObject({ skill: 'speaking', reason: 'Chưa thử', weakest: true })
    expect(list[1]).toMatchObject({ skill: 'reading', reason: 'Gần nhất: Điểm 40%', weakest: false })
  })

  it('marks the lowest scored skill as the weakest when every skill was tried', () => {
    const list = suggestQuick({ listening: percent('88%'), reading: percent('40%'), writing: band('6.5'), speaking: band('5.0') })
    expect(list.find((item) => item.weakest)?.skill).toBe('reading')
  })

  it('ranks a skill still waiting for its grade after the scored ones, and offers at most six sessions', () => {
    const waiting = row(null)
    const list = suggestQuick({ listening: percent('88%'), reading: percent('70%'), writing: waiting, speaking: band('6.0') })
    expect(list.map((item) => item.skill).slice(0, 4)).toEqual(['speaking', 'reading', 'listening', 'writing'])
    expect(list.find((item) => item.skill === 'writing')?.reason).toBe('Đang chờ chấm')
    expect(list).toHaveLength(6)
  })
})
