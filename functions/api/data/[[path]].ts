/* eslint-disable @typescript-eslint/no-explicit-any */
import { addDays, computeDueFromLast, computeNextDue, inScheduleWindow, shouldIncludeInRange } from './schedule-algorithm'
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

/** 带凭证时须回显 Origin，否则浏览器不发送 Cookie */
function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }
}

function parseTzOffset(url: URL): number {
  const raw = url.searchParams.get('tzOffsetMinutes')
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

/** 将 ISO 时间按 tzOffsetMinutes 转为本地日期 YYYY-MM-DD */
function isoToLocalDate(iso: string, tzOffsetMinutes: number): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso.slice(0, 10)
  // getTimezoneOffset: local -> UTC needs +offset; so UTC -> local needs -offset
  const shifted = new Date(ms - tzOffsetMinutes * 60_000)
  return shifted.toISOString().slice(0, 10)
}

function todayLocal(tzOffsetMinutes: number): string {
  return isoToLocalDate(new Date().toISOString(), tzOffsetMinutes)
}


function toPlant(row: any) {
  return {
    id: row.id,
    name: row.name,
    variety: row.variety ?? '',
    location: row.location ?? '',
    plantedAt: row.planted_at,
    photoUrl: row.photo_url ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
function toGrowth(row: any) {
  return {
    id: row.id,
    plantId: row.plant_id,
    date: row.date,
    height: row.height ?? undefined,
    leafCount: row.leaf_count ?? undefined,
    healthScore: row.health_score ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}
function toCareLog(row: any) {
  return {
    id: row.id,
    plantId: row.plant_id,
    taskType: row.task_type,
    doneAt: row.done_at,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}
function toSchedule(row: any) {
  const scope = row.scope === 'plant' ? 'plant' : 'shared'
  const rawId = row.id
  const id = rawId && (String(rawId).startsWith('tpl:') || String(rawId).startsWith('plant:')) ? rawId : `${scope === 'plant' ? 'plant' : 'tpl'}:${rawId}`
  return {
    id,
    plantId: row.plant_id,
    scope,
    taskType: row.task_type,
    intervalDays: row.interval_days,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }
}

function normalizeVarietyKey(name: string, variety: string): string {
  const v = (variety ?? '').trim()
  const n = (name ?? '').trim()
  return (v || n).trim().toLowerCase()
}

function parseScheduleRef(rawId: string): { scope: 'shared' | 'plant'; id: string } {
  if (rawId.startsWith('tpl:')) return { scope: 'shared', id: rawId.slice(4) }
  if (rawId.startsWith('plant:')) return { scope: 'plant', id: rawId.slice(6) }
  // Backward compatibility for old ids (before prefixing)
  return { scope: 'shared', id: rawId }
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

async function getCurrentUser(env: Env, request: Request) {
  const cookies = parseCookies(request)
  const token = cookies['ga_session']
  if (!token) return null
  const now = new Date().toISOString()
  const sql =
    'SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ? LIMIT 1'
  const { results } = await env.DB.prepare(sql).bind(token, now).all()
  const row = (results as any[])[0]
  if (!row) return null
  return { id: row.id as string, email: row.email as string }
}

export const onRequest = async (context: Context) => {
  try {
    const { request, env, params } = context
    const raw = params?.path
    const path = (Array.isArray(raw) ? raw.join('/') : (raw ?? '')).replace(/\/$/, '')
    const method = request.method
    const url = new URL(request.url)
    const tzOffsetMinutes = parseTzOffset(url)
    const CORS = corsHeaders(request)

    if (!env.DB) {
      return Response.json({ error: 'D1 未绑定' }, { status: 503, headers: CORS })
    }

    // 所有数据接口都要求已登录
    const user = await getCurrentUser(env, request)
    if (!user) {
      return Response.json({ error: '未登录' }, { status: 401, headers: CORS })
    }

    try {
    // GET /api/data/plants
    if (path === 'plants' && method === 'GET') {
      const { results } = await env.DB
        .prepare('SELECT * FROM plants WHERE user_id = ? ORDER BY created_at DESC')
        .bind(user.id)
        .all()
      return Response.json(results.map(toPlant), { headers: CORS })
    }

    // GET /api/data/settings
    if (path === 'settings' && method === 'GET') {
      const { results } = await env.DB
        .prepare('SELECT * FROM user_settings WHERE user_id = ?')
        .bind(user.id)
        .all()
      const row = (results as any[])[0]
      return Response.json({ location: row?.location ?? '' }, { headers: CORS })
    }

    // PUT /api/data/settings
    if (path === 'settings' && method === 'PUT') {
      const body = (await request.json()) as any
      const location = typeof body.location === 'string' ? body.location : ''
      const now = new Date().toISOString()
      await env.DB
        .prepare('INSERT OR REPLACE INTO user_settings (user_id, location, updated_at) VALUES (?, ?, ?)')
        .bind(user.id, location, now)
        .run()
      return Response.json({ location }, { headers: CORS })
    }

    // POST /api/data/import - 批量导入（用于从 localStorage 同步到 D1）
    if (path === 'import' && method === 'POST') {
      let body: any
      try {
        body = await request.json()
      } catch {
        return Response.json({ error: '请求体不是合法 JSON' }, { status: 400, headers: CORS })
      }
      if (body == null) body = {}
      const plants = Array.isArray(body.plants) ? body.plants : []
      const growthRecords = Array.isArray(body.growthRecords) ? body.growthRecords : []
      const careLogs = Array.isArray(body.careLogs) ? body.careLogs : []
      const careSchedules = Array.isArray(body.careSchedules) ? body.careSchedules : []
      for (const p of plants) {
        const vkey = normalizeVarietyKey(p.name ?? '', p.variety ?? '')
        await env.DB.prepare(
          'INSERT OR REPLACE INTO plants (id, name, variety, variety_key, location, planted_at, photo_url, notes, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            p.id ?? crypto.randomUUID(),
            p.name ?? '',
            p.variety ?? '',
            vkey,
            p.location ?? '',
            p.plantedAt ?? new Date().toISOString().slice(0, 10),
            p.photoUrl ?? null,
            p.notes ?? null,
            p.createdAt ?? new Date().toISOString(),
            p.updatedAt ?? new Date().toISOString(),
            user.id
          )
          .run()
      }
      for (const r of growthRecords) {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO growth_records (id, plant_id, date, height, leaf_count, health_score, photo_url, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            r.id ?? crypto.randomUUID(),
            r.plantId,
            r.date ?? new Date().toISOString().slice(0, 10),
            r.height ?? null,
            r.leafCount ?? null,
            r.healthScore ?? null,
            r.photoUrl ?? null,
            r.notes ?? null,
            r.createdAt ?? new Date().toISOString()
          )
          .run()
      }
      for (const l of careLogs) {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO care_logs (id, plant_id, task_type, done_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(
            l.id ?? crypto.randomUUID(),
            l.plantId,
            l.taskType ?? 'other',
            l.doneAt ?? new Date().toISOString(),
            l.notes ?? null,
            l.createdAt ?? new Date().toISOString()
          )
          .run()
      }
      for (const s of careSchedules) {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO care_schedules (id, plant_id, task_type, interval_days, created_at) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(
            s.id ?? crypto.randomUUID(),
            s.plantId,
            s.taskType ?? 'other',
            s.intervalDays ?? 7,
            s.createdAt ?? new Date().toISOString()
          )
          .run()
      }
      return Response.json(
        { success: true, imported: { plants: plants.length, growthRecords: growthRecords.length, careLogs: careLogs.length, careSchedules: careSchedules.length } },
        { headers: CORS }
      )
    }

    // POST /api/data/plants
    if (path === 'plants' && method === 'POST') {
      const body = (await request.json()) as any
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const vkey = normalizeVarietyKey(body.name ?? '', body.variety ?? '')
      await env.DB.prepare(
        'INSERT INTO plants (id, name, variety, variety_key, location, planted_at, photo_url, notes, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          id,
          body.name ?? '',
          body.variety ?? '',
          vkey,
          body.location ?? '',
          body.plantedAt ?? now.slice(0, 10),
          body.photoUrl ?? null,
          body.notes ?? null,
          now,
          now,
          user.id
        )
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      return Response.json(toPlant(results[0]), { status: 201, headers: CORS })
    }

    const pathParts = path.split('/')
    const id = pathParts[1]

    // GET /api/data/plants/:id
    if (pathParts[0] === 'plants' && pathParts.length === 2 && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      if (!results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      return Response.json(toPlant(results[0]), { headers: CORS })
    }

    // PUT /api/data/plants/:id
    if (pathParts[0] === 'plants' && pathParts.length === 2 && method === 'PUT') {
      const body = (await request.json()) as any
      const now = new Date().toISOString()
      const currentRes = await env.DB.prepare('SELECT * FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      if (!currentRes.results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const current = currentRes.results[0] as any
      const nextName = body.name !== undefined ? body.name : current.name
      const nextVariety = body.variety !== undefined ? body.variety : current.variety
      const nextLocation = body.location !== undefined ? body.location : current.location
      const nextPlantedAt = body.plantedAt !== undefined ? body.plantedAt : current.planted_at
      const nextPhotoUrl = body.photoUrl !== undefined ? body.photoUrl : current.photo_url
      const nextNotes = body.notes !== undefined ? body.notes : current.notes
      const nextVarietyKey = normalizeVarietyKey(nextName ?? '', nextVariety ?? '')
      await env.DB.prepare(
        'UPDATE plants SET name=?, variety=?, variety_key=?, location=?, planted_at=?, photo_url=?, notes=?, updated_at=? WHERE id=?'
      )
        .bind(
          nextName ?? '',
          nextVariety ?? '',
          nextVarietyKey,
          nextLocation ?? '',
          nextPlantedAt ?? '',
          nextPhotoUrl ?? null,
          nextNotes ?? null,
          now,
          id
        )
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM plants WHERE id = ?').bind(id).all()
      return Response.json(toPlant(results[0]), { headers: CORS })
    }

    // DELETE /api/data/plants/:id
    if (pathParts[0] === 'plants' && pathParts.length === 2 && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).run()
      return new Response(null, { status: 204, headers: CORS })
    }

    // GET /api/data/plants/:id/growth
    if (pathParts[0] === 'plants' && pathParts[2] === 'growth' && method === 'GET') {
      const plantRows = await env.DB.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      if (!plantRows.results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const { results } = await env.DB.prepare('SELECT * FROM growth_records WHERE plant_id = ? ORDER BY date DESC').bind(id).all()
      return Response.json(results.map(toGrowth), { headers: CORS })
    }

    // POST /api/data/plants/:id/growth
    if (pathParts[0] === 'plants' && pathParts[2] === 'growth' && method === 'POST') {
      const plantRows = await env.DB.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      if (!plantRows.results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const body = (await request.json()) as any
      const rid = crypto.randomUUID()
      const now = new Date().toISOString()
      await env.DB.prepare(
        'INSERT INTO growth_records (id, plant_id, date, height, leaf_count, health_score, photo_url, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          rid,
          id,
          body.date ?? now.slice(0, 10),
          body.height ?? null,
          body.leafCount ?? null,
          body.healthScore ?? null,
          body.photoUrl ?? null,
          body.notes ?? null,
          now
        )
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM growth_records WHERE id = ?').bind(rid).all()
      return Response.json(toGrowth(results[0]), { status: 201, headers: CORS })
    }

    // GET /api/data/plants/:id/care-logs
    if (pathParts[0] === 'plants' && pathParts[2] === 'care-logs' && method === 'GET') {
      const plantRows = await env.DB.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      if (!plantRows.results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const { results } = await env.DB.prepare('SELECT * FROM care_logs WHERE plant_id = ? ORDER BY done_at DESC').bind(id).all()
      return Response.json(results.map(toCareLog), { headers: CORS })
    }

    // POST /api/data/plants/:id/care-logs
    if (pathParts[0] === 'plants' && pathParts[2] === 'care-logs' && method === 'POST') {
      const plantRows = await env.DB.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      if (!plantRows.results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const body = (await request.json()) as any
      const rid = crypto.randomUUID()
      const now = new Date().toISOString()
      await env.DB.prepare(
        'INSERT INTO care_logs (id, plant_id, task_type, done_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(rid, id, body.taskType ?? 'other', body.doneAt ?? now, body.notes ?? null, now)
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM care_logs WHERE id = ?').bind(rid).all()
      return Response.json(toCareLog(results[0]), { status: 201, headers: CORS })
    }

    // GET /api/data/plants/:id/schedules
    if (pathParts[0] === 'plants' && pathParts[2] === 'schedules' && method === 'GET') {
      const plantRes = await env.DB
        .prepare('SELECT id, variety_key, name, variety FROM plants WHERE id = ? AND user_id = ?')
        .bind(id, user.id)
        .all()
      const prow = (plantRes.results as any[])[0]
      if (!prow) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const vkey = prow.variety_key ?? normalizeVarietyKey(prow.name ?? '', prow.variety ?? '')
      const [templateRes, plantRes2] = await Promise.all([
        env.DB
          .prepare('SELECT * FROM care_schedule_templates WHERE user_id = ? AND variety_key = ? ORDER BY task_type')
          .bind(user.id, vkey)
          .all(),
        env.DB.prepare('SELECT * FROM care_schedules WHERE plant_id = ? ORDER BY task_type').bind(id).all(),
      ])
      const templateRows = (templateRes.results as any[]).map((r) => ({ ...r, plant_id: id, scope: 'shared' }))
      const plantRows = (plantRes2.results as any[]).map((r) => ({ ...r, scope: 'plant' }))
      const merged = [...templateRows, ...plantRows]
      return Response.json(merged.map(toSchedule), { headers: CORS })
    }

    // POST /api/data/plants/:id/schedules
    if (pathParts[0] === 'plants' && pathParts[2] === 'schedules' && method === 'POST') {
      const plantRes = await env.DB
        .prepare('SELECT id, variety_key, name, variety FROM plants WHERE id = ? AND user_id = ?')
        .bind(id, user.id)
        .all()
      const prow = (plantRes.results as any[])[0]
      if (!prow) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const vkey = prow.variety_key ?? normalizeVarietyKey(prow.name ?? '', prow.variety ?? '')

      const body = (await request.json()) as any
      const now = new Date().toISOString()
      if (body.scope === 'plant') {
        const sid = crypto.randomUUID()
        await env.DB
          .prepare(
            'INSERT INTO care_schedules (id, plant_id, task_type, interval_days, start_date, end_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            sid,
            id,
            body.taskType ?? 'other',
            body.intervalDays ?? 7,
            body.startDate ?? null,
            body.endDate ?? null,
            body.note ?? null,
            now
          )
          .run()
        const { results } = await env.DB.prepare('SELECT * FROM care_schedules WHERE id = ?').bind(sid).all()
        return Response.json(toSchedule({ ...(results as any[])[0], scope: 'plant' }), { status: 201, headers: CORS })
      }

      const tid = crypto.randomUUID()
      await env.DB
        .prepare(
          'INSERT INTO care_schedule_templates (id, user_id, variety_key, task_type, interval_days, start_date, end_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          tid,
          user.id,
          vkey,
          body.taskType ?? 'other',
          body.intervalDays ?? 7,
          body.startDate ?? null,
          body.endDate ?? null,
          body.note ?? null,
          now
        )
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM care_schedule_templates WHERE id = ?').bind(tid).all()
      return Response.json(toSchedule({ ...(results as any[])[0], plant_id: id, scope: 'shared' }), { status: 201, headers: CORS })
    }

    // GET /api/data/plants/:id/timeline
    if (pathParts[0] === 'plants' && pathParts[2] === 'timeline' && method === 'GET') {
      const plantRows = await env.DB.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      if (!plantRows.results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const [growthRes, careRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM growth_records WHERE plant_id = ? ORDER BY date DESC').bind(id).all(),
        env.DB.prepare('SELECT * FROM care_logs WHERE plant_id = ? ORDER BY done_at DESC').bind(id).all(),
      ])
      const items: any[] = []
      for (const r of growthRes.results as any[]) items.push({ kind: 'growth', id: r.id, date: r.date, data: toGrowth(r) })
      for (const r of careRes.results as any[]) items.push({ kind: 'care', id: r.id, date: r.done_at.slice(0, 10), data: toCareLog(r) })
      items.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
      return Response.json(items, { headers: CORS })
    }

    // DELETE /api/data/growth/:id
    if (pathParts[0] === 'growth' && pathParts.length === 2 && method === 'DELETE') {
      const gid = pathParts[1]
      const { results } = await env.DB
        .prepare('SELECT gr.id FROM growth_records gr JOIN plants p ON gr.plant_id = p.id WHERE gr.id = ? AND p.user_id = ?')
        .bind(gid, user.id)
        .all()
      if (!results.length) return new Response(null, { status: 204, headers: CORS })
      await env.DB.prepare('DELETE FROM growth_records WHERE id = ?').bind(gid).run()
      return new Response(null, { status: 204, headers: CORS })
    }

    // DELETE /api/data/care-logs/:id
    if (pathParts[0] === 'care-logs' && pathParts.length === 2 && method === 'DELETE') {
      const cid = pathParts[1]
      const { results } = await env.DB
        .prepare('SELECT cl.id FROM care_logs cl JOIN plants p ON cl.plant_id = p.id WHERE cl.id = ? AND p.user_id = ?')
        .bind(cid, user.id)
        .all()
      if (!results.length) return new Response(null, { status: 204, headers: CORS })
      await env.DB.prepare('DELETE FROM care_logs WHERE id = ?').bind(cid).run()
      return new Response(null, { status: 204, headers: CORS })
    }

    // PUT /api/data/care-logs/:id
    if (pathParts[0] === 'care-logs' && pathParts.length === 2 && method === 'PUT') {
      const cid = pathParts[1]
      const { results } = await env.DB
        .prepare('SELECT * FROM care_logs WHERE id = ? AND plant_id IN (SELECT id FROM plants WHERE user_id = ?)')
        .bind(cid, user.id)
        .all()
      if (!results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const current = results[0] as any
      const body = (await request.json()) as any
      const nextTaskType = body.taskType ?? current.task_type
      const nextDoneAt = body.doneAt ?? current.done_at
      const nextNotes = body.notes !== undefined ? body.notes : current.notes
      await env.DB.prepare('UPDATE care_logs SET task_type = ?, done_at = ?, notes = ? WHERE id = ?')
        .bind(nextTaskType, nextDoneAt, nextNotes ?? null, cid)
        .run()
      const after = await env.DB.prepare('SELECT * FROM care_logs WHERE id = ?').bind(cid).all()
      return Response.json(toCareLog(after.results[0]), { headers: CORS })
    }

    // DELETE /api/data/schedules/:id
    if (pathParts[0] === 'schedules' && pathParts.length === 2 && method === 'DELETE') {
      const raw = decodeURIComponent(pathParts[1])
      const sid = parseScheduleRef(raw)
      if (sid.scope === 'plant') {
        const { results } = await env.DB
          .prepare('SELECT cs.id FROM care_schedules cs JOIN plants p ON cs.plant_id = p.id WHERE cs.id = ? AND p.user_id = ?')
          .bind(sid.id, user.id)
          .all()
        if (!results.length) return new Response(null, { status: 204, headers: CORS })
        await env.DB.prepare('DELETE FROM care_schedules WHERE id = ?').bind(sid.id).run()
      } else {
        const { results } = await env.DB
          .prepare('SELECT id FROM care_schedule_templates WHERE id = ? AND user_id = ?')
          .bind(sid.id, user.id)
          .all()
        if (!results.length) return new Response(null, { status: 204, headers: CORS })
        await env.DB.prepare('DELETE FROM care_schedule_templates WHERE id = ?').bind(sid.id).run()
      }
      return new Response(null, { status: 204, headers: CORS })
    }

    // PUT /api/data/schedules/:id
    if (pathParts[0] === 'schedules' && pathParts.length === 2 && method === 'PUT') {
      const raw = decodeURIComponent(pathParts[1])
      const sid = parseScheduleRef(raw)
      const body = (await request.json()) as any

      if (sid.scope === 'plant') {
        const { results } = await env.DB
          .prepare('SELECT cs.* FROM care_schedules cs JOIN plants p ON cs.plant_id = p.id WHERE cs.id = ? AND p.user_id = ?')
          .bind(sid.id, user.id)
          .all()
        if (!results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
        const current = results[0] as any
        const nextTaskType = body.taskType ?? current.task_type
        const nextIntervalDays = body.intervalDays ?? current.interval_days
        const nextStartDate = body.startDate !== undefined ? body.startDate : current.start_date
        const nextEndDate = body.endDate !== undefined ? body.endDate : current.end_date
        const nextNote = body.note !== undefined ? body.note : current.note
        await env.DB
          .prepare('UPDATE care_schedules SET task_type = ?, interval_days = ?, start_date = ?, end_date = ?, note = ? WHERE id = ?')
          .bind(nextTaskType, nextIntervalDays, nextStartDate ?? null, nextEndDate ?? null, nextNote ?? null, sid.id)
          .run()
        const after = await env.DB.prepare('SELECT * FROM care_schedules WHERE id = ?').bind(sid.id).all()
        return Response.json(toSchedule({ ...(after.results as any[])[0], scope: 'plant' }), { headers: CORS })
      }

      const { results } = await env.DB
        .prepare('SELECT * FROM care_schedule_templates WHERE id = ? AND user_id = ?')
        .bind(sid.id, user.id)
        .all()
      if (!results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const current = results[0] as any
      const nextTaskType = body.taskType ?? current.task_type
      const nextIntervalDays = body.intervalDays ?? current.interval_days
      const nextStartDate = body.startDate !== undefined ? body.startDate : current.start_date
      const nextEndDate = body.endDate !== undefined ? body.endDate : current.end_date
      const nextNote = body.note !== undefined ? body.note : current.note
      await env.DB
        .prepare('UPDATE care_schedule_templates SET task_type = ?, interval_days = ?, start_date = ?, end_date = ?, note = ? WHERE id = ?')
        .bind(nextTaskType, nextIntervalDays, nextStartDate ?? null, nextEndDate ?? null, nextNote ?? null, sid.id)
        .run()
      const after = await env.DB.prepare('SELECT * FROM care_schedule_templates WHERE id = ?').bind(sid.id).all()
      return Response.json(toSchedule({ ...(after.results as any[])[0], plant_id: current.plant_id ?? '', scope: 'shared' }), { headers: CORS })
    }

    // GET /api/data/tasks/due?range=today|week
    if (pathParts[0] === 'tasks' && pathParts[1] === 'due' && method === 'GET') {
      const range = url.searchParams.get('range') || 'today'
      const today = todayLocal(tzOffsetMinutes)
      const endOfWeek = addDays(today, 6)
      const [plantsRes, templatesRes, plantSchedulesRes, logsRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM plants WHERE user_id = ?').bind(user.id).all(),
        env.DB.prepare('SELECT * FROM care_schedule_templates WHERE user_id = ?').bind(user.id).all(),
        env.DB
          .prepare('SELECT cs.* FROM care_schedules cs JOIN plants p ON cs.plant_id = p.id WHERE p.user_id = ?')
          .bind(user.id)
          .all(),
        env.DB
          .prepare(
            'SELECT cl.* FROM care_logs cl JOIN plants p ON cl.plant_id = p.id WHERE p.user_id = ? ORDER BY cl.done_at DESC'
          )
          .bind(user.id)
          .all(),
      ])
      const plants = (plantsRes.results as any[]).map(toPlant)
      const templates = templatesRes.results as any[]
      const plantSchedules = plantSchedulesRes.results as any[]
      const logs = logsRes.results as any[]
      const lastDone = (plantId: string, taskType: string) => {
        const same = logs.filter((l: any) => l.plant_id === plantId && l.task_type === taskType)
        return same[0] ? isoToLocalDate(same[0].done_at, tzOffsetMinutes) : null
      }
      const result: any[] = []
      const byVariety: Record<string, any[]> = {}
      for (const t of templates) {
        const k = (t.variety_key ?? '').toString()
        if (!byVariety[k]) byVariety[k] = []
        byVariety[k].push(t)
      }
      for (const plant of plants) {
        const vkey = normalizeVarietyKey(plant.name ?? '', plant.variety ?? '')
        const mergedSchedules = [
          ...(byVariety[vkey] || []).map((t) => ({ ...t, plant_id: plant.id, scope: 'shared' })),
          ...plantSchedules.filter((s) => s.plant_id === plant.id).map((s) => ({ ...s, scope: 'plant' })),
        ]
        for (const t of mergedSchedules) {
          const last = lastDone(plant.id, t.task_type)
          const nextDue =
            range === 'today'
              ? computeDueFromLast(today, last, t.interval_days, t.start_date)
              : computeNextDue(today, last, t.interval_days, t.start_date)
          const inRange = shouldIncludeInRange(range as 'today' | 'week', today, endOfWeek, nextDue, t.start_date, t.end_date)
          if (inRange)
            result.push({
              plant,
              schedule: toSchedule({ ...t, plant_id: plant.id }),
              nextDue,
              lastDoneAt: last ? last + 'T12:00:00Z' : null,
            })
        }
      }
      result.sort((a, b) => (a.nextDue > b.nextDue ? 1 : a.nextDue < b.nextDue ? -1 : 0))
      return Response.json(result, { headers: CORS })
    }

    // GET /api/data/tasks/today-count
    if (pathParts[0] === 'tasks' && pathParts[1] === 'today-count' && method === 'GET') {
      const today = todayLocal(tzOffsetMinutes)
      const [plantsRes, templatesRes, plantSchedulesRes, logsRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM plants WHERE user_id = ?').bind(user.id).all(),
        env.DB.prepare('SELECT * FROM care_schedule_templates WHERE user_id = ?').bind(user.id).all(),
        env.DB
          .prepare('SELECT cs.* FROM care_schedules cs JOIN plants p ON cs.plant_id = p.id WHERE p.user_id = ?')
          .bind(user.id)
          .all(),
        env.DB
          .prepare(
            'SELECT cl.* FROM care_logs cl JOIN plants p ON cl.plant_id = p.id WHERE p.user_id = ? ORDER BY cl.done_at DESC'
          )
          .bind(user.id)
          .all(),
      ])
      const plants = (plantsRes.results as any[]).map(toPlant)
      const templates = templatesRes.results as any[]
      const plantSchedules = plantSchedulesRes.results as any[]
      const logs = logsRes.results as any[]
      const lastDone = (plantId: string, taskType: string) => {
        const same = logs.filter((l: any) => l.plant_id === plantId && l.task_type === taskType)
        return same[0] ? isoToLocalDate(same[0].done_at, tzOffsetMinutes) : null
      }
      let count = 0
      const byVariety: Record<string, any[]> = {}
      for (const t of templates) {
        const k = (t.variety_key ?? '').toString()
        if (!byVariety[k]) byVariety[k] = []
        byVariety[k].push(t)
      }
      for (const plant of plants) {
        const vkey = normalizeVarietyKey(plant.name ?? '', plant.variety ?? '')
        const mergedSchedules = [
          ...(byVariety[vkey] || []).map((t) => ({ ...t, plant_id: plant.id, scope: 'shared' })),
          ...plantSchedules.filter((s) => s.plant_id === plant.id).map((s) => ({ ...s, scope: 'plant' })),
        ]
        for (const t of mergedSchedules) {
          if (!inScheduleWindow(today, t.start_date, t.end_date)) continue
          const last = lastDone(plant.id, t.task_type)
          const nextDue = computeNextDue(today, last, t.interval_days, t.start_date)
          if (t.end_date && nextDue > t.end_date) continue
          if (nextDue <= today) count++
        }
      }
      return Response.json(count, { headers: CORS })
    }

    // GET /api/data/tasks/due/:date
    if (pathParts[0] === 'tasks' && pathParts[1] === 'due' && pathParts.length === 3 && method === 'GET') {
      const dateStr = pathParts[2]
      const today = todayLocal(tzOffsetMinutes)
      const [plantsRes, templatesRes, plantSchedulesRes, logsRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM plants WHERE user_id = ?').bind(user.id).all(),
        env.DB.prepare('SELECT * FROM care_schedule_templates WHERE user_id = ?').bind(user.id).all(),
        env.DB
          .prepare('SELECT cs.* FROM care_schedules cs JOIN plants p ON cs.plant_id = p.id WHERE p.user_id = ?')
          .bind(user.id)
          .all(),
        env.DB
          .prepare(
            'SELECT cl.* FROM care_logs cl JOIN plants p ON cl.plant_id = p.id WHERE p.user_id = ? ORDER BY cl.done_at DESC'
          )
          .bind(user.id)
          .all(),
      ])
      const plants = (plantsRes.results as any[]).map(toPlant)
      const templates = templatesRes.results as any[]
      const plantSchedules = plantSchedulesRes.results as any[]
      const logs = logsRes.results as any[]
      const lastDone = (plantId: string, taskType: string) => {
        const same = logs.filter((l: any) => l.plant_id === plantId && l.task_type === taskType)
        return same[0] ? isoToLocalDate(same[0].done_at, tzOffsetMinutes) : null
      }
      const result: any[] = []
      const byVariety: Record<string, any[]> = {}
      for (const t of templates) {
        const k = (t.variety_key ?? '').toString()
        if (!byVariety[k]) byVariety[k] = []
        byVariety[k].push(t)
      }
      for (const plant of plants) {
        const vkey = normalizeVarietyKey(plant.name ?? '', plant.variety ?? '')
        const mergedSchedules = [
          ...(byVariety[vkey] || []).map((t) => ({ ...t, plant_id: plant.id, scope: 'shared' })),
          ...plantSchedules.filter((s) => s.plant_id === plant.id).map((s) => ({ ...s, scope: 'plant' })),
        ]
        for (const t of mergedSchedules) {
          if (!inScheduleWindow(dateStr, t.start_date, t.end_date)) continue
          const last = lastDone(plant.id, t.task_type)
          const nextDue = computeNextDue(today, last, t.interval_days, t.start_date)
          if (t.end_date && nextDue > t.end_date) continue
          if (nextDue === dateStr)
            result.push({
              plant,
              schedule: toSchedule({ ...t, plant_id: plant.id }),
              nextDue,
              lastDoneAt: last ? last + 'T12:00:00Z' : null,
            })
        }
      }
      return Response.json(result, { headers: CORS })
    }

    // GET /api/data/care-logs/date/:date
    if (pathParts[0] === 'care-logs' && pathParts[1] === 'date' && pathParts.length === 3 && method === 'GET') {
      const dateStr = pathParts[2]
      const { results } = await env.DB
        .prepare(
          "SELECT cl.* FROM care_logs cl JOIN plants p ON cl.plant_id = p.id WHERE p.user_id = ? AND strftime('%Y-%m-%d', cl.done_at) = ?"
        )
        .bind(user.id, dateStr)
        .all()
      return Response.json((results as any[]).map(toCareLog), { headers: CORS })
    }

    // GET /api/data/recent-care-logs?limit=5
    if (pathParts[0] === 'recent-care-logs' && method === 'GET') {
      const limit = Math.min(20, parseInt(url.searchParams.get('limit') || '5', 10) || 5)
      const { results: logRows } = await env.DB
        .prepare(
          'SELECT cl.* FROM care_logs cl JOIN plants p ON cl.plant_id = p.id WHERE p.user_id = ? ORDER BY cl.done_at DESC LIMIT ?'
        )
        .bind(user.id, limit)
        .all()
      const logs = (logRows as any[]).map(toCareLog)
      const plantIds = [...new Set(logs.map((l: any) => l.plantId))]
      const plants: any[] = []
      for (const pid of plantIds) {
        const { results } = await env.DB
          .prepare('SELECT * FROM plants WHERE id = ? AND user_id = ?')
          .bind(pid, user.id)
          .all()
        if (results.length) plants.push(toPlant(results[0]))
      }
      const getPlant = (pid: string) => plants.find((p: any) => p.id === pid)
      return Response.json(logs.map((log: any) => ({ log, plant: getPlant(log.plantId) })), { headers: CORS })
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Server error' },
        { status: 500, headers: CORS }
      )
    }
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Worker error' },
      { status: 500, headers: CORS }
    )
  }
}
