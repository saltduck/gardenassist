/* eslint-disable @typescript-eslint/no-explicit-any */
interface D1Database {
  prepare: (query: string) => { bind: (...args: any[]) => { run: () => Promise<void>; all: () => Promise<{ results: any[] }> }; run: () => Promise<void>; all: () => Promise<{ results: any[] }> }
}
type Env = { DB: D1Database }
type Context = { request: Request; env: Env; params: { path?: string } }

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

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
  const { request, env, params } = context
  const path = (params.path ?? '').replace(/\/$/, '')
  const method = request.method
  const url = new URL(request.url)

  if (!env.DB) {
    return Response.json({ error: 'D1 未绑定' }, { status: 503, headers: CORS })
  }

  try {
    // GET /api/data/plants
    if (path === 'plants' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM plants ORDER BY created_at DESC').all()
      return Response.json(results.map(toPlant), { headers: CORS })
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

    // DELETE /api/data/schedules/:id
    if (pathParts[0] === 'schedules' && pathParts.length === 2 && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM care_schedules WHERE id = ?').bind(pathParts[1]).run()
      return new Response(null, { status: 204, headers: CORS })
    }

    // GET /api/data/tasks/due?range=today|week
    if (pathParts[0] === 'tasks' && pathParts[1] === 'due' && method === 'GET') {
      const range = url.searchParams.get('range') || 'today'
      const today = new Date().toISOString().slice(0, 10)
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
        return same[0] ? same[0].done_at.slice(0, 10) : null
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
      const today = new Date().toISOString().slice(0, 10)
      const [schedulesRes, logsRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM care_schedules').all(),
        env.DB.prepare('SELECT * FROM care_logs ORDER BY done_at DESC').all(),
      ])
      const schedules = schedulesRes.results as any[]
      const logs = logsRes.results as any[]
      const lastDone = (plantId: string, taskType: string) => {
        const same = logs.filter((l: any) => l.plant_id === plantId && l.task_type === taskType)
        return same[0] ? same[0].done_at.slice(0, 10) : null
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
        return same[0] ? same[0].done_at.slice(0, 10) : null
      }
      const result: any[] = []
      for (const s of schedules) {
        const plant = getPlant(s.plant_id)
        if (!plant) continue
        const last = lastDone(s.plant_id, s.task_type)
        const nextDue = last ? addDays(last, s.interval_days) : new Date().toISOString().slice(0, 10)
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
}
