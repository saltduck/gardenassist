/** 北半球 1–12 月浇水间隔系数（>1 表示更频繁） */
const NORTHERN_MONTH_FACTORS = [1.0, 1.0, 1.1, 1.15, 1.2, 1.25, 1.25, 1.2, 1.1, 1.0, 0.95, 0.9]

export function monthFromYmd(ymd: string): number {
  const m = parseInt(ymd.slice(5, 7), 10)
  return Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1
}

export function getWateringMonthFactor(month: number, latitude: number | null | undefined): number {
  const isSouthern = latitude != null && Number.isFinite(latitude) && latitude < 0
  const idx = isSouthern ? (month + 5) % 12 : month - 1
  return NORTHERN_MONTH_FACTORS[idx] ?? 1
}

export function effectiveWateringIntervalDays(
  taskType: string,
  baseIntervalDays: number,
  seasonalWateringAdjust: boolean,
  month: number,
  latitude: number | null | undefined
): number {
  if (taskType !== 'watering' || !seasonalWateringAdjust || baseIntervalDays <= 0) {
    return baseIntervalDays
  }
  const factor = getWateringMonthFactor(month, latitude)
  return Math.max(1, Math.round(baseIntervalDays * factor))
}
