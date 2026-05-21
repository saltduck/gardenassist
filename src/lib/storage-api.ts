/**
 * 数据层：只请求 /api/data/*（D1）。不再使用 localStorage。
 * 所有方法均为 async，组件需在 useEffect 中调用并 setState。
 */
import type { Plant, GrowthRecord, CareLog, CareSchedule, CareSkip } from '../types/plant'
import type { AppSettings, DailyWeather, DueTask, GardenMapMeta, TimelineItem } from '../types/data'
import { ApiError } from './api-error'

const API_BASE = '/api/data'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (r.status === 204) return undefined as T
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(body.error || r.statusText, r.status)
  }
  return r.json()
}

export async function getAllPlants(includeArchived = false): Promise<Plant[]> {
  return await fetchJson<Plant[]>(`/plants?includeArchived=${includeArchived ? '1' : '0'}`)
}

export async function getPlantById(id: string): Promise<Plant | undefined> {
  return await fetchJson<Plant>(`/plants/${id}`)
}

export async function createPlant(
  input: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'> & { externalPlantId?: string }
): Promise<Plant> {
  return await fetchJson<Plant>('/plants', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updatePlant(
  id: string,
  input: Partial<Omit<Plant, 'id' | 'createdAt' | 'archivedAt' | 'archiveReason'>> & {
    archivedAt?: string | null
    archiveReason?: 'death' | 'moved' | 'other' | null
    externalPlantId?: string | null
    /** 为 true 时用当前名称+品种重算 variety_key，会改变与同品种共享养护模板的匹配 */
    syncVarietyKey?: boolean
  }
): Promise<Plant | undefined> {
  return await fetchJson<Plant>(`/plants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deletePlant(id: string): Promise<boolean> {
  await fetchJson(`/plants/${id}`, { method: 'DELETE' })
  return true
}

export async function getGrowthRecordsByPlantId(plantId: string): Promise<GrowthRecord[]> {
  return await fetchJson<GrowthRecord[]>(`/plants/${plantId}/growth`)
}

export async function addGrowthRecord(input: Omit<GrowthRecord, 'id' | 'createdAt'>): Promise<GrowthRecord> {
  return await fetchJson<GrowthRecord>(`/plants/${input.plantId}/growth`, {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      leafCount: input.leafCount,
      healthScore: input.healthScore,
      photoUrl: input.photoUrl,
    }),
  })
}

export async function deleteGrowthRecord(id: string): Promise<boolean> {
  await fetchJson(`/growth/${id}`, { method: 'DELETE' })
  return true
}

export async function getCareLogsByPlantId(plantId: string): Promise<CareLog[]> {
  return await fetchJson<CareLog[]>(`/plants/${plantId}/care-logs`)
}

export async function addCareLog(input: Omit<CareLog, 'id' | 'createdAt'>): Promise<CareLog> {
  return await fetchJson<CareLog>(`/plants/${input.plantId}/care-logs`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function addCareSkip(input: Omit<CareSkip, 'id' | 'createdAt'>): Promise<CareSkip> {
  return await fetchJson<CareSkip>(`/plants/${input.plantId}/care-skips`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateCareLog(
  id: string,
  input: Partial<Omit<CareLog, 'id' | 'plantId' | 'createdAt'>>
): Promise<CareLog | undefined> {
  return await fetchJson<CareLog>(`/care-logs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteCareLog(id: string): Promise<boolean> {
  await fetchJson(`/care-logs/${id}`, { method: 'DELETE' })
  return true
}

export async function getCareSchedulesByPlantId(plantId: string): Promise<CareSchedule[]> {
  return await fetchJson<CareSchedule[]>(`/plants/${plantId}/schedules`)
}

export async function addCareSchedule(input: Omit<CareSchedule, 'id' | 'createdAt'>): Promise<CareSchedule> {
  return await fetchJson<CareSchedule>(`/plants/${input.plantId}/schedules`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateCareSchedule(
  id: string,
  input: Partial<Omit<CareSchedule, 'id' | 'plantId' | 'createdAt'>>
): Promise<CareSchedule | undefined> {
  return await fetchJson<CareSchedule>(`/schedules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteCareSchedule(id: string): Promise<boolean> {
  await fetchJson(`/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return true
}

export async function getTimelineByPlantId(plantId: string): Promise<TimelineItem[]> {
  return await fetchJson<TimelineItem[]>(`/plants/${plantId}/timeline`)
}

export async function getDueTasks(range: 'today' | 'week', tzOffsetMinutes?: number): Promise<DueTask[]> {
  const tz =
    tzOffsetMinutes !== undefined && Number.isFinite(tzOffsetMinutes)
      ? tzOffsetMinutes
      : new Date().getTimezoneOffset()
  return await fetchJson<DueTask[]>(`/tasks/due?range=${range}&tzOffsetMinutes=${encodeURIComponent(String(tz))}`)
}

export async function getTodayDueCount(tzOffsetMinutes?: number): Promise<number> {
  const tz =
    tzOffsetMinutes !== undefined && Number.isFinite(tzOffsetMinutes)
      ? tzOffsetMinutes
      : new Date().getTimezoneOffset()
  return await fetchJson<number>(`/tasks/today-count?tzOffsetMinutes=${encodeURIComponent(String(tz))}`)
}

export async function getDueTasksForDate(dateStr: string, tzOffsetMinutes?: number): Promise<DueTask[]> {
  const tz =
    tzOffsetMinutes !== undefined && Number.isFinite(tzOffsetMinutes)
      ? tzOffsetMinutes
      : new Date().getTimezoneOffset()
  return await fetchJson<DueTask[]>(`/tasks/due/${dateStr}?tzOffsetMinutes=${encodeURIComponent(String(tz))}`)
}

export async function getCareLogsForDate(dateStr: string, tzOffsetMinutes?: number): Promise<CareLog[]> {
  const tz =
    tzOffsetMinutes !== undefined && Number.isFinite(tzOffsetMinutes)
      ? tzOffsetMinutes
      : new Date().getTimezoneOffset()
  return await fetchJson<CareLog[]>(
    `/care-logs/date/${dateStr}?tzOffsetMinutes=${encodeURIComponent(String(tz))}`
  )
}

export async function getRecentCareLogs(limit: number): Promise<Array<{ log: CareLog; plant: Plant | undefined }>> {
  return await fetchJson<Array<{ log: CareLog; plant: Plant | undefined }>>(`/recent-care-logs?limit=${limit}`)
}

export async function getWeatherForRange(from: string, to: string): Promise<DailyWeather[]> {
  return await fetchJson<DailyWeather[]>(
    `/weather/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  )
}

export async function upsertDailyWeather(
  date: string,
  input: { tempMaxC?: number | null; tempMinC?: number | null; precipitationMm?: number | null }
): Promise<DailyWeather> {
  return await fetchJson<DailyWeather>(`/weather/${date}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteDailyWeather(date: string): Promise<void> {
  await fetchJson(`/weather/${date}`, { method: 'DELETE' })
}

export async function syncWeatherRange(from: string, to: string): Promise<{ synced: number }> {
  return await fetchJson<{ synced: number }>(
    `/weather/sync?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { method: 'POST' }
  )
}

/** 用户时区下 today±7 天自动同步 */
export async function syncWeatherAroundToday(tzOffsetMinutes: number): Promise<{ synced: number }> {
  const today = toYmdWithOffset(new Date(), tzOffsetMinutes)
  const from = addDaysYmd(today, -7)
  const to = addDaysYmd(today, 7)
  return syncWeatherRange(from, to)
}

function toYmdWithOffset(d: Date, tzOffsetMinutes: number): string {
  const ms = d.getTime() - tzOffsetMinutes * 60_000
  return new Date(ms).toISOString().slice(0, 10)
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, day] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, day + delta))
  return dt.toISOString().slice(0, 10)
}

export async function getGardenMap(): Promise<GardenMapMeta | null> {
  return await fetchJson<GardenMapMeta | null>('/garden-map')
}

export async function saveGardenMap(input: { imageUrl: string; name?: string }): Promise<GardenMapMeta> {
  return await fetchJson<GardenMapMeta>('/garden-map', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function updatePlantMapPosition(
  plantId: string,
  mapX: number,
  mapY: number,
  gardenMapId?: string
): Promise<Plant> {
  return await fetchJson<Plant>(`/plants/${plantId}/map-position`, {
    method: 'PUT',
    body: JSON.stringify({ mapX, mapY, gardenMapId }),
  })
}

export async function getUserSettings(): Promise<AppSettings> {
  return await fetchJson<AppSettings>('/settings')
}

export async function setUserSettings(next: AppSettings): Promise<void> {
  await fetchJson('/settings', { method: 'PUT', body: JSON.stringify(next) })
}

export type { DueTask, TimelineItem }
