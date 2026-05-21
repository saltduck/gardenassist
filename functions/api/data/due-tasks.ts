import { effectiveWateringIntervalDays, monthFromYmd } from '../_shared/season-watering'
import {
  addDays,
  computeDueFromLast,
  computeNextDue,
  inScheduleWindow,
  shouldIncludeInRange,
  type DueRange,
} from './schedule-algorithm'

export function normalizeVarietyKey(name: string, variety: string): string {
  const v = (variety ?? '').trim()
  const n = (name ?? '').trim()
  return (v || n).trim().toLowerCase()
}

/** 与 GET /plants/:id/schedules 一致：优先 DB variety_key */
export function resolveVarietyKeyFromPlantRow(row: {
  variety_key?: string | null
  name?: string | null
  variety?: string | null
}): string {
  const raw = (row?.variety_key ?? '').toString().trim().toLowerCase()
  if (raw) return raw
  return normalizeVarietyKey(row?.name ?? '', row?.variety ?? '')
}

export type DueTaskQueryMode =
  | { kind: 'range'; range: DueRange }
  | { kind: 'count-today' }
  | { kind: 'calendar-date'; dateStr: string }

export interface DueTaskRow {
  plant: Record<string, unknown>
  schedule: Record<string, unknown>
  nextDue: string
  lastDoneAt: string | null
}

export interface BuildDueTasksParams {
  plantRows: Array<{ id: string; variety_key?: string | null; name?: string | null; variety?: string | null }>
  toPlant: (row: unknown) => Record<string, unknown>
  toSchedule: (row: unknown) => Record<string, unknown>
  templates: Array<{ variety_key?: string | null; plant_id?: string; scope?: string; [key: string]: unknown }>
  plantSchedules: Array<{ plant_id: string; scope?: string; task_type: string; interval_days: number; start_date?: string | null; end_date?: string | null; [key: string]: unknown }>
  logs: Array<{ plant_id: string; task_type: string; done_at: string }>
  skips: Array<{ plant_id: string; task_type: string; skipped_at: string }>
  tzOffsetMinutes: number
  isoToLocalDate: (iso: string, tzOffsetMinutes: number) => string
  today: string
  mode: DueTaskQueryMode
  /** 用户 settings.latitude，用于季节浇水 */
  userLatitude?: number | null
  currentMonth?: number
}

function buildLastActionMap(
  logs: BuildDueTasksParams['logs'],
  skips: BuildDueTasksParams['skips'],
  tzOffsetMinutes: number,
  isoToLocalDate: BuildDueTasksParams['isoToLocalDate']
): (plantId: string, taskType: string) => string | null {
  const actionLocalByKey: Record<string, string | null> = {}
  const actionMsByKey: Record<string, number> = {}
  const keyOf = (plantId: string, taskType: string) => `${plantId}|${taskType}`
  const setIfLater = (plantId: string, taskType: string, iso: string) => {
    const ms = Date.parse(iso)
    if (!Number.isFinite(ms)) return
    const k = keyOf(plantId, taskType)
    if (actionMsByKey[k] == null || ms > actionMsByKey[k]) {
      actionMsByKey[k] = ms
      actionLocalByKey[k] = isoToLocalDate(iso, tzOffsetMinutes)
    }
  }
  for (const l of logs) setIfLater(l.plant_id, l.task_type, l.done_at)
  for (const s of skips) setIfLater(s.plant_id, s.task_type, s.skipped_at)
  return (plantId, taskType) => actionLocalByKey[keyOf(plantId, taskType)] ?? null
}

function indexTemplatesByVarietyKey(templates: BuildDueTasksParams['templates']) {
  const byVariety: Record<string, BuildDueTasksParams['templates']> = {}
  for (const t of templates) {
    const k = (t.variety_key ?? '').toString()
    if (!byVariety[k]) byVariety[k] = []
    byVariety[k].push(t)
  }
  return byVariety
}

