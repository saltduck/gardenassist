/**
 * 数据层：优先请求 /api/data/*（D1），失败时回退到 localStorage。
 * 所有方法均为 async，组件需在 useEffect 中调用并 setState。
 */
import type { Plant, GrowthRecord, CareLog, CareSchedule } from '../types/plant'
import type { DueTask, TimelineItem } from './storage'
import * as local from './storage'

const API_BASE = '/api/data'
const KEY_OFFLINE_DIRTY = 'gardenassit_offline_dirty'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (r.status === 204) return undefined as T
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
  return r.json()
}

function markOfflineDirty(): void {
  try {
    localStorage.setItem(KEY_OFFLINE_DIRTY, '1')
  } catch {}
}

function clearOfflineDirty(): void {
  try {
    localStorage.removeItem(KEY_OFFLINE_DIRTY)
  } catch {}
}

export async function flushOfflineCacheToD1(): Promise<{ success: boolean; error?: string }> {
  const dirty = typeof window !== 'undefined' ? localStorage.getItem(KEY_OFFLINE_DIRTY) : null
  if (!dirty) return { success: true }
  try {
    const snapshot = local.getLocalSnapshot()
    await fetchJson('/import', { method: 'POST', body: JSON.stringify(snapshot) })
    clearOfflineDirty()
    // 导入成功后，以 D1 为准刷新 plants 缓存（其余按需懒加载）
    const plants = await fetchJson<Plant[]>('/plants')
    local.cacheSetPlants(plants)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '同步失败' }
  }
}

let syncStarted = false
export function startBackgroundSync(): void {
  if (syncStarted) return
  syncStarted = true
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => { flushOfflineCacheToD1() })
  // 首次进入页面也尝试补传一次（若离线 dirty）
  flushOfflineCacheToD1()
}

export async function getAllPlants(): Promise<Plant[]> {
  try {
    const plants = await fetchJson<Plant[]>('/plants')
    local.cacheSetPlants(plants)
    return plants
  } catch {
    return local.getAllPlants()
  }
}

export async function getPlantById(id: string): Promise<Plant | undefined> {
  try {
    const plant = await fetchJson<Plant>(`/plants/${id}`)
    local.cacheUpsertPlant(plant)
    return plant
  } catch {
    return local.getPlantById(id)
  }
}

