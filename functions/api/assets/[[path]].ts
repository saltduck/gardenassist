/* eslint-disable @typescript-eslint/no-explicit-any */
import { corsHeaders, requireSessionUser, type SessionD1 } from '../_shared/session'

interface R2Bucket {
  get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>
}
type Env = { DB: SessionD1; BUCKET: R2Bucket }
type Context = { request: Request; env: Env; params: { path?: string } }

/** R2 key 首段须为当前登录用户 id */
export function assertAssetKeyForUser(key: string, userId: string): boolean {
  const slash = key.indexOf('/')
  if (slash <= 0) return false
  const owner = key.slice(0, slash)
  return owner === userId && !key.includes('..')
}

function assetCors(request: Request) {
  const base = corsHeaders(request)
  const { 'Content-Type': _ct, ...rest } = base
  return rest
}

export const onRequestGet = async (context: Context) => {
  const { request, env, params } = context
  const cors = assetCors(request)
  try {
    if (!env.DB) {
      return new Response('D1 未绑定', { status: 503, headers: cors })
    }
    const auth = await requireSessionUser(env.DB, request)
    if (auth instanceof Response) return auth

    const raw = params?.path
    const key = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
    if (!key || key.includes('..')) {
      return new Response('Not Found', { status: 404, headers: cors })
    }
    if (!assertAssetKeyForUser(key, auth.id)) {
      return new Response('Not Found', { status: 404, headers: cors })
    }
    if (!env.BUCKET) {
      return new Response('R2 未绑定', { status: 503, headers: cors })
    }
    const object = await env.BUCKET.get(key)
    if (!object) {
      return new Response('Not Found', { status: 404, headers: cors })
    }
    const headers = new Headers(cors)
    const ct = object.httpMetadata?.contentType || 'application/octet-stream'
    headers.set('Content-Type', ct)
    headers.set('Cache-Control', 'private, max-age=86400')
    return new Response(object.body, { status: 200, headers })
  } catch {
    return new Response('Server Error', { status: 500, headers: cors })
  }
}
