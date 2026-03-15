type Env = { OPENAI_API_KEY: string }
type Context = { request: Request; env: Env }

export const onRequestPost = async (context: Context) => {
  const { request, env } = context
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    if (!env.OPENAI_API_KEY) {
      return Response.json({ success: false, error: 'OPENAI_API_KEY 未配置' }, { status: 500, headers: cors })
    }
    let base64 = ''
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { imageBase64?: string }
      base64 = body.imageBase64 ?? ''
    } else if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('image') as File | null
      if (!file) {
        return Response.json({ success: false, error: '缺少 image 字段' }, { status: 400, headers: cors })
      }
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      base64 = btoa(binary)
    }
    if (!base64) {
      return Response.json({ success: false, error: '请提供 image 或 imageBase64' }, { status: 400, headers: cors })
    }
    const dataUrl = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  '识别这张植物照片的植物名称和品种，用中文简短回答。只回复两行：第一行「名称：xxx」，第二行「品种：xxx」。若无法识别品种可写「未知」。',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 256,
      }),
    })
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
    if (!res.ok) {
      return Response.json(
        { success: false, error: data.error?.message ?? res.statusText },
        { status: res.status, headers: cors }
      )
    }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    let name = ''
    let variety = ''
    for (const line of raw.split('\n')) {
      if (line.includes('名称：') || line.includes('名称:')) name = line.replace(/名称[：:]/, '').trim()
      if (line.includes('品种：') || line.includes('品种:')) variety = line.replace(/品种[：:]/, '').trim()
    }
    return Response.json({ success: true, name: name || undefined, variety: variety || undefined, raw }, { headers: cors })
  } catch (e) {
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : '请求失败' },
      { status: 500, headers: cors }
    )
  }
}
