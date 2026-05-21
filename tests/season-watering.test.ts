import { describe, expect, it } from 'vitest'
import { effectiveWateringIntervalDays, getWateringMonthFactor } from '../functions/api/_shared/season-watering'

describe('season-watering', () => {
  it('does not adjust non-watering tasks', () => {
    expect(effectiveWateringIntervalDays('fertilizing', 7, true, 7, -33)).toBe(7)
  })

  it('applies month factors in southern hemisphere (Jan=当地夏季)', () => {
    const jan = getWateringMonthFactor(1, -33)
    const jul = getWateringMonthFactor(7, -33)
    expect(jan).toBeGreaterThan(jul)
    expect(effectiveWateringIntervalDays('watering', 10, true, 1, -33)).toBeGreaterThan(
      effectiveWateringIntervalDays('watering', 10, true, 7, -33)
    )
  })

  it('returns base when seasonal off', () => {
    expect(effectiveWateringIntervalDays('watering', 10, false, 7, -33)).toBe(10)
  })
})
