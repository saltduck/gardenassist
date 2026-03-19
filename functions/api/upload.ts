/* eslint-disable @typescript-eslint/no-explicit-any */
interface D1Database {
  prepare: (query: string) => {
    bind: (...args: any[]) => { all: () => Promise<{ results: any[] }> }
  }
}
interface R2Bucket {
  put: (key: string, body: ReadableStream | ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }) => Promise<void>
  get: (key: string) => Promise<R2Object | null>
}
interface R2Object {
  body: ReadableStream
  httpMetadata?: { contentType?: string }
}
type Env = { DB: D1Database; BUCKET: R2Bucket }
type Context = { request: Request; env: Env }

const COOKIE_NAME = 'ga_session'

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

async function getCurrentUser(env: Env, request: Request): Promise<{ id: string } | null> {
  const token = parseCookies(request)[COOKIE_NAME]
  if (!token) return null
  const now = new Date().toISOString()
  const { results } = await env.DB.prepare(
    'SELECT u.id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ? LIMIT 1'
  )
    .bind(token, now)
    .all()
  const row = (results as any[])[0]
  return row ? { id: row.id as string } : null
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

export const onRequestPost = async (context: Context) => {
  try {
    const { request, env } = context
    if (!env.BUCKET) {
      return Response.json({ error: 'R2 未绑定' }, { status: 503, headers: corsHeaders(request) })
    }
    const user = await getCurrentUser(env, request)
    if (!user) {
      return Response.json({ error: '未登录' }, { status: 401, headers: corsHeaders(request) })
    }
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: '请使用 multipart/form-data 上传，字段名 file' }, { status: 400, headers: corsHeaders(request) })
    }
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file || !file.size) {
      return Response.json({ error: '缺少 file 或文件为空' }, { status: 400, headers: corsHeaders(request) })
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: '图片请小于 5MB' }, { status: 400, headers: corsHeaders(request) })
    }
    const type = file.type || 'application/octet-stream'
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
    const key = `${user.id}/${crypto.randomUUID()}.${ext}`
    await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: type } })
    const url = `/api/assets/${key}`
    return Response.json({ url }, { status: 201, headers: corsHeaders(request) })
  } catch (e) {
    const { request } = context
    return Response.json(
      { error: e instanceof Error ? e.message : '上传失败' },
      { status: 500, headers: corsHeaders(request) }
    )
  }
}
