/* eslint-disable @typescript-eslint/no-explicit-any */
interface D1Database {
  prepare: (query: string) => {
    bind: (...args: any[]) => {
      run: () => Promise<void>
      all: () => Promise<{ results: any[] }>
    }
    run: () => Promise<void>
    all: () => Promise<{ results: any[] }>
  }
}

type Env = { DB: D1Database }
type Context = { request: Request; env: Env; params: { path?: string } }

const COOKIE_NAME = 'ga_session'
const SESSION_TTL_DAYS = 30

/** 带凭证时不能使用 *，必须回显 Origin 否则浏览器不保存 Cookie */
function corsHeaders(request: Request, extra?: Record<string, string>) {
  const origin = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra,
  }
}

function json(data: unknown, request: Request, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
      ...(init?.headers ?? {}),
    },
  })
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get('Cookie') || ''
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [k, v] = part.split('=')
    if (!k || v === undefined) continue
    out[k.trim()] = decodeURIComponent(v.trim())
  }
  return out
}

async function hashPassword(password: string, salt: string): Promise<string> {
  // 简化版：SHA-256(salt + password)
  const data = new TextEncoder().encode(salt + password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function findUserBySession(env: Env, request: Request) {
  const cookies = parseCookies(request)
  const token = cookies[COOKIE_NAME]
  if (!token) return null
  const now = new Date().toISOString()
  const sql =
    'SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ? LIMIT 1'
  const { results } = await env.DB.prepare(sql).bind(token, now).all()
  const row = (results as any[])[0]
  if (!row) return null
  return { id: row.id as string, email: row.email as string, token }
}

/** Set-Cookie 要求 name=value 必须放在最前面，否则浏览器会忽略 */
function buildSetCookie(token: string | null, isSecure = false) {
  const pair = token ? `${COOKIE_NAME}=${encodeURIComponent(token)}` : `${COOKIE_NAME}=deleted`
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

export const onRequest = async (context: Context) => {
  try {
    const { request, env, params } = context
    const raw = params?.path
    const path = (Array.isArray(raw) ? raw.join('/') : (raw ?? '')).replace(/\/$/, '')
    const method = request.method.toUpperCase()

    if (!env.DB) {
      return json({ error: 'D1 未绑定' }, request, { status: 503 })
    }

    // 预检
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, { 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }),
      })
    }

    // GET /api/auth/me
    if (path === 'me' && method === 'GET') {
      const user = await findUserBySession(env, request)
      if (!user) return json({ error: '未登录' }, request, { status: 401 })
      return json({ id: user.id, email: user.email }, request)
    }

    // POST /api/auth/register
    if (path === 'register' && method === 'POST') {
      let body: any
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求体不是合法 JSON' }, request, { status: 400 })
      }
      const emailRaw = String(body.email || '').trim()
      const password = String(body.password || '')
      if (!emailRaw || !password) {
        return json({ error: '邮箱和密码必填' }, request, { status: 400 })
      }
      const email = emailRaw.toLowerCase()
      const { results: existing } = await env.DB
        .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
        .bind(email)
        .all()
      if (existing.length) {
        return json({ error: '该邮箱已注册' }, request, { status: 409 })
      }
      const userId = crypto.randomUUID()
      const salt = crypto.randomUUID().replace(/-/g, '')
      const passwordHash = await hashPassword(password, salt)
      const now = new Date().toISOString()
      await env.DB
        .prepare('INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, email, passwordHash, salt, now)
        .run()

      // 创建 session
      const token = crypto.randomUUID()
      const expires = new Date()
      expires.setDate(expires.getDate() + SESSION_TTL_DAYS)
      await env.DB
        .prepare('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), userId, token, expires.toISOString())
        .run()

      const isSecure = new URL(request.url).protocol === 'https:'
      const headers: Record<string, string> = {
        'Set-Cookie': buildSetCookie(token, isSecure),
      }
      return json({ id: userId, email }, request, { status: 201, headers })
    }

    // POST /api/auth/login
    if (path === 'login' && method === 'POST') {
      let body: any
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求体不是合法 JSON' }, request, { status: 400 })
      }
      const emailRaw = String(body.email || '').trim()
      const password = String(body.password || '')
      if (!emailRaw || !password) {
        return json({ error: '邮箱和密码必填' }, request, { status: 400 })
      }
      const email = emailRaw.toLowerCase()
      const { results } = await env.DB
        .prepare('SELECT id, password_hash, salt FROM users WHERE email = ? LIMIT 1')
        .bind(email)
        .all()
      const row = (results as any[])[0]
      if (!row) {
        return json({ error: '邮箱或密码错误' }, request, { status: 401 })
      }
      const expected = row.password_hash as string
      const salt = row.salt as string
      const actual = await hashPassword(password, salt)
      if (expected !== actual) {
        return json({ error: '邮箱或密码错误' }, request, { status: 401 })
      }

      const token = crypto.randomUUID()
      const expires = new Date()
      expires.setDate(expires.getDate() + SESSION_TTL_DAYS)
      await env.DB
        .prepare('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), row.id, token, expires.toISOString())
        .run()

      const isSecure = new URL(request.url).protocol === 'https:'
      const headers: Record<string, string> = {
        'Set-Cookie': buildSetCookie(token, isSecure),
      }
      return json({ id: row.id as string, email }, request, { headers })
    }

    // POST /api/auth/logout
    if (path === 'logout' && method === 'POST') {
      const user = await findUserBySession(env, request)
      if (user?.token) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(user.token).run()
      }
      const isSecure = new URL(request.url).protocol === 'https:'
      const headers: Record<string, string> = {
        'Set-Cookie': buildSetCookie(null, isSecure),
      }
      return json({ success: true }, request, { headers })
    }

    // POST /api/auth/change-password（需登录）
    if (path === 'change-password' && method === 'POST') {
      const user = await findUserBySession(env, request)
      if (!user) return json({ error: '未登录' }, request, { status: 401 })
      let body: any
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求体不是合法 JSON' }, request, { status: 400 })
      }
      const currentPassword = String(body.currentPassword ?? '')
      const newPassword = String(body.newPassword ?? '')
      if (!currentPassword || !newPassword) {
        return json({ error: '当前密码和新密码必填' }, request, { status: 400 })
      }
      if (newPassword.length < 6) {
        return json({ error: '新密码至少 6 位' }, request, { status: 400 })
      }
      const { results } = await env.DB
        .prepare('SELECT password_hash, salt FROM users WHERE id = ? LIMIT 1')
        .bind(user.id)
        .all()
      const row = (results as any[])[0]
      if (!row) return json({ error: '用户不存在' }, request, { status: 404 })
      const expected = row.password_hash as string
      const salt = row.salt as string
      const actual = await hashPassword(currentPassword, salt)
      if (expected !== actual) {
        return json({ error: '当前密码错误' }, request, { status: 401 })
      }
      const newSalt = crypto.randomUUID().replace(/-/g, '')
      const newHash = await hashPassword(newPassword, newSalt)
      await env.DB
        .prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
        .bind(newHash, newSalt, user.id)
        .run()
      return json({ success: true }, request)
    }

    return json({ error: 'Not found' }, request, { status: 404 })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Auth worker error' }, context.request, { status: 500 })
  }
}