export async function createPlant(input: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plant> {
  try {
    const plant = await fetchJson<Plant>('/plants', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    local.cacheUpsertPlant(plant)
    return plant
  } catch {
    const plant = local.createPlant(input)
    markOfflineDirty()
    return plant
  }
}

export async function updatePlant(id: string, input: Partial<Omit<Plant, 'id' | 'createdAt'>>): Promise<Plant | undefined> {
  try {
    const plant = await fetchJson<Plant>(`/plants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    local.cacheUpsertPlant(plant)
    return plant
  } catch {
    const plant = local.updatePlant(id, input)
    markOfflineDirty()
    return plant
  }
}

export async function deletePlant(id: string): Promise<boolean> {
  try {
    await fetchJson(`/plants/${id}`, { method: 'DELETE' })
    local.cacheRemovePlant(id)
    return true
  } catch {
    const ok = local.deletePlant(id)
    if (ok) markOfflineDirty()
    return ok
  }
}

export async function getGrowthRecordsByPlantId(plantId: string): Promise<GrowthRecord[]> {
  try {
    const records = await fetchJson<GrowthRecord[]>(`/plants/${plantId}/growth`)
    local.cacheReplaceGrowthRecordsForPlant(plantId, records)
    return records
  } catch {
    return local.getGrowthRecordsByPlantId(plantId)
  }
}

export async function addGrowthRecord(input: Omit<GrowthRecord, 'id' | 'createdAt'>): Promise<GrowthRecord> {
  try {
    const record = await fetchJson<GrowthRecord>(`/plants/${input.plantId}/growth`, {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        leafCount: input.leafCount,
        healthScore: input.healthScore,
        photoUrl: input.photoUrl,
      }),
    })
    local.cacheAddGrowthRecord(record)
    return record
  } catch {
    const record = local.addGrowthRecord(input)
    markOfflineDirty()
    return record
  }
}

export async function deleteGrowthRecord(id: string): Promise<boolean> {
  try {
    await fetchJson(`/growth/${id}`, { method: 'DELETE' })
    local.cacheRemoveGrowthRecord(id)
    return true
  } catch {
    const ok = local.deleteGrowthRecord(id)
    if (ok) markOfflineDirty()
    return ok
  }
}

export async function getCareLogsByPlantId(plantId: string): Promise<CareLog[]> {
  try {
    const logs = await fetchJson<CareLog[]>(`/plants/${plantId}/care-logs`)
    local.cacheReplaceCareLogsForPlant(plantId, logs)
    return logs
  } catch {
    return local.getCareLogsByPlantId(plantId)
  }
}

export async function addCareLog(input: Omit<CareLog, 'id' | 'createdAt'>): Promise<CareLog> {
  try {
    const log = await fetchJson<CareLog>(`/plants/${input.plantId}/care-logs`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    local.cacheUpsertCareLog(log)
    return log
  } catch {
    const log = local.addCareLog(input)
    markOfflineDirty()
    return log
  }
}

export async function updateCareLog(
  id: string,
  input: Partial<Omit<CareLog, 'id' | 'plantId' | 'createdAt'>>
): Promise<CareLog | undefined> {
  try {
    const log = await fetchJson<CareLog>(`/care-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    local.cacheUpsertCareLog(log)
    return log
  } catch {
    const log = local.updateCareLog(id, input)
    markOfflineDirty()
    return log
  }
}

export async function deleteCareLog(id: string): Promise<boolean> {
  try {
    await fetchJson(`/care-logs/${id}`, { method: 'DELETE' })
    local.cacheRemoveCareLog(id)
    return true
  } catch {
    const ok = local.deleteCareLog(id)
    if (ok) markOfflineDirty()
    return ok
  }
}

export async function getCareSchedulesByPlantId(plantId: string): Promise<CareSchedule[]> {
  try {
    const schedules = await fetchJson<CareSchedule[]>(`/plants/${plantId}/schedules`)
    local.cacheReplaceSchedulesForPlant(plantId, schedules)
    return schedules
  } catch {
    return local.getCareSchedulesByPlantId(plantId)
  }
}

export async function addCareSchedule(input: Omit<CareSchedule, 'id' | 'createdAt'>): Promise<CareSchedule> {
  try {
    const schedule = await fetchJson<CareSchedule>(`/plants/${input.plantId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    local.cacheUpsertSchedule(schedule)
    return schedule
  } catch {
    const schedule = local.addCareSchedule(input)
    markOfflineDirty()
    return schedule
  }
}

export async function updateCareSchedule(
  id: string,
  input: Partial<Omit<CareSchedule, 'id' | 'plantId' | 'createdAt'>>
): Promise<CareSchedule | undefined> {
  try {
    const schedule = await fetchJson<CareSchedule>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
    local.cacheUpsertSchedule(schedule)
    return schedule
  } catch {
    const schedule = local.updateCareSchedule(id, input)
    markOfflineDirty()
    return schedule
  }
}

export async function deleteCareSchedule(id: string): Promise<boolean> {
  try {
    await fetchJson(`/schedules/${id}`, { method: 'DELETE' })
    local.cacheRemoveSchedule(id)
    return true
  } catch {
    const ok = local.deleteCareSchedule(id)
    if (ok) markOfflineDirty()
    return ok
  }
}

export async function getTimelineByPlantId(plantId: string): Promise<TimelineItem[]> {
  try {
    return await fetchJson<TimelineItem[]>(`/plants/${plantId}/timeline`)
  } catch {
    return local.getTimelineByPlantId(plantId)
  }
}

export async function getDueTasks(range: 'today' | 'week'): Promise<DueTask[]> {
  try {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    return await fetchJson<DueTask[]>(`/tasks/due?range=${range}&tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}`)
  } catch {
    return local.getDueTasks(range)
  }
}

export async function getTodayDueCount(): Promise<number> {
  try {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    return await fetchJson<number>(`/tasks/today-count?tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}`)
  } catch {
    return local.getTodayDueCount()
  }
}

export async function getDueTasksForDate(dateStr: string): Promise<DueTask[]> {
  try {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    return await fetchJson<DueTask[]>(`/tasks/due/${dateStr}?tzOffsetMinutes=${encodeURIComponent(String(tzOffsetMinutes))}`)
  } catch {
    return local.getDueTasksForDate(dateStr)
  }
}

export async function getCareLogsForDate(dateStr: string): Promise<CareLog[]> {
  try {
    return await fetchJson<CareLog[]>(`/care-logs/date/${dateStr}`)
  } catch {
    return local.getCareLogsForDate(dateStr)
  }
}

export async function getRecentCareLogs(limit: number): Promise<Array<{ log: CareLog; plant: Plant | undefined }>> {
  try {
    return await fetchJson<Array<{ log: CareLog; plant: Plant | undefined }>>(`/recent-care-logs?limit=${limit}`)
  } catch {
    return local.getRecentCareLogs(limit)
  }
}

export type { DueTask, TimelineItem }

/** 将当前浏览器 localStorage 中的数据一次性上传到 D1（同步到云端） */
export async function syncLocalToD1(): Promise<{
  success: boolean
  imported?: { plants: number; growthRecords: number; careLogs: number; careSchedules: number }
  error?: string
}> {
  try {
    const snapshot = local.getLocalSnapshot()
    const r = await fetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    })
    const text = await r.text()
    if (text.trimStart().startsWith('<')) {
      const url = typeof window !== 'undefined' ? window.location.origin + `${API_BASE}/import` : `${API_BASE}/import`
      return {
        success: false,
        error: `请求返回了页面而非接口（状态 ${r.status}）。请求地址：${url}。请确认：1) 若用 Git 关联部署，仓库根目录需包含 functions 文件夹且已提交；2) 若用「直接上传」，请在项目根目录执行 npm run deploy（不要只上传 dist）；3) 在 Dashboard → Pages → 项目 → Settings → Functions 中确认 D1 绑定名为 DB。`,
      }
    }
    const data = JSON.parse(text) as { success?: boolean; imported?: { plants: number; growthRecords: number; careLogs: number; careSchedules: number }; error?: string }
    if (!r.ok) throw new Error(data.error || r.statusText)
    return { success: true, imported: data.imported }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '上传失败' }
  }
}
