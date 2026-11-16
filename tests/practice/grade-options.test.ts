import { describe, expect, it } from 'vitest'
import type { Subscription } from '@/src/features/practice/api/access'
import { gradeOptions, NO_CREDITS, NO_PREMIUM } from '@/src/features/practice/model/grade-options'

const NOW = Date.parse('2026-10-26T00:00:00Z')
const premium = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 's', userId: 'u', planId: 'p', planCode: 'PREMIUM', planName: 'Premium', status: 'ACTIVE',
  startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-11-25T00:00:00Z', humanGradingCreditsTotal: 4, humanGradingCreditsUsed: 1,
  remainingCredits: 3, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...overrides,
})
const options = (balance: number | null, subscription: Subscription | null | undefined) =>
  gradeOptions({ balance, cost: 3, subscription, now: NOW })

describe('gradeOptions', () => {
  it('opens the teacher for an active Premium with credits left and the AI for enough points', () => {
    const result = options(10, premium())

    expect(result.teacher).toEqual({ enabled: true, credits: 3, reason: null })
    expect(result.ai).toEqual({ enabled: true, cost: 3, balance: 10, shortBy: 0 })
  })

  it('keeps the teacher closed without Premium, and says why', () => {
    expect(options(10, null).teacher).toEqual({ enabled: false, credits: 0, reason: NO_PREMIUM })
    expect(options(10, premium({ status: 'EXPIRED' })).teacher.reason).toBe(NO_PREMIUM)
    expect(options(10, premium({ status: 'CANCELLED' })).teacher.reason).toBe(NO_PREMIUM)
    expect(options(10, premium({ endsAt: '2026-10-25T00:00:00Z' })).teacher.reason).toBe(NO_PREMIUM)
  })

  it('tells a Premium learner who used every credit that none is left', () => {
    expect(options(10, premium({ remainingCredits: 0, humanGradingCreditsUsed: 4 })).teacher)
      .toEqual({ enabled: false, credits: 0, reason: NO_CREDITS })
  })

  it('accepts a Premium without an end date', () => {
    expect(options(0, premium({ endsAt: null })).teacher.enabled).toBe(true)
  })

  it('closes the AI when the points fall short and says by how much, independently of Premium', () => {
    const result = options(1, premium())

    expect(result.ai).toEqual({ enabled: false, cost: 3, balance: 1, shortBy: 2 })
    expect(result.teacher.enabled).toBe(true)
    expect(options(3, null).ai.enabled).toBe(true)
    expect(options(0, null).ai.shortBy).toBe(3)
  })

  it('leaves an option open when its figure cannot be read, because the server checks it when the essay is sent', () => {
    const result = options(null, undefined)

    expect(result.teacher).toEqual({ enabled: true, credits: null, reason: null })
    expect(result.ai).toEqual({ enabled: true, cost: 3, balance: null, shortBy: 0 })
  })
})
