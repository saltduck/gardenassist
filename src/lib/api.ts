import { ApiError } from './api-error'

const API_BASE = '/api/ai'

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { success?: boolean; error?: string }
  if (!res.ok) throw new ApiError(data.error ?? res.statusText, res.status)
  return data
}

export interface AdviceResult {
  success: boolean
  text?: string
  error?: string
}

export async function getAdvice(plantSummary: string, userQuestion: string, userLocation?: string): Promise<AdviceResult> {
  return postJson<AdviceResult>('/advice', { plantSummary, userQuestion, userLocation: userLocation || undefined })
}

export interface IdentifyResult {
  success: boolean
  name?: string
  variety?: string
  plantId?: string
  /** 0–1，Plant.id 置信度 */
  confidence?: number
  raw?: string
  error?: string
  provider?: string
}

export async function identifyPlant(
  file: File,
  coords?: { latitude?: number; longitude?: number }
): Promise<IdentifyResult> {
  const form = new FormData()
  form.append('image', file)
  if (coords?.latitude != null && coords?.longitude != null) {
    form.append('latitude', String(coords.latitude))
    form.append('longitude', String(coords.longitude))
  }
  const res = await fetch(`${API_BASE}/identify-plantid`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const data = (await res.json()) as IdentifyResult
  if (!res.ok) throw new ApiError(data.error ?? res.statusText, res.status)
  return data
}

export async function identifyPlantBase64(
  imageBase64: string,
  coords?: { latitude?: number; longitude?: number }
): Promise<IdentifyResult> {
  return postJson<IdentifyResult>('/identify-plantid', { imageBase64, ...coords })
}

export interface CarePlanItem {
  taskType: string
  intervalDays: number
  note?: string
}

export interface CarePlanResult {
  success: boolean
  items?: CarePlanItem[]
  error?: string
}

export async function getCarePlan(variety: string, location?: string): Promise<CarePlanResult> {
  return postJson<CarePlanResult>('/care-plan', { variety, location: location || undefined })
}
