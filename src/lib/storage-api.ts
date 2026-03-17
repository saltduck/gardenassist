/**
 * 数据层：优先请求 /api/data/*（D1），失败时回退到 localStorage。
 * 所有方法均为 async，组件需在 useEffect 中调用并 setState。
 */
import type { Plant, GrowthRecord, CareLog, CareSchedule } from '../types/plant'
import type { DueTask, TimelineItem } from './storage'
import * as local from './storage'

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
  try {
    return await fetchJson<Plant[]>('/plants')
  } catch {
    return local.getAllPlants()
  }
}

export async function getPlantById(id: string): Promise<Plant | undefined> {
  try {
    return await fetchJson<Plant>(`/plants/${id}`)
  } catch {
    return local.getPlantById(id)
  }
}

export async function createPlant(input: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plant> {
  try {
    return await fetchJson<Plant>('/plants', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch {
    return local.createPlant(input)
  }
}

export async function updatePlant(id: string, input: Partial<Omit<Plant, 'id' | 'createdAt'>>): Promise<Plant | undefined> {
  try {
    return await fetchJson<Plant>(`/plants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  } catch {
    return local.updatePlant(id, input)
  }
}

export async function deletePlant(id: string): Promise<boolean> {
  try {
    await fetchJson(`/plants/${id}`, { method: 'DELETE' })
    return true
  } catch {
    return local.deletePlant(id)
  }
}

export async function getGrowthRecordsByPlantId(plantId: string): Promise<GrowthRecord[]> {
  try {
    return await fetchJson<GrowthRecord[]>(`/plants/${plantId}/growth`)
  } catch {
    return local.getGrowthRecordsByPlantId(plantId)
  }
}

export async function addGrowthRecord(input: Omit<GrowthRecord, 'id' | 'createdAt'>): Promise<GrowthRecord> {
  try {
    return await fetchJson<GrowthRecord>(`/plants/${input.plantId}/growth`, {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        leafCount: input.leafCount,
        healthScore: input.healthScore,
        photoUrl: input.photoUrl,
      }),
    })
  } catch {
    return local.addGrowthRecord(input)
  }
}

export async function deleteGrowthRecord(id: string): Promise<boolean> {
  try {
    await fetchJson(`/growth/${id}`, { method: 'DELETE' })
    return true
  } catch {
    return local.deleteGrowthRecord(id)
  }
}

export async function getCareLogsByPlantId(plantId: string): Promise<CareLog[]> {
  try {
    return await fetchJson<CareLog[]>(`/plants/${plantId}/care-logs`)
  } catch {
    return local.getCareLogsByPlantId(plantId)
  }
}

export async function addCareLog(input: Omit<CareLog, 'id' | 'createdAt'>): Promise<CareLog> {
  try {
    return await fetchJson<CareLog>(`/plants/${input.plantId}/care-logs`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch {
    return local.addCareLog(input)
  }
}

export async function updateCareLog(
  id: string,
  input: Partial<Omit<CareLog, 'id' | 'plantId' | 'createdAt'>>
): Promise<CareLog | undefined> {
  try {
    return await fetchJson<CareLog>(`/care-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  } catch {
    return local.updateCareLog(id, input)
  }
}

export async function deleteCareLog(id: string): Promise<boolean> {
  try {
    await fetchJson(`/care-logs/${id}`, { method: 'DELETE' })
    return true
  } catch {
    return local.deleteCareLog(id)
  }
}

export async function getCareSchedulesByPlantId(plantId: string): Promise<CareSchedule[]> {
  try {
    return await fetchJson<CareSchedule[]>(`/plants/${plantId}/schedules`)
  } catch {
    return local.getCareSchedulesByPlantId(plantId)
  }
}

export async function addCareSchedule(input: Omit<CareSchedule, 'id' | 'createdAt'>): Promise<CareSchedule> {
  try {
    return await fetchJson<CareSchedule>(`/plants/${input.plantId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch {
    return local.addCareSchedule(input)
  }
}

export async function updateCareSchedule(
  id: string,
  input: Partial<Omit<CareSchedule, 'id' | 'plantId' | 'createdAt'>>
): Promise<CareSchedule | undefined> {
  try {
    return await fetchJson<CareSchedule>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  } catch {
    return local.updateCareSchedule(id, input)
  }
}

export async function deleteCareSchedule(id: string): Promise<boolean> {
  try {
    await fetchJson(`/schedules/${id}`, { method: 'DELETE' })
    return true
  } catch {
    return local.deleteCareSchedule(id)
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
