export interface WeatherCoord {
  latitude: number
  longitude: number
}

export interface SyncedDayWeather {
  date: string
  tempMaxC: number | null
  tempMinC: number | null
  precipitationMm: number | null
}

/** Open-Meteo 历史/预报日数据 */
export async function fetchOpenMeteoDaily(
  coord: WeatherCoord,
  from: string,
  to: string
): Promise<SyncedDayWeather[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(coord.latitude))
  url.searchParams.set('longitude', String(coord.longitude))
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum')
  url.searchParams.set('start_date', from)
  url.searchParams.set('end_date', to)
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`天气服务错误: ${res.status}`)
  const data = (await res.json()) as {
    daily?: {
      time?: string[]
      temperature_2m_max?: (number | null)[]
      temperature_2m_min?: (number | null)[]
      precipitation_sum?: (number | null)[]
    }
  }
  const d = data.daily
  if (!d?.time?.length) return []

  const out: SyncedDayWeather[] = []
  for (let i = 0; i < d.time.length; i++) {
    out.push({
      date: d.time[i]!,
      tempMaxC: d.temperature_2m_max?.[i] ?? null,
      tempMinC: d.temperature_2m_min?.[i] ?? null,
      precipitationMm: d.precipitation_sum?.[i] ?? null,
    })
  }
  return out
}
