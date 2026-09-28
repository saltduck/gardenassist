import type { GeoCoord } from './geocode'

export type SettingsGeoResolver = (settings: {
  suburb?: string
  location?: string
  latitude?: number | null
  longitude?: number | null
}) => Promise<GeoCoord | null>

export interface SettingsCoordinateInput {
  location: string
  suburb: string
  latitude: number | null
  longitude: number | null
  current?: {
    location?: string | null
    suburb?: string | null
    latitude?: number | null
    longitude?: number | null
  } | null
}

export interface SettingsCoordinateResult {
  latitude: number | null
  longitude: number | null
  error?: string
}

function cleanText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function cleanNumber(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null
}

function sameNumber(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return a == null && b == null
  return Math.abs(a - b) < 1e-9
}

export async function resolveSettingsCoordinates(
  input: SettingsCoordinateInput,
  resolveCoords: SettingsGeoResolver
): Promise<SettingsCoordinateResult> {
  const location = cleanText(input.location)
  const suburb = cleanText(input.suburb)
  const latitude = cleanNumber(input.latitude)
  const longitude = cleanNumber(input.longitude)
  const currentLatitude = cleanNumber(input.current?.latitude)
  const currentLongitude = cleanNumber(input.current?.longitude)
  const textChanged =
    location !== cleanText(input.current?.location) || suburb !== cleanText(input.current?.suburb)
  const coordsMatchCurrent =
    sameNumber(latitude, currentLatitude) && sameNumber(longitude, currentLongitude)
  const hasCompleteCoords = latitude != null && longitude != null
  const shouldRefreshForTextChange = textChanged && (suburb || location) && (!hasCompleteCoords || coordsMatchCurrent)

  const shouldAttemptGeocode =
    shouldRefreshForTextChange || ((latitude == null || longitude == null) && (suburb || location))

  if (shouldAttemptGeocode) {
    const resolved = await resolveCoords({ suburb, location, latitude: null, longitude: null })
    if (resolved) return resolved
    if (suburb) {
      return {
        latitude: null,
        longitude: null,
        error: '无法根据 suburb 自动查询经纬度，请检查 suburb，或手动填写经纬度',
      }
    }
    if (shouldRefreshForTextChange) {
      return { latitude: null, longitude: null }
    }
  }

  return { latitude, longitude }
}
