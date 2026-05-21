/* eslint-disable @typescript-eslint/no-explicit-any */
import { corsHeaders, getCurrentUser, type SessionD1 } from './_shared/session'

interface R2Bucket {
  put: (key: string, body: ReadableStream | ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }) => Promise<void>
  get: (key: string) => Promise<R2Object | null>
}
interface R2Object {
  body: ReadableStream
  httpMetadata?: { contentType?: string }
}
type Env = { DB: SessionD1; BUCKET: R2Bucket }
type Context = { request: Request; env: Env }

export const onRequestPost = async (context: Context) => {
  try {
    const { request, env } = context
    const headers = corsHeaders(request)
    if (!env.BUCKET) {
      return Response.json({ error: 'R2 未绑定' }, { status: 503, headers })
    }
    const user = await getCurrentUser(env.DB, request)
    if (!user) {
      return Response.json({ error: '未登录' }, { status: 401, headers })
    }
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: '请使用 multipart/form-data 上传，字段名 file' }, { status: 400, headers })
    }
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file || !file.size) {
      return Response.json({ error: '缺少 file 或文件为空' }, { status: 400, headers })
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: '图片请小于 5MB' }, { status: 400, headers })
    }
    const type = file.type || 'application/octet-stream'
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
    const kind = (form.get('kind') as string | null) ?? ''
    const prefix = kind === 'garden-map' ? `${user.id}/garden-map` : user.id
    const key = `${prefix}/${crypto.randomUUID()}.${ext}`
    await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: type } })
    const url = `/api/assets/${key}`
    return Response.json({ url }, { status: 201, headers })
  } catch (e) {
    const { request } = context
    return Response.json(
      { error: e instanceof Error ? e.message : '上传失败' },
      { status: 500, headers: corsHeaders(request) }
    )
  }
}
