import { describe, expect, it } from 'vitest'
import {
  SESSION_COOKIE,
  buildSessionSetCookie,
  corsHeaders,
  getCurrentUser,
  getCurrentUserWithEmail,
  getSessionToken,
  parseCookies,
  requireSessionUser,
  type SessionD1,
} from '../functions/api/_shared/session'

function mockRequest(cookie?: string, origin = 'https://app.example') {
  return new Request('https://app.example/api', {
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: origin,
    },
  })
}

function mockDb(results: unknown[]): SessionD1 {
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results }),
        run: async () => {},
      }),
      run: async () => {},
      all: async () => ({ results }),
    }),
  }
}

describe('session', () => {
  it('parseCookies decodes cookie header', () => {
    expect(parseCookies(mockRequest(`${SESSION_COOKIE}=abc%20123`))).toEqual({
      [SESSION_COOKIE]: 'abc 123',
    })
    expect(parseCookies(mockRequest())).toEqual({})
  })

  it('corsHeaders echoes origin and merges extra', () => {
    const h = corsHeaders(mockRequest(undefined, 'https://foo.test'), { 'X-Custom': '1' })
    expect(h['Access-Control-Allow-Origin']).toBe('https://foo.test')
    expect(h['Access-Control-Allow-Credentials']).toBe('true')
    expect(h['X-Custom']).toBe('1')
  })

  it('getCurrentUser returns null without cookie', async () => {
    const db = mockDb([])
    expect(await getCurrentUser(db, mockRequest())).toBeNull()
  })

  it('getCurrentUser returns user when session valid', async () => {
    const db = mockDb([{ id: 'user-1', email: 'a@b.c' }])
    const user = await getCurrentUser(db, mockRequest(`${SESSION_COOKIE}=tok`))
    expect(user).toEqual({ id: 'user-1' })
  })

  it('getCurrentUserWithEmail returns id and email', async () => {
    const db = mockDb([{ id: 'user-1', email: 'me@example.com' }])
    const user = await getCurrentUserWithEmail(db, mockRequest(`${SESSION_COOKIE}=tok`))
    expect(user).toEqual({ id: 'user-1', email: 'me@example.com' })
  })

  it('getSessionToken reads ga_session cookie', () => {
    expect(getSessionToken(mockRequest(`${SESSION_COOKIE}=abc`))).toBe('abc')
    expect(getSessionToken(mockRequest())).toBeNull()
  })

  it('buildSessionSetCookie sets HttpOnly and expiry', () => {
    const c = buildSessionSetCookie('t', true)
    expect(c).toContain(`${SESSION_COOKIE}=t`)
    expect(c).toContain('HttpOnly')
    expect(c).toContain('Secure')
    expect(buildSessionSetCookie(null)).toContain('Max-Age=0')
  })

  it('requireSessionUser returns 401 Response when unauthenticated', async () => {
    const db = mockDb([])
    const result = await requireSessionUser(db, mockRequest())
    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(401)
      const body = await result.json()
      expect(body.error).toBe('未登录')
    }
  })

  it('requireSessionUser returns user when authenticated', async () => {
    const db = mockDb([{ id: 'u2' }])
    const result = await requireSessionUser(db, mockRequest(`${SESSION_COOKIE}=x`))
    expect(result).toEqual({ id: 'u2' })
  })
})
