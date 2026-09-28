import { describe, expect, it } from 'vitest'
import { normalizeIntervalDays } from '../functions/api/_shared/interval-days'

describe('care-plan normalizeIntervalDays', () => {
  it('accepts zero for one-time tasks', () => {
    expect(normalizeIntervalDays(0)).toBe(0)
  })

  it('floors positive integers', () => {
    expect(normalizeIntervalDays(7.8)).toBe(7)
  })

  it('defaults invalid to 7', () => {
    expect(normalizeIntervalDays('bad')).toBe(7)
    expect(normalizeIntervalDays(-3)).toBe(0)
  })
})
