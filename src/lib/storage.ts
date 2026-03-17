import type { Plant, GrowthRecord, CareLog, CareSchedule } from '../types/plant'

const KEY_PLANTS = 'gardenassit_plants'
const KEY_GROWTH = 'gardenassit_growth_records'
const KEY_CARE = 'gardenassit_care_logs'
const KEY_SCHEDULES = 'gardenassit_care_schedules'

function loadPlants(): Plant[] {
  try {
    const raw = localStorage.getItem(KEY_PLANTS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Plant[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function savePlants(plants: Plant[]): void {
  localStorage.setItem(KEY_PLANTS, JSON.stringify(plants))
}

function loadGrowthRecords(): GrowthRecord[] {
  try {
    const raw = localStorage.getItem(KEY_GROWTH)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GrowthRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveGrowthRecords(records: GrowthRecord[]): void {
  localStorage.setItem(KEY_GROWTH, JSON.stringify(records))
}

function loadCareLogs(): CareLog[] {
  try {
    const raw = localStorage.getItem(KEY_CARE)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CareLog[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCareLogs(logs: CareLog[]): void {
  localStorage.setItem(KEY_CARE, JSON.stringify(logs))
}

function loadCareSchedules(): CareSchedule[] {
  try {
    const raw = localStorage.getItem(KEY_SCHEDULES)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CareSchedule[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCareSchedules(schedules: CareSchedule[]): void {
  localStorage.setItem(KEY_SCHEDULES, JSON.stringify(schedules))
}

/** 读取当前 localStorage 中的全部数据，用于「上传到云端」一次性同步 */
export function getLocalSnapshot(): {
  plants: Plant[]
  growthRecords: GrowthRecord[]
  careLogs: CareLog[]
  careSchedules: CareSchedule[]
} {
  return {
    plants: loadPlants(),
    growthRecords: loadGrowthRecords(),
    careLogs: loadCareLogs(),
    careSchedules: loadCareSchedules(),
  }
}

export function getAllPlants(): Plant[] {
  return loadPlants()
}

export function getPlantById(id: string): Plant | undefined {
  return loadPlants().find((p) => p.id === id)
}

export function createPlant(input: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>): Plant {
  const plants = loadPlants()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const plant: Plant = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
  plants.push(plant)
  savePlants(plants)
  return plant
}

export function updatePlant(id: string, input: Partial<Omit<Plant, 'id' | 'createdAt'>>): Plant | undefined {
  const plants = loadPlants()
  const index = plants.findIndex((p) => p.id === id)
  if (index === -1) return undefined
  const updated: Plant = {
    ...plants[index],
    ...input,
    id: plants[index].id,
    createdAt: plants[index].createdAt,
    updatedAt: new Date().toISOString(),
  }
  plants[index] = updated
  savePlants(plants)
  return updated
}

export function deletePlant(id: string): boolean {
  const plants = loadPlants().filter((p) => p.id !== id)
  if (plants.length === loadPlants().length) return false
  savePlants(plants)
  saveGrowthRecords(loadGrowthRecords().filter((r) => r.plantId !== id))
  saveCareLogs(loadCareLogs().filter((l) => l.plantId !== id))
  saveCareSchedules(loadCareSchedules().filter((s) => s.plantId !== id))
  return true
}

// ---------- GrowthRecord ----------

export function getGrowthRecordsByPlantId(plantId: string): GrowthRecord[] {
  return loadGrowthRecords()
    .filter((r) => r.plantId === plantId)
    .sort((a, b) => (b.date > a.date ? 1 : -1))
}

export function addGrowthRecord(
  input: Omit<GrowthRecord, 'id' | 'createdAt'>
): GrowthRecord {
  const records = loadGrowthRecords()
  const now = new Date().toISOString()
  const record: GrowthRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
  }
  records.push(record)
  saveGrowthRecords(records)
  return record
}

export function deleteGrowthRecord(id: string): boolean {
  const records = loadGrowthRecords().filter((r) => r.id !== id)
  if (records.length === loadGrowthRecords().length) return false
  saveGrowthRecords(records)
  return true
}

// ---------- CareLog ----------

export function getCareLogsByPlantId(plantId: string): CareLog[] {
  return loadCareLogs()
    .filter((l) => l.plantId === plantId)
    .sort((a, b) => (b.doneAt > a.doneAt ? 1 : -1))
}

export function addCareLog(input: Omit<CareLog, 'id' | 'createdAt'>): CareLog {
  const logs = loadCareLogs()
  const now = new Date().toISOString()
  const log: CareLog = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
  }
  logs.push(log)
  saveCareLogs(logs)
  return log
}

export function deleteCareLog(id: string): boolean {
  const logs = loadCareLogs().filter((l) => l.id !== id)
  if (logs.length === loadCareLogs().length) return false
  saveCareLogs(logs)
  return true
}

// ---------- Timeline (growth + care merged by date) ----------

export type TimelineItem =
  | { kind: 'growth'; id: string; date: string; data: GrowthRecord }
  | { kind: 'care'; id: string; date: string; data: CareLog }

export function getTimelineByPlantId(plantId: string): TimelineItem[] {
  const growth = getGrowthRecordsByPlantId(plantId).map((r) => ({
    kind: 'growth' as const,
    id: r.id,
    date: r.date,
    data: r,
  }))
  const care = getCareLogsByPlantId(plantId).map((l) => ({
    kind: 'care' as const,
    id: l.id,
    date: l.doneAt.slice(0, 10),
    data: l,
  }))
  const merged = [...growth, ...care]
  merged.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
  return merged
}

// ---------- CareSchedule ----------

export function getCareSchedulesByPlantId(plantId: string): CareSchedule[] {
  return loadCareSchedules()
    .filter((s) => s.plantId === plantId)
    .sort((a, b) => (a.taskType < b.taskType ? -1 : 1))
}

export function addCareSchedule(
  input: Omit<CareSchedule, 'id' | 'createdAt'>
): CareSchedule {
  const schedules = loadCareSchedules()
  const schedule: CareSchedule = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  schedules.push(schedule)
  saveCareSchedules(schedules)
  return schedule
}

export function deleteCareSchedule(id: string): boolean {
  const schedules = loadCareSchedules().filter((s) => s.id !== id)
  if (schedules.length === loadCareSchedules().length) return false
  saveCareSchedules(schedules)
  return true
}

/** 待办项：根据养护计划 + 最近完成时间计算下次到期日 */
export interface DueTask {
  plant: Plant
  schedule: CareSchedule
  nextDue: string // YYYY-MM-DD
  lastDoneAt: string | null // ISO
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getDueTasks(range: 'today' | 'week'): DueTask[] {
  const now = new Date()
  const today = toDateOnly(now.toISOString())
  const endOfWeek = addDays(today, 6)
  const plants = loadPlants()
  const schedules = loadCareSchedules()
  const logs = loadCareLogs()
  const getPlant = (id: string) => plants.find((p) => p.id === id)
  const lastDone = (plantId: string, taskType: CareSchedule['taskType']) => {
    const same = logs
      .filter((l) => l.plantId === plantId && l.taskType === taskType)
      .sort((a, b) => (b.doneAt > a.doneAt ? 1 : -1))
    return same[0] ? toDateOnly(same[0].doneAt) : null
  }

  const result: DueTask[] = []
  for (const schedule of schedules) {
    const plant = getPlant(schedule.plantId)
    if (!plant) continue
    const last = lastDone(schedule.plantId, schedule.taskType)
    const nextDue = last
      ? addDays(last, schedule.intervalDays)
      : today
    const inRange =
      range === 'today'
        ? nextDue <= today
        : nextDue >= today && nextDue <= endOfWeek
    if (inRange) {
      result.push({
        plant,
        schedule,
        nextDue,
        lastDoneAt: last ? last + 'T12:00:00Z' : null,
      })
    }
  }
  result.sort((a, b) => (a.nextDue > b.nextDue ? 1 : a.nextDue < b.nextDue ? -1 : 0))
  return result
}

export function getTodayDueCount(): number {
  return getDueTasks('today').length
}

/** 指定日期的到期任务（用于日历） */
export function getDueTasksForDate(dateStr: string): DueTask[] {
  const plants = loadPlants()
  const schedules = loadCareSchedules()
  const logs = loadCareLogs()
  const getPlant = (id: string) => plants.find((p) => p.id === id)
  const lastDone = (plantId: string, taskType: CareSchedule['taskType']) => {
    const same = logs
      .filter((l) => l.plantId === plantId && l.taskType === taskType)
      .sort((a, b) => (b.doneAt > a.doneAt ? 1 : -1))
    return same[0] ? toDateOnly(same[0].doneAt) : null
  }

  const result: DueTask[] = []
  for (const schedule of schedules) {
    const plant = getPlant(schedule.plantId)
    if (!plant) continue
    const last = lastDone(schedule.plantId, schedule.taskType)
    const nextDue = last
      ? addDays(last, schedule.intervalDays)
      : toDateOnly(new Date().toISOString())
    if (nextDue === dateStr) {
      result.push({
        plant,
        schedule,
        nextDue,
        lastDoneAt: last ? last + 'T12:00:00Z' : null,
      })
    }
  }
  return result
}

/** 指定日期已完成的养护记录（用于日历） */
export function getCareLogsForDate(dateStr: string): CareLog[] {
  return loadCareLogs().filter((l) => toDateOnly(l.doneAt) === dateStr)
}

/** 最近养护记录（含植物信息，用于仪表盘） */
export function getRecentCareLogs(limit: number): Array<{ log: CareLog; plant: Plant | undefined }> {
  const logs = loadCareLogs()
    .sort((a, b) => (b.doneAt > a.doneAt ? 1 : -1))
    .slice(0, limit)
  const plants = loadPlants()
  const getPlant = (id: string) => plants.find((p) => p.id === id)
  return logs.map((log) => ({ log, plant: getPlant(log.plantId) }))
}
