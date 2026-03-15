const API_BASE = '/api/ai'

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { success?: boolean; error?: string }
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data
}

export interface AdviceResult {
  success: boolean
  text?: string
  error?: string
}

export async function getAdvice(plantSummary: string, userQuestion: string): Promise<AdviceResult> {
  return postJson<AdviceResult>('/advice', { plantSummary, userQuestion })
}

export interface IdentifyResult {
  success: boolean
  name?: string
  variety?: string
  raw?: string
  error?: string
}

export async function identifyPlant(file: File): Promise<IdentifyResult> {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE}/identify`, {
    method: 'POST',
    body: form,
  })
  const data = (await res.json()) as IdentifyResult
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data
}

export async function identifyPlantBase64(imageBase64: string): Promise<IdentifyResult> {
  return postJson<IdentifyResult>('/identify', { imageBase64 })
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
