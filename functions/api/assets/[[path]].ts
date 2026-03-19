/* eslint-disable @typescript-eslint/no-explicit-any */
interface R2Bucket {
  get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>
}
type Env = { BUCKET: R2Bucket }
type Context = { request: Request; env: Env; params: { path?: string } }

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*'
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' }
}

export const onRequestGet = async (context: Context) => {
  try {
    const { env, params } = context
    const raw = params?.path
    const key = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
    if (!key || key.includes('..')) {
      return new Response('Not Found', { status: 404, headers: corsHeaders(context.request) })
    }
    if (!env.BUCKET) {
      return new Response('R2 未绑定', { status: 503, headers: corsHeaders(context.request) })
    }
    const object = await env.BUCKET.get(key)
    if (!object) {
      return new Response('Not Found', { status: 404, headers: corsHeaders(context.request) })
    }
    const headers = new Headers(corsHeaders(context.request))
    const ct = object.httpMetadata?.contentType || 'application/octet-stream'
    headers.set('Content-Type', ct)
    headers.set('Cache-Control', 'public, max-age=31536000')
    return new Response(object.body, { status: 200, headers })
  } catch {
    return new Response('Server Error', { status: 500, headers: corsHeaders(context.request) })
  }
}
