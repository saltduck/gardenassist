import { describe, expect, it } from 'vitest'
import {
  addDays,
  computeDueFromLast,
  computeNextDue,
  inScheduleWindow,
  shouldIncludeInRange,
} from '../functions/api/data/schedule-algorithm'

describe('schedule algorithm', () => {
  it('addDays should return correct yyyy-mm-dd across month', () => {
    expect(addDays('2026-03-30', 3)).toBe('2026-04-02')
  })

  it('computeNextDue should use startDate when no log and startDate is in future', () => {
    expect(computeNextDue('2026-03-15', null, 7, '2026-03-16')).toBe('2026-03-16')
  })

  it('computeNextDue should use today when no log and no future startDate', () => {
    expect(computeNextDue('2026-03-15', null, 7, '2026-03-10')).toBe('2026-03-15')
    expect(computeNextDue('2026-03-15', null, 7)).toBe('2026-03-15')
  })

  it('computeNextDue should advance across missed cycles to nearest on/after today', () => {
    expect(computeNextDue('2026-03-15', '2026-03-01', 3)).toBe('2026-03-16')
    expect(computeNextDue('2026-03-15', '2026-03-01', 7)).toBe('2026-03-15')
  })

  it('computeNextDue should respect startDate when lastDone was before startDate', () => {
    expect(computeNextDue('2026-03-15', '2026-03-01', 7, '2026-03-20')).toBe('2026-03-20')
  })

  it('inScheduleWindow should handle start/end boundaries', () => {
    expect(inScheduleWindow('2026-03-15', '2026-03-15', '2026-03-20')).toBe(true)
    expect(inScheduleWindow('2026-03-14', '2026-03-15', '2026-03-20')).toBe(false)
    expect(inScheduleWindow('2026-03-21', '2026-03-15', '2026-03-20')).toBe(false)
  })

  it('shouldIncludeInRange should include tomorrow in week range (regression)', () => {
    const today = '2026-03-15'
    const endOfWeek = '2026-03-21'
    const nextDue = computeNextDue(today, null, 7, '2026-03-16')
    expect(nextDue).toBe('2026-03-16')
    expect(shouldIncludeInRange('week', today, endOfWeek, nextDue, '2026-03-16', null)).toBe(true)
  })

  it('shouldIncludeInRange should exclude future date from today range', () => {
    expect(shouldIncludeInRange('today', '2026-03-15', '2026-03-21', '2026-03-16')).toBe(false)
  })

  it('shouldIncludeInRange should enforce endDate by nextDue', () => {
    expect(shouldIncludeInRange('week', '2026-03-15', '2026-03-21', '2026-03-22', null, '2026-03-21')).toBe(false)
  })

  it('computeDueFromLast should keep overdue date for today list', () => {
    expect(computeDueFromLast('2026-03-15', '2026-03-01', 7)).toBe('2026-03-08')
  })

  it('interval 0 without log should be due today or at startDate', () => {
    expect(computeNextDue('2026-03-15', null, 0)).toBe('2026-03-15')
    expect(computeNextDue('2026-03-15', null, 0, '2026-03-20')).toBe('2026-03-20')
    expect(computeDueFromLast('2026-03-15', null, 0)).toBe('2026-03-15')
  })

  it('interval 0 after completion should have no next due', () => {
    expect(computeNextDue('2026-03-15', '2026-03-10', 0)).toBe(null)
    expect(computeDueFromLast('2026-03-15', '2026-03-10', 0)).toBe(null)
  })

  it('week range should not include today date', () => {
    expect(shouldIncludeInRange('week', '2026-03-15', '2026-03-21', '2026-03-15')).toBe(false)
    expect(shouldIncludeInRange('week', '2026-03-15', '2026-03-21', '2026-03-16')).toBe(true)
  })

  it('shouldIncludeInRange returns false when nextDue is null', () => {
    expect(shouldIncludeInRange('today', '2026-03-15', '2026-03-21', null)).toBe(false)
  })

  it('inScheduleWindow allows open-ended ranges', () => {
    expect(inScheduleWindow('2026-03-15', null, null)).toBe(true)
    expect(inScheduleWindow('2026-03-15', '2026-03-10', null)).toBe(true)
  })

  it('normalizeInterval treats invalid interval as 7', () => {
    expect(computeNextDue('2026-03-15', null, -1)).toBe('2026-03-15')
    expect(computeNextDue('2026-03-15', '2026-03-01', NaN)).toBe('2026-03-15')
  })

  it('computeDueFromLast respects startDate after last done', () => {
    expect(computeDueFromLast('2026-03-15', '2026-03-01', 7, '2026-03-20')).toBe('2026-03-20')
  })
})
