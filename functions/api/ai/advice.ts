type Env = { OPENAI_API_KEY: string }
type Context = { request: Request; env: Env }

export const onRequestPost = async (context: Context) => {
  const { request, env } = context
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const body = (await request.json()) as { plantSummary?: string; userQuestion?: string; userLocation?: string }
    const plantSummary = body.plantSummary ?? ''
    const userQuestion = body.userQuestion ?? ''
    const userLocation = body.userLocation ?? ''
    if (!env.OPENAI_API_KEY) {
      return Response.json({
        success: false,
        error: 'OPENAI_API_KEY 未配置。请在 Cloudflare Dashboard → Pages → 本项目 → Settings → Environment variables 中为 Production 和 Preview 都添加 OPENAI_API_KEY，然后重新部署。',
      }, { status: 500, headers: cors })
    }
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
            role: 'system',
            content:
              '你是园艺养护助手。根据用户提供的植物信息、所在地与问题，用中文给出简洁实用的养护建议（浇水、施肥、光照、常见问题等）。若有季节差异，请按所在地的季节/气候来判断。',
          },
          {
            role: 'user',
            content: `所在地：${userLocation || '未提供'}\n\n植物信息：${plantSummary}\n\n用户问题：${userQuestion}`,
          },
        ],
        max_tokens: 1024,
      }),
    })
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
    if (!res.ok) {
      return Response.json(
        { success: false, error: data.error?.message ?? res.statusText },
        { status: res.status, headers: cors }
      )
    }
    const text = data.choices?.[0]?.message?.content?.trim() ?? ''
    return Response.json({ success: true, text }, { headers: cors })
  } catch (e) {
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : '请求失败' },
      { status: 500, headers: cors }
    )
  }
}
