type Env = { OPENAI_API_KEY: string }
type Context = { request: Request; env: Env }

const TASK_TYPES = ['watering', 'fertilizing', 'pruning', 'repotting', 'pest_control', 'other']

export const onRequestPost = async (context: Context) => {
  const { request, env } = context
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const body = (await request.json()) as { variety?: string; location?: string }
    const variety = body.variety ?? ''
    const location = body.location ?? ''
    if (!variety.trim()) {
      return Response.json({ success: false, error: '请提供 variety（品种/名称）' }, { status: 400, headers: cors })
    }
    if (!env.OPENAI_API_KEY) {
      return Response.json({
        success: false,
        error: 'OPENAI_API_KEY 未配置。请到 Pages 项目 Settings → Environment variables 为当前环境添加 OPENAI_API_KEY 并重新部署。',
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
            content: `你输出严格的 JSON 数组，无其他文字。每项格式：{"taskType":" watering|fertilizing|pruning|repotting|pest_control|other","intervalDays":数字,"note":"可选中文说明"}。taskType 必须为上述之一。`,
          },
          {
            role: 'user',
            content: `为以下植物生成养护计划（浇水、施肥等周期建议）。品种：${variety}${location ? `，位置/环境：${location}` : ''}。只返回 JSON 数组。`,
          },
        ],
        max_tokens: 512,
      }),
    })
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
    if (!res.ok) {
      return Response.json(
        { success: false, error: data.error?.message ?? res.statusText },
        { status: res.status, headers: cors }
      )
    }
    let raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (jsonMatch) raw = jsonMatch[0]
    const parsed = JSON.parse(raw) as Array<{ taskType?: string; intervalDays?: number; note?: string }>
    const items = (Array.isArray(parsed) ? parsed : []).map((item) => ({
      taskType: TASK_TYPES.includes(item.taskType ?? '') ? item.taskType : 'other',
      intervalDays: Math.max(1, Number(item.intervalDays) || 7),
      note: item.note,
    }))
    return Response.json({ success: true, items }, { headers: cors })
  } catch (e) {
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : '解析失败' },
      { status: 500, headers: cors }
    )
  }
}
