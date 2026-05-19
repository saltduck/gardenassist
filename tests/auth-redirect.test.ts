import { describe, expect, it } from 'vitest'
import { resolvePostAuthPath } from '../src/lib/auth-redirect'

describe('resolvePostAuthPath', () => {
  it('returns / when state missing', () => {
    expect(resolvePostAuthPath(null)).toBe('/')
    expect(resolvePostAuthPath(undefined)).toBe('/')
  })

  it('restores pathname search and hash', () => {
    expect(
      resolvePostAuthPath({
        from: { pathname: '/plants/abc', search: '?x=1', hash: '#t' },
      })
    ).toBe('/plants/abc?x=1#t')
  })

  it('rejects external and auth paths', () => {
    expect(resolvePostAuthPath({ from: { pathname: '//evil.com' } })).toBe('/')
    expect(resolvePostAuthPath({ from: { pathname: '/login' } })).toBe('/')
    expect(resolvePostAuthPath({ from: { pathname: '/register' } })).toBe('/')
  })
})
