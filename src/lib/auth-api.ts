export interface AuthUser {
  id: string
  email: string
}

const API_BASE = '/api/auth'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (r.status === 204) return undefined as T
  const data = (await r.json().catch(() => ({}))) as any
  if (!r.ok) {
    const err = new Error(data.error || r.statusText) as Error & { status?: number }
    err.status = r.status
    throw err
  }
  return data as T
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    return await fetchJson<AuthUser>('/me')
  } catch (e) {
    const status = (e as any)?.status
    if (status === 401) return null
    throw e
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  return await fetchJson<AuthUser>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(email: string, password: string): Promise<AuthUser> {
  return await fetchJson<AuthUser>('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logout(): Promise<void> {
  await fetchJson('/logout', { method: 'POST' })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await fetchJson('/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

