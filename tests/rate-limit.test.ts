import { describe, expect, it } from 'vitest'
import { getClientIp } from '../functions/api/_shared/rate-limit'

describe('getClientIp', () => {
  it('prefers CF-Connecting-IP', () => {
    const req = new Request('https://x/', {
      headers: { 'CF-Connecting-IP': '1.2.3.4', 'X-Forwarded-For': '9.9.9.9' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to X-Forwarded-For first hop', () => {
    const req = new Request('https://x/', {
      headers: { 'X-Forwarded-For': '10.0.0.1, 10.0.0.2' },
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })
})
