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

export function computeNextDue(
  today: string,
  lastDoneLocal: string | null,
  intervalDays: number,
  startDate?: string | null
): string {
  if (!lastDoneLocal) return startDate && startDate > today ? startDate : today
  if (startDate && lastDoneLocal < startDate) return startDate
  let next = addDays(lastDoneLocal, intervalDays)
  while (next < today) {
    next = addDays(next, intervalDays)
  }
  return next
}

export function computeDueFromLast(
  today: string,
  lastDoneLocal: string | null,
  intervalDays: number,
  startDate?: string | null
): string {
  if (!lastDoneLocal) return startDate && startDate > today ? startDate : today
  if (startDate && lastDoneLocal < startDate) return startDate
  return addDays(lastDoneLocal, intervalDays)
}

export function shouldIncludeInRange(
  range: DueRange,
  today: string,
  endOfWeek: string,
  nextDue: string,
  startDate?: string | null,
  endDate?: string | null
): boolean {
  if (!inScheduleWindow(nextDue, startDate, endDate)) return false
  if (range === 'today') return nextDue <= today
  return nextDue > today && nextDue <= endOfWeek
}
