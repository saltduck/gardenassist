import { consumeRateLimit } from '../_shared/rate-limit'
import { corsHeaders, requireSessionUser, type SessionD1 } from '../_shared/session'

type Env = { DB: SessionD1; PLANT_ID_API_KEY?: string; ENABLE_OPENAI_IDENTIFY_FALLBACK?: string }
type Context = { request: Request; env: Env }

export const onRequestPost = async (context: Context) => {
  const { request, env } = context
  const cors = corsHeaders(request)
  try {
    const auth = await requireSessionUser(env.DB, request)
    if (auth instanceof Response) return auth

    const rl = await consumeRateLimit(env.DB, `ai:identify:${auth.id}`, 30, 60 * 60 * 1000)
    if (!rl.allowed) {
      return Response.json({ success: false, error: '识别请求过于频繁，请稍后再试' }, { status: 429, headers: cors })
    }

    const apiKey = env.PLANT_ID_API_KEY?.trim()
    if (!apiKey) {
      return Response.json(
        { success: false, error: 'PLANT_ID_API_KEY 未配置，请在环境变量中设置' },
        { status: 500, headers: cors }
      )
    }

    let latitude: number | undefined
    let longitude: number | undefined
    let base64 = ''
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { imageBase64?: string; latitude?: number; longitude?: number }
      base64 = body.imageBase64 ?? ''
      latitude = body.latitude
      longitude = body.longitude
    } else if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('image') as File | null
      if (file) {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        base64 = btoa(binary)
      }
      const lat = form.get('latitude')
      const lon = form.get('longitude')
      if (lat != null && lon != null) {
        latitude = Number(lat)
        longitude = Number(lon)
      }
    }

    if (!base64) {
      return Response.json({ success: false, error: '请提供 image 或 imageBase64' }, { status: 400, headers: cors })
    }

    const payload: Record<string, unknown> = {
      images: [base64.startsWith('data:') ? base64.split(',')[1] : base64],
      similar_images: true,
    }
    if (latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      payload.latitude = latitude
      payload.longitude = longitude
    }

    const res = await fetch('https://api.plant.id/v3/identification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    const data = (await res.json()) as {
      result?: {
        classification?: {
          suggestions?: Array<{
            name?: string
            probability?: number
            details?: { common_names?: string[] }
            id?: string | number
          }>
        }
      }
      message?: string
    }

    if (!res.ok) {
      return Response.json(
        { success: false, error: data.message ?? res.statusText },
        { status: res.status, headers: cors }
      )
    }

    const top = data.result?.classification?.suggestions?.[0]
    const scientific = top?.name ?? ''
    const common = top?.details?.common_names?.[0]
    const name = common || scientific || undefined
    const variety = scientific && common && scientific !== common ? scientific : undefined
    const plantId = top?.id != null ? String(top.id) : undefined
    const confidence =
      top?.probability != null && Number.isFinite(top.probability) ? top.probability : undefined

    return Response.json(
      {
        success: true,
        name,
        variety,
        plantId,
        confidence,
        raw: JSON.stringify(data.result?.classification?.suggestions?.slice(0, 3) ?? []),
        provider: 'plant.id',
      },
      { headers: cors }
    )
  } catch (e) {
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : '识别失败' },
      { status: 500, headers: cors }
    )
  }
}
