/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildResetUrl, sendPasswordResetEmail } from '../_shared/mail'
import { hashPassword, hashToken } from '../_shared/password'
import { consumeRateLimit, getClientIp } from '../_shared/rate-limit'
import {
  SESSION_TTL_DAYS,
  buildSessionSetCookie,
  corsHeaders,
  getCurrentUserWithEmail,
  getSessionToken,
  type SessionD1,
} from '../_shared/session'

type Env = {
  DB: SessionD1
  RESEND_API_KEY?: string
  MAIL_FROM?: string
  APP_BASE_URL?: string
}
type Context = { request: Request; env: Env; params: { path?: string } }

function json(data: unknown, request: Request, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders(request),
      ...(init?.headers ?? {}),
    },
  })
}

const FORGOT_SUCCESS_MSG = '若该邮箱已注册，将收到重置链接（请检查垃圾箱）'

export const onRequest = async (context: Context) => {
  try {
    const { request, env, params } = context
    const raw = params?.path
    const path = (Array.isArray(raw) ? raw.join('/') : (raw ?? '')).replace(/\/$/, '')
    const method = request.method.toUpperCase()

    if (!env.DB) {
      return json({ error: 'D1 未绑定' }, request, { status: 503 })
    }

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, { 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }),
      })
    }

    if (path === 'me' && method === 'GET') {
      const user = await getCurrentUserWithEmail(env.DB, request)
      if (!user) return json({ error: '未登录' }, request, { status: 401 })
      return json({ id: user.id, email: user.email }, request)
    }

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

      const token = crypto.randomUUID()
      const expires = new Date()
      expires.setDate(expires.getDate() + SESSION_TTL_DAYS)
      await env.DB
        .prepare('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), userId, token, expires.toISOString())
        .run()

      const isSecure = new URL(request.url).protocol === 'https:'
      return json({ id: userId, email }, request, {
        status: 201,
        headers: { 'Set-Cookie': buildSessionSetCookie(token, isSecure) },
      })
    }

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
      return json({ id: row.id as string, email }, request, {
        headers: { 'Set-Cookie': buildSessionSetCookie(token, isSecure) },
      })
    }

    if (path === 'logout' && method === 'POST') {
      const token = getSessionToken(request)
      if (token) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
      }
      const isSecure = new URL(request.url).protocol === 'https:'
      return json({ success: true }, request, {
        headers: { 'Set-Cookie': buildSessionSetCookie(null, isSecure) },
      })
    }

    if (path === 'forgot-password' && method === 'POST') {
      let body: any
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求体不是合法 JSON' }, request, { status: 400 })
      }
      const emailRaw = String(body.email || '').trim()
      if (!emailRaw) {
        return json({ error: '邮箱必填' }, request, { status: 400 })
      }
      const email = emailRaw.toLowerCase()
      const ip = getClientIp(request)
      const ipLimit = await consumeRateLimit(env.DB, `forgot:ip:${ip}`, 10, 60 * 60 * 1000)
      if (!ipLimit.allowed) {
        return json({ error: '请求过于频繁，请稍后再试' }, request, { status: 429 })
      }
      const emailLimit = await consumeRateLimit(env.DB, `forgot:email:${email}`, 3, 60 * 60 * 1000)
      if (!emailLimit.allowed) {
        return json({ success: true, message: FORGOT_SUCCESS_MSG }, request)
      }
      const { results } = await env.DB
        .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
        .bind(email)
        .all()
      const row = (results as any[])[0]
      if (row) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const { results: recent } = await env.DB
          .prepare(
            'SELECT COUNT(*) AS c FROM password_reset_tokens WHERE user_id = ? AND created_at > ? AND used_at IS NULL'
          )
          .bind(row.id, oneHourAgo)
          .all()
        const count = Number((recent as any[])[0]?.c ?? 0)
        if (count < 3) {
          const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
          const tokenHash = await hashToken(token)
          const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
          const now = new Date().toISOString()
          await env.DB
            .prepare(
              'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
            )
            .bind(crypto.randomUUID(), row.id, tokenHash, expires, now)
            .run()
          const resetUrl = buildResetUrl(env, token)
          await sendPasswordResetEmail(env, email, resetUrl)
        }
      }
      return json({ success: true, message: FORGOT_SUCCESS_MSG }, request)
    }

    if (path === 'reset-password' && method === 'POST') {
      let body: any
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求体不是合法 JSON' }, request, { status: 400 })
      }
      const token = String(body.token || '').trim()
      const newPassword = String(body.newPassword || '')
      if (!token || !newPassword) {
        return json({ error: 'token 与新密码必填' }, request, { status: 400 })
      }
      if (newPassword.length < 6) {
        return json({ error: '新密码至少 6 位' }, request, { status: 400 })
      }
      const tokenHash = await hashToken(token)
      const now = new Date().toISOString()
      const { results } = await env.DB
        .prepare(
          'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1'
        )
        .bind(tokenHash, now)
        .all()
      const tok = (results as any[])[0]
      if (!tok) {
        return json({ error: '链接无效或已过期' }, request, { status: 400 })
      }
      const newSalt = crypto.randomUUID().replace(/-/g, '')
      const newHash = await hashPassword(newPassword, newSalt)
      await env.DB
        .prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
        .bind(newHash, newSalt, tok.user_id)
        .run()
      await env.DB
        .prepare('UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL')
        .bind(now, tok.user_id)
        .run()
      return json({ success: true }, request)
    }

    if (path === 'change-password' && method === 'POST') {
      const user = await getCurrentUserWithEmail(env.DB, request)
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
