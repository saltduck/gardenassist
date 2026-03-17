export interface UserSettings {
  location: string // e.g. "中国 上海" / "Singapore" / "US - Bay Area"
}

const KEY = 'gardenassit_user_settings'

export function getUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { location: '' }
    const parsed = JSON.parse(raw) as Partial<UserSettings>
    return { location: typeof parsed.location === 'string' ? parsed.location : '' }
  } catch {
    return { location: '' }
  }
}

export function setUserSettings(next: UserSettings): void {
  localStorage.setItem(KEY, JSON.stringify(next))
}

