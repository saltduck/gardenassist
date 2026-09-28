/** 同一植株、同一计划、同一到期日才是同一条待办。共享计划的 id 在不同植株上会重复。 */
export function taskListKey(task: { plant: { id: string }; schedule: { id: string }; nextDue: string }): string {
  return `${task.plant.id}:${task.schedule.id}:${task.nextDue}`
}

export function dropTask<T>(tasks: T[], key: string, keyOf: (task: T) => string): T[] {
  return tasks.filter((task) => keyOf(task) !== key)
}

/**
 * 只应用与当前代数一致的刷新结果。
 * 连续点击完成时，较早的待办请求返回更晚会把刚完成的任务写回列表。
 */
export function applyLatestTasks<T extends { nextDue: string }>(
  latestGeneration: number,
  generation: number,
  today: T[],
  week: T[],
  todayStr: string,
): { today: T[]; week: T[] } | null {
  if (generation !== latestGeneration) return null
  return {
    today,
    week: week.filter((task) => task.nextDue > todayStr),
  }
}

/** 本地日历日，避免用 UTC 日期把今天的任务滤进或滤出本周列表。 */
export function localCalendarDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
