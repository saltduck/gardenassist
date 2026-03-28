export type DueRange = 'today' | 'week'

export function inScheduleWindow(dateStr: string, startDate?: string | null, endDate?: string | null): boolean {
  if (startDate && dateStr < startDate) return false
  if (endDate && dateStr > endDate) return false
  return true
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function normalizeInterval(intervalDays: number): number {
  if (!Number.isFinite(intervalDays) || intervalDays < 0) return 7
  return intervalDays
}

export function computeNextDue(
  today: string,
  lastDoneLocal: string | null,
  intervalDays: number,
  startDate?: string | null
): string | null {
  const interval = normalizeInterval(intervalDays)
  if (interval === 0) {
    if (lastDoneLocal) return null
    return startDate && startDate > today ? startDate : today
  }
  if (!lastDoneLocal) return startDate && startDate > today ? startDate : today
  if (startDate && lastDoneLocal < startDate) return startDate
  let next = addDays(lastDoneLocal, interval)
  while (next < today) {
    next = addDays(next, interval)
  }
  return next
}

export function computeDueFromLast(
  today: string,
  lastDoneLocal: string | null,
  intervalDays: number,
  startDate?: string | null
): string | null {
  const interval = normalizeInterval(intervalDays)
  if (interval === 0) {
    if (lastDoneLocal) return null
    return startDate && startDate > today ? startDate : today
  }
  if (!lastDoneLocal) return startDate && startDate > today ? startDate : today
  if (startDate && lastDoneLocal < startDate) return startDate
  return addDays(lastDoneLocal, interval)
}

export function shouldIncludeInRange(
  range: DueRange,
  today: string,
  endOfWeek: string,
  nextDue: string | null,
  startDate?: string | null,
  endDate?: string | null
): boolean {
  if (nextDue === null) return false
  if (!inScheduleWindow(nextDue, startDate, endDate)) return false
  if (range === 'today') return nextDue <= today
  return nextDue > today && nextDue <= endOfWeek
}
