/**
 * 数据层：只请求 /api/data/*（D1）。不再使用 localStorage。
 * 所有方法均为 async，组件需在 useEffect 中调用并 setState。
 */
import type { Plant, GrowthRecord, CareLog, CareSchedule } from '../types/plant'
import type { DueTask, TimelineItem } from '../types/data'

const API_BASE = '/api/data'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (r.status === 204) return undefined as T
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
  return r.json()
}

export async function getAllPlants(): Promise<Plant[]> {
  return await fetchJson<Plant[]>('/plants')
}

export async function getPlantById(id: string): Promise<Plant | undefined> {
  return await fetchJson<Plant>(`/plants/${id}`)
}

export async function createPlant(input: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plant> {
  return await fetchJson<Plant>('/plants', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updatePlant(id: string, input: Partial<Omit<Plant, 'id' | 'createdAt'>>): Promise<Plant | undefined> {
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
  return await fetchJson<CareSchedule>(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteCareSchedule(id: string): Promise<boolean> {
  await fetchJson(`/schedules/${id}`, { method: 'DELETE' })
  return true
}

export async function getTimelineByPlantId(plantId: string): Promise<TimelineItem[]> {
  return await fetchJson<TimelineItem[]>(`/plants/${plantId}/timeline`)
}

export async function getDueTasks(range: 'today' | 'week'): Promise<DueTask[]> {
  const tzOffsetMinutes = new Date().getTimezoneOffset()
  return await fetchJson<DueTask[]>(`/tasks/due?range=${range}&tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}`)
}

export async function getTodayDueCount(): Promise<number> {
  const tzOffsetMinutes = new Date().getTimezoneOffset()
  return await fetchJson<number>(`/tasks/today-count?tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}`)
}

export async function getDueTasksForDate(dateStr: string): Promise<DueTask[]> {
  const tzOffsetMinutes = new Date().getTimezoneOffset()
  return await fetchJson<DueTask[]>(`/tasks/due/${dateStr}?tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}`)
}

export async function getCareLogsForDate(dateStr: string): Promise<CareLog[]> {
  return await fetchJson<CareLog[]>(`/care-logs/date/${dateStr}`)
}

export async function getRecentCareLogs(limit: number): Promise<Array<{ log: CareLog; plant: Plant | undefined }>> {
  return await fetchJson<Array<{ log: CareLog; plant: Plant | undefined }>>(`/recent-care-logs?limit=${limit}`)
}

export type { DueTask, TimelineItem }
