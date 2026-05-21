/** 与 functions/api/_shared/season-watering.ts 保持逻辑一致（前端展示用） */
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

export function formatScheduleIntervalDisplay(
  baseIntervalDays: number,
  taskType: string,
  seasonalWateringAdjust: boolean | undefined,
  latitude: number | null | undefined,
  month?: number
): string {
  const m = month ?? new Date().getMonth() + 1
  if (baseIntervalDays === 0) return '一次性'
  if (taskType !== 'watering' || !seasonalWateringAdjust) {
    return `每 ${baseIntervalDays} 天`
  }
  const effective = effectiveWateringIntervalDays(taskType, baseIntervalDays, true, m, latitude)
  if (effective === baseIntervalDays) return `每 ${baseIntervalDays} 天`
  return `每 ${baseIntervalDays} 天（本季有效 ${effective} 天）`
}
