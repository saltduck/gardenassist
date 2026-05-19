import { describe, expect, it } from 'vitest'
import {
  buildDueTasks,
  countTodayDueTasks,
  normalizeVarietyKey,
  resolveDueForCalendarDate,
  resolveVarietyKeyFromPlantRow,
} from '../functions/api/data/due-tasks'

const isoToLocalDate = (iso: string) => iso.slice(0, 10)

function makePlantRow(id: string, name: string, variety: string, varietyKey?: string) {
  return {
    id,
    name,
    variety,
    variety_key: varietyKey ?? null,
    planted_at: '2026-01-01',
    location: '',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  }
}

const toPlant = (row: { id: string; name: string; variety: string }) => ({
  id: row.id,
  name: row.name,
  variety: row.variety,
  location: '',
  plantedAt: '2026-01-01',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
})

const toSchedule = (row: { id?: string; plant_id: string; task_type: string; scope?: string; interval_days: number }) => ({
  id: row.id ?? 'tpl:1',
  plantId: row.plant_id,
  scope: row.scope ?? 'shared',
  taskType: row.task_type,
  intervalDays: row.interval_days,
  createdAt: '2026-01-01',
})

describe('normalizeVarietyKey', () => {
  it('uses variety when present else name', () => {
    expect(normalizeVarietyKey('绿萝', '常春藤')).toBe('常春藤')
    expect(normalizeVarietyKey('绿萝', '')).toBe('绿萝')
    expect(normalizeVarietyKey('  Rose ', '  ')).toBe('rose')
  })
})

describe('resolveVarietyKeyFromPlantRow', () => {
  it('prefers stored variety_key over current name/variety', () => {
    expect(
      resolveVarietyKeyFromPlantRow({
        variety_key: 'legacy-ivy',
        name: '新名称',
        variety: '常春藤',
      })
    ).toBe('legacy-ivy')
  })

  it('derives key when variety_key empty', () => {
    expect(resolveVarietyKeyFromPlantRow({ variety_key: '', name: 'A', variety: 'B' })).toBe('b')
  })
})

describe('due tasks build', () => {
  const templates = [
    {
      id: 't1',
      variety_key: '绿萝',
      task_type: 'watering',
      interval_days: 3,
      start_date: null,
      end_date: null,
    },
  ]

  it('today-count matches today range list length (V-001 regression)', () => {
    const today = '2026-03-15'
    const base = {
      plantRows: [makePlantRow('p1', '我的绿萝', '绿萝', '绿萝')],
      toPlant,
      toSchedule,
      templates,
      plantSchedules: [],
      logs: [{ plant_id: 'p1', task_type: 'watering', done_at: '2026-03-10T12:00:00.000Z' }],
      skips: [],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today,
    }
    const todayList = buildDueTasks({ ...base, mode: { kind: 'range', range: 'today' } })
    const count = countTodayDueTasks(base)
    expect(count).toBe(todayList.length)
    expect(todayList[0]?.nextDue).toBe('2026-03-13')
  })

  it('uses stored variety_key so templates match after rename without sync', () => {
    const today = '2026-03-15'
    const list = buildDueTasks({
      plantRows: [makePlantRow('p1', '阳台绿萝', '常春藤属', '绿萝')],
      toPlant,
      toSchedule,
      templates,
      plantSchedules: [],
      logs: [],
      skips: [],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today,
      mode: { kind: 'range', range: 'today' },
    })
    expect(list).toHaveLength(1)
  })

  it('calendar past date shows overdue due on that date', () => {
    const { include, nextDue } = resolveDueForCalendarDate(
      '2026-03-13',
      '2026-03-15',
      '2026-03-10',
      3,
      null,
      null
    )
    expect(nextDue).toBe('2026-03-13')
    expect(include).toBe(true)
  })

  it('week range excludes today but includes future within week', () => {
    const today = '2026-03-15'
    const list = buildDueTasks({
      plantRows: [makePlantRow('p1', '绿萝', '绿萝', '绿萝')],
      toPlant,
      toSchedule,
      templates,
      plantSchedules: [],
      logs: [],
      skips: [],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today,
      mode: { kind: 'range', range: 'week' },
    })
    expect(list.every((t) => t.nextDue > today)).toBe(true)
  })

  it('plant-scoped schedule applies only to matching plant', () => {
    const today = '2026-03-15'
    const list = buildDueTasks({
      plantRows: [
        makePlantRow('p1', 'A', 'v', 'v'),
        makePlantRow('p2', 'B', 'v', 'v'),
      ],
      toPlant,
      toSchedule,
      templates: [],
      plantSchedules: [
        { id: 'ps1', plant_id: 'p1', task_type: 'watering', interval_days: 7, scope: 'plant' },
      ],
      logs: [],
      skips: [],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today,
      mode: { kind: 'range', range: 'today' },
    })
    expect(list).toHaveLength(1)
    expect(list[0]?.plant.id).toBe('p1')
  })

  it('skip later than log advances last action', () => {
    const today = '2026-03-15'
    const list = buildDueTasks({
      plantRows: [makePlantRow('p1', 'n', '绿萝', '绿萝')],
      toPlant,
      toSchedule,
      templates,
      plantSchedules: [],
      logs: [{ plant_id: 'p1', task_type: 'watering', done_at: '2026-03-01T12:00:00.000Z' }],
      skips: [{ plant_id: 'p1', task_type: 'watering', skipped_at: '2026-03-10T12:00:00.000Z' }],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today,
      mode: { kind: 'range', range: 'today' },
    })
    expect(list[0]?.nextDue).toBe('2026-03-13')
  })

  it('calendar future date uses computeNextDue', () => {
    const { include, nextDue } = resolveDueForCalendarDate('2026-03-20', '2026-03-15', '2026-03-13', 7, null, null)
    expect(include).toBe(true)
    expect(nextDue).toBe('2026-03-20')
  })

  it('calendar today matches today due items', () => {
    const today = '2026-03-15'
    const base = {
      plantRows: [makePlantRow('p1', 'n', '绿萝', '绿萝')],
      toPlant,
      toSchedule,
      templates,
      plantSchedules: [],
      logs: [],
      skips: [],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today,
    }
    const todayList = buildDueTasks({ ...base, mode: { kind: 'range', range: 'today' } })
    const calToday = buildDueTasks({ ...base, mode: { kind: 'calendar-date', dateStr: today } })
    expect(calToday.length).toBe(todayList.length)
  })

  it('respects schedule endDate window', () => {
    const today = '2026-03-15'
    const list = buildDueTasks({
      plantRows: [makePlantRow('p1', 'n', '绿萝', '绿萝')],
      toPlant,
      toSchedule,
      templates: [{ ...templates[0], end_date: '2026-03-01' }],
      plantSchedules: [],
      logs: [],
      skips: [],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today,
      mode: { kind: 'range', range: 'today' },
    })
    expect(list).toHaveLength(0)
  })
})

