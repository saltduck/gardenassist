/**
 * 日历与按日接口：按 IANA 时区解释「今天」与月历，避免 toISOString() 误用 UTC。
 */

/** 与设置页「快速选择」一致：所在地 → IANA（中国大陆统一用东八区） */
export const PRESET_LOCATION_TO_TIMEZONE: Record<string, string> = {
  '中国 北京': 'Asia/Shanghai',
  '中国 上海': 'Asia/Shanghai',
  '中国 广州': 'Asia/Shanghai',
  '中国 深圳': 'Asia/Shanghai',
  '中国 杭州': 'Asia/Shanghai',
  '中国 成都': 'Asia/Shanghai',
  '中国 武汉': 'Asia/Shanghai',
  新加坡: 'Asia/Singapore',
  '日本 东京': 'Asia/Tokyo',
  '美国 加州湾区': 'America/Los_Angeles',
  '美国 纽约': 'America/New_York',
  '英国 伦敦': 'Europe/London',
  '德国 柏林': 'Europe/Berlin',
  '加拿大 温哥华': 'America/Vancouver',
  '澳大利亚 悉尼': 'Australia/Sydney',
}

export function getBrowserIanaTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 从自由文本所在地猜时区（弱匹配，失败返回 null） */
export function inferTimeZoneFromLocation(location: string): string | null {
  const t = location.trim()
  if (!t) return null
  if (PRESET_LOCATION_TO_TIMEZONE[t]) return PRESET_LOCATION_TO_TIMEZONE[t]
  const lower = t.toLowerCase()
  if (/singapore|新加坡/.test(t)) return 'Asia/Singapore'
  if (/东京|tokyo/.test(lower)) return 'Asia/Tokyo'
  if (/纽约|new\s*york/.test(lower)) return 'America/New_York'
  if (/伦敦|london/.test(lower)) return 'Europe/London'
  if (/柏林|berlin/.test(lower)) return 'Europe/Berlin'
  if (/温哥华|vancouver/.test(lower)) return 'America/Vancouver'
  if (/悉尼|sydney/.test(lower)) return 'Australia/Sydney'
  if (/加州|旧金山|硅谷|湾区|bay\s*area|los\s*angeles|la\b|san\s*francisco/.test(lower)) return 'America/Los_Angeles'
  if (/中国|北京|上海|广州|深圳|杭州|成都|武汉|china|beijing|shanghai|guangzhou|shenzhen|hangzhou|chengdu|wuhan/.test(t))
    return 'Asia/Shanghai'
  return null
}

export function resolveCalendarTimeZone(settings: { location: string; timeZone?: string } | null | undefined): string {
  const saved = settings?.timeZone?.trim()
  if (saved) return saved
  const fromLoc = inferTimeZoneFromLocation(settings?.location ?? '')
  if (fromLoc) return fromLoc
  return getBrowserIanaTimeZone()
}

export function toYmdInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !d) return date.toISOString().slice(0, 10)
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** 与后端 tasks/due 使用的 tzOffsetMinutes 一致：本地日界线相对 UTC 的偏移（分钟） */
export function getTimeZoneOffsetMinutes(timeZone: string, date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const y = n('year')
  const mo = n('month')
  const d = n('day')
  const h = n('hour')
  const mi = n('minute')
  const s = n('second')
  const asUtcMs = Date.UTC(y, mo - 1, d, h, mi, s)
  // 与 Date#getTimezoneOffset 保持同号：UTC+8 => -480，UTC-8 => +480
  return Math.round((date.getTime() - asUtcMs) / 60000)
}

const WEEKDAY_SHORT_SUN0: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function weekdaySunday0InZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).formatToParts(date)
  const w = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  return WEEKDAY_SHORT_SUN0[w] ?? 0
}

/** 返回在 timeZone 下落在该公历日的某个时刻（用于取星期等） */
export function civilDateToRepresentativeInstant(year: number, monthIndex: number, day: number, timeZone: string): Date {
  const pad = (n: number) => String(n).padStart(2, '0')
  const target = `${year}-${pad(monthIndex + 1)}-${pad(day)}`
  let t = Date.UTC(year, monthIndex, day, 12, 0, 0)
  for (let i = 0; i < 48; i++) {
    const ymd = toYmdInTimeZone(new Date(t), timeZone)
    if (ymd === target) return new Date(t)
    if (ymd < target) t += 3600000
    else t -= 3600000
  }
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0))
}

/** 月历格：星期列与「今天」均按 timeZone；日期串为公历 YYYY-MM-DD */
export function getMonthGridInTimeZone(year: number, monthIndex: number, timeZone: string): (string | null)[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const d1 = civilDateToRepresentativeInstant(year, monthIndex, 1, timeZone)
  const startWeekday = weekdaySunday0InZone(d1, timeZone)
  const grid: (string | null)[] = []
  for (let i = 0; i < startWeekday; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return grid
}
