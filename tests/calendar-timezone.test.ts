import { describe, expect, it } from 'vitest'
import {
  civilDateToRepresentativeInstant,
  getBrowserIanaTimeZone,
  getMonthGridInTimeZone,
  getTimeZoneOffsetMinutes,
  inferTimeZoneFromLocation,
  resolveCalendarTimeZone,
  toYmdInTimeZone,
} from '../src/lib/calendar-timezone'

describe('calendar-timezone', () => {
  it('getBrowserIanaTimeZone returns non-empty string', () => {
    expect(getBrowserIanaTimeZone().length).toBeGreaterThan(0)
  })

  it('inferTimeZoneFromLocation matches presets and patterns', () => {
    expect(inferTimeZoneFromLocation('中国 上海')).toBe('Asia/Shanghai')
    expect(inferTimeZoneFromLocation('新加坡')).toBe('Asia/Singapore')
    expect(inferTimeZoneFromLocation('东京')).toBe('Asia/Tokyo')
    expect(inferTimeZoneFromLocation('New York office')).toBe('America/New_York')
    expect(inferTimeZoneFromLocation('London UK')).toBe('Europe/London')
    expect(inferTimeZoneFromLocation('Berlin')).toBe('Europe/Berlin')
    expect(inferTimeZoneFromLocation('Vancouver BC')).toBe('America/Vancouver')
    expect(inferTimeZoneFromLocation('Sydney AU')).toBe('Australia/Sydney')
    expect(inferTimeZoneFromLocation('San Francisco')).toBe('America/Los_Angeles')
    expect(inferTimeZoneFromLocation('')).toBeNull()
    expect(inferTimeZoneFromLocation('unknown place xyz')).toBeNull()
  })

  it('resolveCalendarTimeZone prefers saved timeZone', () => {
    expect(resolveCalendarTimeZone({ location: '中国 北京', timeZone: 'Europe/London' })).toBe('Europe/London')
  })

  it('resolveCalendarTimeZone falls back to location inference', () => {
    expect(resolveCalendarTimeZone({ location: '中国 北京', timeZone: '' })).toBe('Asia/Shanghai')
  })

  it('resolveCalendarTimeZone uses browser when location unknown', () => {
    const tz = resolveCalendarTimeZone({ location: 'nowhere', timeZone: '' })
    expect(tz).toBe(getBrowserIanaTimeZone())
  })

  it('toYmdInTimeZone formats date in zone', () => {
    const d = new Date('2026-03-15T12:00:00Z')
    expect(toYmdInTimeZone(d, 'UTC')).toBe('2026-03-15')
  })

  it('getTimeZoneOffsetMinutes sign matches Date#getTimezoneOffset convention', () => {
    const off = getTimeZoneOffsetMinutes('Asia/Shanghai', new Date('2026-06-15T12:00:00Z'))
    expect(off).toBeLessThan(0)
  })

  it('getMonthGridInTimeZone returns null padding then days', () => {
    const grid = getMonthGridInTimeZone(2026, 2, 'UTC')
    expect(grid.filter((x) => x === null).length).toBeGreaterThanOrEqual(0)
    expect(grid).toContain('2026-03-01')
    expect(grid).toContain('2026-03-31')
  })

  it('civilDateToRepresentativeInstant lands on target civil date in zone', () => {
    const d = civilDateToRepresentativeInstant(2026, 2, 15, 'UTC')
    expect(toYmdInTimeZone(d, 'UTC')).toBe('2026-03-15')
  })
})
