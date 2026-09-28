import { describe, expect, it } from 'vitest'
import { resolveSettingsCoordinates, type SettingsGeoResolver } from '../functions/api/_shared/settings-geocode'

describe('resolveSettingsCoordinates', () => {
  it('refreshes old coordinates when suburb changes', async () => {
    const calls: unknown[] = []
    const resolver: SettingsGeoResolver = async (settings) => {
      calls.push(settings)
      return { latitude: -37.8136, longitude: 144.9631 }
    }

    const result = await resolveSettingsCoordinates(
      {
        location: 'Australia Sydney',
        suburb: 'Melbourne',
        latitude: -33.8688,
        longitude: 151.2093,
        current: {
          location: 'Australia Sydney',
          suburb: 'Sydney',
          latitude: -33.8688,
          longitude: 151.2093,
        },
      },
      resolver
    )

    expect(result).toEqual({ latitude: -37.8136, longitude: 144.9631 })
    expect(calls).toEqual([{ suburb: 'Melbourne', location: 'Australia Sydney', latitude: null, longitude: null }])
  })

  it('keeps manually edited coordinates when suburb changes', async () => {
    let called = false
    const resolver: SettingsGeoResolver = async () => {
      called = true
      return { latitude: -37.8136, longitude: 144.9631 }
    }

    const result = await resolveSettingsCoordinates(
      {
        location: 'Australia Sydney',
        suburb: 'Melbourne',
        latitude: -31,
        longitude: 150,
        current: {
          location: 'Australia Sydney',
          suburb: 'Sydney',
          latitude: -33.8688,
          longitude: 151.2093,
        },
      },
      resolver
    )

    expect(result).toEqual({ latitude: -31, longitude: 150 })
    expect(called).toBe(false)
  })

  it('geocodes suburb when coordinates are empty', async () => {
    const result = await resolveSettingsCoordinates(
      { location: '', suburb: 'Paddington', latitude: null, longitude: null },
      async () => ({ latitude: -33.884, longitude: 151.227 })
    )

    expect(result).toEqual({ latitude: -33.884, longitude: 151.227 })
  })

  it('returns an error when suburb geocoding fails', async () => {
    const result = await resolveSettingsCoordinates(
      { location: '', suburb: 'Unknown suburb', latitude: null, longitude: null },
      async () => null
    )

    expect(result.error).toContain('无法根据 suburb 自动查询经纬度')
    expect(result.latitude).toBeNull()
    expect(result.longitude).toBeNull()
  })

  it('does not keep old coordinates when location changes and geocoding fails', async () => {
    const result = await resolveSettingsCoordinates(
      {
        location: 'Unknown city',
        suburb: '',
        latitude: -33.8688,
        longitude: 151.2093,
        current: {
          location: 'Australia Sydney',
          suburb: '',
          latitude: -33.8688,
          longitude: 151.2093,
        },
      },
      async () => null
    )

    expect(result).toEqual({ latitude: null, longitude: null })
  })
})
