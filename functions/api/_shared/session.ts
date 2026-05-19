/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SessionD1 {
  prepare: (query: string) => {
    bind: (...args: any[]) => {
      all: () => Promise<{ results: any[] }>
      run: () => Promise<void>
    }
    run: () => Promise<void>
    all: () => Promise<{ results: any[] }>
  }
}

export const SESSION_COOKIE = 'ga_session'
export const SESSION_TTL_DAYS = 30

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get('Cookie') || ''
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [k, v] = part.split('=')
    if (!k || v === undefined) continue
    out[k.trim()] = decodeURIComponent(v.trim())
  }
  return out
}

export function getSessionToken(request: Request): string | null {
  const token = parseCookies(request)[SESSION_COOKIE]
  return token || null
}

export async function getCurrentUser(
  db: SessionD1,
  request: Request
): Promise<{ id: string } | null> {
  const user = await getCurrentUserWithEmail(db, request)
  return user ? { id: user.id } : null
}

/** 认证路由 /me、改密等需要邮箱时使用 */
export async function getCurrentUserWithEmail(
  db: SessionD1,
  request: Request
): Promise<{ id: string; email: string } | null> {
  const token = getSessionToken(request)
  if (!token) return null
  const now = new Date().toISOString()
  const { results } = await db
    .prepare(
      'SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ? LIMIT 1'
    )
    .bind(token, now)
    .all()
  const row = (results as any[])[0]
  if (!row) return null
  return { id: row.id as string, email: row.email as string }
}

/** Set-Cookie：name=value 须在最前，否则浏览器可能忽略 */
export function buildSessionSetCookie(token: string | null, isSecure = false): string {
  const pair = token ? `${SESSION_COOKIE}=${encodeURIComponent(token)}` : `${SESSION_COOKIE}=deleted`
  const attrs = [pair, 'Path=/', 'SameSite=Lax']
  if (isSecure) attrs.push('Secure')
  if (token) {
    const expires = new Date()
    expires.setDate(expires.getDate() + SESSION_TTL_DAYS)
    attrs.push(`Expires=${expires.toUTCString()}`, `Max-Age=${SESSION_TTL_DAYS * 24 * 60 * 60}`, 'HttpOnly')
  } else {
    attrs.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT', 'Max-Age=0', 'HttpOnly')
  }
  return attrs.join('; ')
}

export function corsHeaders(request: Request, extra?: Record<string, string>) {
  const origin = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    ...extra,
  }
}

export async function requireSessionUser(
  db: SessionD1,
  request: Request
): Promise<{ id: string } | Response> {
  const user = await getCurrentUser(db, request)
  if (!user) {
    return Response.json({ success: false, error: '未登录' }, { status: 401, headers: corsHeaders(request) })
  }
  return user
}
