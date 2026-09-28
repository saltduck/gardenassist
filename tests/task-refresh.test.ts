import { describe, expect, it } from 'vitest'
import { applyLatestTasks, dropTask, localCalendarDate, taskListKey } from '../src/lib/task-refresh'

const task = (plantId: string, scheduleId: string, nextDue: string) => ({
  plant: { id: plantId },
  schedule: { id: scheduleId },
  nextDue,
})

describe('task refresh', () => {
  it('uses plant id so shared schedules do not share a list key', () => {
    const a = task('p1', 'tpl:water', '2026-09-28')
    const b = task('p2', 'tpl:water', '2026-09-28')
    expect(taskListKey(a)).not.toBe(taskListKey(b))
    expect(dropTask([a, b], taskListKey(a), taskListKey)).toEqual([b])
  })

  it('ignores an older due-task response that arrives after a newer one', () => {
    const stale = [task('p1', 'tpl:water', '2026-09-28')]
    const fresh: ReturnType<typeof task>[] = []
    expect(applyLatestTasks(2, 1, stale, [], '2026-09-28')).toBeNull()
    expect(applyLatestTasks(2, 2, fresh, [], '2026-09-28')).toEqual({ today: [], week: [] })
  })

  it('keeps week tasks strictly after the local calendar day', () => {
    const today = task('p1', 'plant:1', '2026-09-28')
    const tomorrow = task('p1', 'plant:2', '2026-09-29')
    expect(applyLatestTasks(1, 1, [], [today, tomorrow], '2026-09-28')).toEqual({
      today: [],
      week: [tomorrow],
    })
  })

  it('formats the local calendar date without shifting to UTC', () => {
    expect(localCalendarDate(new Date(2026, 8, 28, 0, 30))).toBe('2026-09-28')
  })
})