/** 日历格：未来日用 nextDue；今日及过去用 computeDueFromLast（含逾期停在历史日） */
export function resolveDueForCalendarDate(
  dateStr: string,
  today: string,
  last: string | null,
  intervalDays: number,
  startDate?: string | null,
  endDate?: string | null
): { include: boolean; nextDue: string | null } {
  if (!inScheduleWindow(dateStr, startDate, endDate)) return { include: false, nextDue: null }

  if (dateStr > today) {
    const nextDue = computeNextDue(today, last, intervalDays, startDate)
    if (nextDue === null) return { include: false, nextDue: null }
    if (endDate && nextDue > endDate) return { include: false, nextDue: null }
    return { include: nextDue === dateStr, nextDue }
  }

  const nextDue = computeDueFromLast(today, last, intervalDays, startDate)
  if (nextDue === null) return { include: false, nextDue: null }
  if (endDate && nextDue > endDate) return { include: false, nextDue: null }
  if (dateStr === today) return { include: nextDue <= today, nextDue }
  return { include: nextDue === dateStr, nextDue }
}

export function buildDueTasks(params: BuildDueTasksParams): DueTaskRow[] {
  const { plantRows, toPlant, toSchedule, templates, plantSchedules, logs, skips, tzOffsetMinutes, isoToLocalDate, today, mode } =
    params
  const month = params.currentMonth ?? monthFromYmd(today)
  const userLat = params.userLatitude ?? null
  const endOfWeek = addDays(today, 6)
  const lastDone = buildLastActionMap(logs, skips, tzOffsetMinutes, isoToLocalDate)
  const byVariety = indexTemplatesByVarietyKey(templates)
  const result: DueTaskRow[] = []

  for (const row of plantRows) {
    const plant = toPlant(row)
    const plantId = plant.id as string
    const vkey = resolveVarietyKeyFromPlantRow(row)
    const mergedSchedules = [
      ...(byVariety[vkey] || []).map((t) => ({ ...t, plant_id: plantId, scope: 'shared' })),
      ...plantSchedules.filter((s) => s.plant_id === plantId).map((s) => ({ ...s, scope: 'plant' })),
    ]

    for (const t of mergedSchedules) {
      const last = lastDone(plantId, t.task_type)
      const startDate = t.start_date ?? null
      const endDate = t.end_date ?? null
      const intervalDays = effectiveWateringIntervalDays(
        t.task_type,
        t.interval_days,
        Boolean((t as { seasonal_watering_adjust?: number }).seasonal_watering_adjust),
        month,
        userLat
      )
      let nextDue: string | null = null
      let include = false

      if (mode.kind === 'range') {
        nextDue =
          mode.range === 'today'
            ? computeDueFromLast(today, last, intervalDays, startDate)
            : computeNextDue(today, last, intervalDays, startDate)
        include = shouldIncludeInRange(mode.range, today, endOfWeek, nextDue, startDate, endDate)
      } else if (mode.kind === 'count-today') {
        if (!inScheduleWindow(today, startDate, endDate)) continue
        nextDue = computeDueFromLast(today, last, intervalDays, startDate)
        if (nextDue === null) continue
        if (endDate && nextDue > endDate) continue
        include = nextDue <= today
      } else if (mode.kind === 'calendar-date') {
        const resolved = resolveDueForCalendarDate(mode.dateStr, today, last, intervalDays, startDate, endDate)
        nextDue = resolved.nextDue
        include = resolved.include
      }

      if (!include || nextDue === null) continue
      result.push({
        plant,
        schedule: toSchedule({ ...t, plant_id: plantId }),
        nextDue,
        lastDoneAt: last ? last + 'T12:00:00Z' : null,
      })
    }
  }

  result.sort((a, b) => (a.nextDue > b.nextDue ? 1 : a.nextDue < b.nextDue ? -1 : 0))
  return result
}

export function countTodayDueTasks(params: Omit<BuildDueTasksParams, 'mode'>): number {
  return buildDueTasks({ ...params, mode: { kind: 'count-today' } }).length
}
