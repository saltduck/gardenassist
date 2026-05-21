export type GeoCoord = { latitude: number; longitude: number }

/** Open-Meteo 地理编码（免 key） */
export async function geocodeByName(query: string): Promise<GeoCoord | null> {
  const name = query.trim()
  if (!name) return null
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', name)
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'zh')

  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = (await res.json()) as {
    results?: Array<{ latitude?: number; longitude?: number }>
  }
  const hit = data.results?.[0]
  if (hit?.latitude == null || hit?.longitude == null) return null
  if (!Number.isFinite(hit.latitude) || !Number.isFinite(hit.longitude)) return null
  return { latitude: hit.latitude, longitude: hit.longitude }
}

export async function resolveWeatherCoords(settings: {
  latitude?: number | null
  longitude?: number | null
  suburb?: string
  location?: string
}): Promise<GeoCoord | null> {
  const lat = settings.latitude
  const lon = settings.longitude
  if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
    return { latitude: lat, longitude: lon }
  }
  const suburb = (settings.suburb ?? '').trim()
  if (suburb) {
    const g = await geocodeByName(suburb)
    if (g) return g
  }
  const location = (settings.location ?? '').trim()
  if (location) {
    return await geocodeByName(location)
  }
  return null
}