describe('resolveDueForCalendarDate edge cases', () => {
  it('excludes when outside schedule window', () => {
    expect(resolveDueForCalendarDate('2026-03-15', '2026-03-15', null, 7, '2026-03-20', null).include).toBe(false)
  })

  it('future date excludes when next due past endDate', () => {
    expect(resolveDueForCalendarDate('2026-03-25', '2026-03-15', null, 7, null, '2026-03-20').include).toBe(false)
  })

  it('past date excludes when due does not match that day', () => {
    expect(resolveDueForCalendarDate('2026-03-12', '2026-03-15', '2026-03-10', 3, null, null).include).toBe(false)
  })

  it('today excludes when next due is still in the future', () => {
    expect(resolveDueForCalendarDate('2026-03-15', '2026-03-15', '2026-03-14', 3, null, null).include).toBe(false)
  })
})

describe('buildDueTasks edge cases', () => {
  it('ignores invalid log timestamps when building last action', () => {
    const today = '2026-03-15'
    const list = buildDueTasks({
      plantRows: [makePlantRow('p1', 'n', '绿萝', '绿萝')],
      toPlant,
      toSchedule,
      templates: [
        {
          id: 't1',
          variety_key: '绿萝',
          task_type: 'watering',
          interval_days: 3,
          start_date: null,
          end_date: null,
        },
      ],
      plantSchedules: [],
      logs: [
        { plant_id: 'p1', task_type: 'watering', done_at: 'not-a-date' },
        { plant_id: 'p1', task_type: 'watering', done_at: '2026-03-10T12:00:00.000Z' },
      ],
      skips: [],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today,
      mode: { kind: 'range', range: 'today' },
    })
    expect(list[0]?.nextDue).toBe('2026-03-13')
  })

  it('count-today skips tasks with no computable due date', () => {
    const count = countTodayDueTasks({
      plantRows: [makePlantRow('p1', 'n', '绿萝', '绿萝')],
      toPlant,
      toSchedule,
      templates: [
        {
          id: 't1',
          variety_key: '绿萝',
          task_type: 'watering',
          interval_days: 0,
          start_date: null,
          end_date: null,
        },
      ],
      plantSchedules: [],
      logs: [{ plant_id: 'p1', task_type: 'watering', done_at: '2026-03-10T12:00:00.000Z' }],
      skips: [],
      tzOffsetMinutes: 0,
      isoToLocalDate,
      today: '2026-03-15',
    })
    expect(count).toBe(0)
  })
})
