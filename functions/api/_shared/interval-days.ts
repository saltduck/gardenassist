/** 养护计划间隔天数：非法值默认 7；负数视为 0（一次性任务） */
export function normalizeIntervalDays(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 7
  if (n < 0) return 0
  return Math.floor(n)
}
