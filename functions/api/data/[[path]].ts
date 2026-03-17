/* eslint-disable @typescript-eslint/no-explicit-any */
interface D1Database {
  prepare: (query: string) => { bind: (...args: any[]) => { run: () => Promise<void>; all: () => Promise<{ results: any[] }> }; run: () => Promise<void>; all: () => Promise<{ results: any[] }> }
}
type Env = { DB: D1Database }
type Context = { request: Request; env: Env; params: { path?: string } }

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

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
  return {
    id: row.id,
    plantId: row.plant_id,
    taskType: row.task_type,
    intervalDays: row.interval_days,
    createdAt: row.created_at,
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const onRequest = async (context: Context) => {
  try {
    const { request, env, params } = context
    const raw = params?.path
    const path = (Array.isArray(raw) ? raw.join('/') : (raw ?? '')).replace(/\/$/, '')
    const method = request.method
    const url = new URL(request.url)
    const tzOffsetMinutes = parseTzOffset(url)

    if (!env.DB) {
      return Response.json({ error: 'D1 未绑定' }, { status: 503, headers: CORS })
    }

    try {
    // GET /api/data/plants
    if (path === 'plants' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM plants ORDER BY created_at DESC').all()
      return Response.json(results.map(toPlant), { headers: CORS })
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
        await env.DB.prepare(
          'INSERT OR REPLACE INTO plants (id, name, variety, location, planted_at, photo_url, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            p.id ?? crypto.randomUUID(),
            p.name ?? '',
            p.variety ?? '',
            p.location ?? '',
            p.plantedAt ?? new Date().toISOString().slice(0, 10),
            p.photoUrl ?? null,
            p.notes ?? null,
            p.createdAt ?? new Date().toISOString(),
            p.updatedAt ?? new Date().toISOString()
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
      await env.DB.prepare(
        'INSERT INTO plants (id, name, variety, location, planted_at, photo_url, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          id,
          body.name ?? '',
          body.variety ?? '',
          body.location ?? '',
          body.plantedAt ?? now.slice(0, 10),
          body.photoUrl ?? null,
          body.notes ?? null,
          now,
          now
        )
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM plants WHERE id = ?').bind(id).all()
      return Response.json(toPlant(results[0]), { status: 201, headers: CORS })
    }

    const pathParts = path.split('/')
    const id = pathParts[1]

    // GET /api/data/plants/:id
    if (pathParts[0] === 'plants' && pathParts.length === 2 && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM plants WHERE id = ?').bind(id).all()
      if (!results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      return Response.json(toPlant(results[0]), { headers: CORS })
    }

    // PUT /api/data/plants/:id
    if (pathParts[0] === 'plants' && pathParts.length === 2 && method === 'PUT') {
      const body = (await request.json()) as any
      const now = new Date().toISOString()
      await env.DB.prepare(
        'UPDATE plants SET name=?, variety=?, location=?, planted_at=?, photo_url=?, notes=?, updated_at=? WHERE id=?'
      )
        .bind(
          body.name ?? '',
          body.variety ?? '',
          body.location ?? '',
          body.plantedAt ?? '',
          body.photoUrl ?? null,
          body.notes ?? null,
          now,
          id
        )
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM plants WHERE id = ?').bind(id).all()
      return Response.json(toPlant(results[0]), { headers: CORS })
    }

    // DELETE /api/data/plants/:id
    if (pathParts[0] === 'plants' && pathParts.length === 2 && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM plants WHERE id = ?').bind(id).run()
      return new Response(null, { status: 204, headers: CORS })
    }

    // GET /api/data/plants/:id/growth
    if (pathParts[0] === 'plants' && pathParts[2] === 'growth' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM growth_records WHERE plant_id = ? ORDER BY date DESC').bind(id).all()
      return Response.json(results.map(toGrowth), { headers: CORS })
    }

    // POST /api/data/plants/:id/growth
    if (pathParts[0] === 'plants' && pathParts[2] === 'growth' && method === 'POST') {
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
      const { results } = await env.DB.prepare('SELECT * FROM care_logs WHERE plant_id = ? ORDER BY done_at DESC').bind(id).all()
      return Response.json(results.map(toCareLog), { headers: CORS })
    }

    // POST /api/data/plants/:id/care-logs
    if (pathParts[0] === 'plants' && pathParts[2] === 'care-logs' && method === 'POST') {
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
      const { results } = await env.DB.prepare('SELECT * FROM care_schedules WHERE plant_id = ? ORDER BY task_type').bind(id).all()
      return Response.json(results.map(toSchedule), { headers: CORS })
    }

    // POST /api/data/plants/:id/schedules
    if (pathParts[0] === 'plants' && pathParts[2] === 'schedules' && method === 'POST') {
      const body = (await request.json()) as any
      const sid = crypto.randomUUID()
      const now = new Date().toISOString()
      await env.DB.prepare(
        'INSERT INTO care_schedules (id, plant_id, task_type, interval_days, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(sid, id, body.taskType ?? 'other', body.intervalDays ?? 7, now)
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM care_schedules WHERE id = ?').bind(sid).all()
      return Response.json(toSchedule(results[0]), { status: 201, headers: CORS })
    }

    // GET /api/data/plants/:id/timeline
    if (pathParts[0] === 'plants' && pathParts[2] === 'timeline' && method === 'GET') {
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
      await env.DB.prepare('DELETE FROM growth_records WHERE id = ?').bind(pathParts[1]).run()
      return new Response(null, { status: 204, headers: CORS })
    }

    // DELETE /api/data/care-logs/:id
    if (pathParts[0] === 'care-logs' && pathParts.length === 2 && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM care_logs WHERE id = ?').bind(pathParts[1]).run()
      return new Response(null, { status: 204, headers: CORS })
    }

    // PUT /api/data/care-logs/:id
    if (pathParts[0] === 'care-logs' && pathParts.length === 2 && method === 'PUT') {
      const cid = pathParts[1]
      const { results } = await env.DB.prepare('SELECT * FROM care_logs WHERE id = ?').bind(cid).all()
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
      await env.DB.prepare('DELETE FROM care_schedules WHERE id = ?').bind(pathParts[1]).run()
      return new Response(null, { status: 204, headers: CORS })
    }

    // PUT /api/data/schedules/:id
    if (pathParts[0] === 'schedules' && pathParts.length === 2 && method === 'PUT') {
      const sid = pathParts[1]
      const { results } = await env.DB.prepare('SELECT * FROM care_schedules WHERE id = ?').bind(sid).all()
      if (!results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const current = results[0] as any
      const body = (await request.json()) as any
      const nextTaskType = body.taskType ?? current.task_type
      const nextIntervalDays = body.intervalDays ?? current.interval_days
      await env.DB.prepare('UPDATE care_schedules SET task_type = ?, interval_days = ? WHERE id = ?')
        .bind(nextTaskType, nextIntervalDays, sid)
        .run()
      const after = await env.DB.prepare('SELECT * FROM care_schedules WHERE id = ?').bind(sid).all()
      return Response.json(toSchedule(after.results[0]), { headers: CORS })
    }

    // GET /api/data/tasks/due?range=today|week
    if (pathParts[0] === 'tasks' && pathParts[1] === 'due' && method === 'GET') {
      const range = url.searchParams.get('range') || 'today'
      const today = todayLocal(tzOffsetMinutes)
      const endOfWeek = addDays(today, 6)
      const [plantsRes, schedulesRes, logsRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM plants').all(),
        env.DB.prepare('SELECT * FROM care_schedules').all(),
        env.DB.prepare('SELECT * FROM care_logs ORDER BY done_at DESC').all(),
      ])
      const plants = (plantsRes.results as any[]).map(toPlant)
      const schedules = schedulesRes.results as any[]
      const logs = logsRes.results as any[]
      const getPlant = (pid: string) => plants.find((p: any) => p.id === pid)
      const lastDone = (plantId: string, taskType: string) => {
        const same = logs.filter((l: any) => l.plant_id === plantId && l.task_type === taskType)
        return same[0] ? isoToLocalDate(same[0].done_at, tzOffsetMinutes) : null
      }
      const result: any[] = []
      for (const s of schedules) {
        const plant = getPlant(s.plant_id)
        if (!plant) continue
        const last = lastDone(s.plant_id, s.task_type)
        const nextDue = last ? addDays(last, s.interval_days) : today
        const inRange = range === 'today' ? nextDue <= today : nextDue >= today && nextDue <= endOfWeek
        if (inRange) result.push({ plant, schedule: toSchedule(s), nextDue, lastDoneAt: last ? last + 'T12:00:00Z' : null })
      }
      result.sort((a, b) => (a.nextDue > b.nextDue ? 1 : a.nextDue < b.nextDue ? -1 : 0))
      return Response.json(result, { headers: CORS })
    }

    // GET /api/data/tasks/today-count
    if (pathParts[0] === 'tasks' && pathParts[1] === 'today-count' && method === 'GET') {
      const today = todayLocal(tzOffsetMinutes)
      const [schedulesRes, logsRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM care_schedules').all(),
        env.DB.prepare('SELECT * FROM care_logs ORDER BY done_at DESC').all(),
      ])
      const schedules = schedulesRes.results as any[]
      const logs = logsRes.results as any[]
      const lastDone = (plantId: string, taskType: string) => {
        const same = logs.filter((l: any) => l.plant_id === plantId && l.task_type === taskType)
        return same[0] ? isoToLocalDate(same[0].done_at, tzOffsetMinutes) : null
      }
      let count = 0
      for (const s of schedules) {
        const last = lastDone(s.plant_id, s.task_type)
        const nextDue = last ? addDays(last, s.interval_days) : today
        if (nextDue <= today) count++
      }
      return Response.json(count, { headers: CORS })
    }

    // GET /api/data/tasks/due/:date
    if (pathParts[0] === 'tasks' && pathParts[1] === 'due' && pathParts.length === 3 && method === 'GET') {
      const dateStr = pathParts[2]
      const [plantsRes, schedulesRes, logsRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM plants').all(),
        env.DB.prepare('SELECT * FROM care_schedules').all(),
        env.DB.prepare('SELECT * FROM care_logs ORDER BY done_at DESC').all(),
      ])
      const plants = (plantsRes.results as any[]).map(toPlant)
      const schedules = schedulesRes.results as any[]
      const logs = logsRes.results as any[]
      const getPlant = (pid: string) => plants.find((p: any) => p.id === pid)
      const lastDone = (plantId: string, taskType: string) => {
        const same = logs.filter((l: any) => l.plant_id === plantId && l.task_type === taskType)
        return same[0] ? isoToLocalDate(same[0].done_at, tzOffsetMinutes) : null
      }
      const result: any[] = []
      for (const s of schedules) {
        const plant = getPlant(s.plant_id)
        if (!plant) continue
        const last = lastDone(s.plant_id, s.task_type)
        const nextDue = last ? addDays(last, s.interval_days) : todayLocal(tzOffsetMinutes)
        if (nextDue === dateStr) result.push({ plant, schedule: toSchedule(s), nextDue, lastDoneAt: last ? last + 'T12:00:00Z' : null })
      }
      return Response.json(result, { headers: CORS })
    }

    // GET /api/data/care-logs/date/:date
    if (pathParts[0] === 'care-logs' && pathParts[1] === 'date' && pathParts.length === 3 && method === 'GET') {
      const dateStr = pathParts[2]
      const { results } = await env.DB.prepare("SELECT * FROM care_logs WHERE strftime('%Y-%m-%d', done_at) = ?").bind(dateStr).all()
      return Response.json((results as any[]).map(toCareLog), { headers: CORS })
    }

    // GET /api/data/recent-care-logs?limit=5
    if (pathParts[0] === 'recent-care-logs' && method === 'GET') {
      const limit = Math.min(20, parseInt(url.searchParams.get('limit') || '5', 10) || 5)
      const { results: logRows } = await env.DB.prepare('SELECT * FROM care_logs ORDER BY done_at DESC LIMIT ?').bind(limit).all()
      const logs = (logRows as any[]).map(toCareLog)
      const plantIds = [...new Set(logs.map((l: any) => l.plantId))]
      const plants: any[] = []
      for (const pid of plantIds) {
        const { results } = await env.DB.prepare('SELECT * FROM plants WHERE id = ?').bind(pid).all()
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
