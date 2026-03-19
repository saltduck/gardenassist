import type { AppSettings } from '../types/data'

const API_BASE = '/api/data'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
  return r.json()
}

export async function getUserSettings(): Promise<AppSettings> {
  try {
    return await fetchJson<AppSettings>('/settings')
  } catch {
    return { location: '' }
  }
}

export async function setUserSettings(next: AppSettings): Promise<void> {
  await fetchJson('/settings', { method: 'PUT', body: JSON.stringify(next) })
}

