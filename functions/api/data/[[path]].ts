/* eslint-disable @typescript-eslint/no-explicit-any */
import { corsHeaders, getCurrentUser } from '../_shared/session'
import {
  buildDueTasks,
  countTodayDueTasks,
  normalizeVarietyKey,
  resolveVarietyKeyFromPlantRow,
} from './due-tasks'
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
    archivedAt: row.archived_at ?? undefined,
    archiveReason: row.archive_reason ?? undefined,
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

function toCareSkip(row: any) {
  return {
    id: row.id,
    plantId: row.plant_id,
    taskType: row.task_type,
    skippedAt: row.skipped_at,
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

function toDailyWeather(row: any) {
  return {
    date: row.date,
    tempMaxC: row.temp_max_c != null ? Number(row.temp_max_c) : null,
    tempMinC: row.temp_min_c != null ? Number(row.temp_min_c) : null,
    precipitationMm: row.precipitation_mm != null ? Number(row.precipitation_mm) : null,
    updatedAt: row.updated_at,
  }
}

function parseOptionalWeatherNumber(body: Record<string, unknown>, key: string): number | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(body, key)) return undefined
  const v = body[key]
  if (v === null) return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) throw new Error(`字段 ${key} 须为数字`)
  return n
}

function parseScheduleRef(rawId: string): { scope: 'shared' | 'plant'; id: string } {
  if (rawId.startsWith('tpl:')) return { scope: 'shared', id: rawId.slice(4) }
  if (rawId.startsWith('plant:')) return { scope: 'plant', id: rawId.slice(6) }
  // Backward compatibility for old ids (before prefixing)
  return { scope: 'shared', id: rawId }
}

async function loadDueTaskSourceData(env: Env, userId: string) {
  const [plantsRes, templatesRes, plantSchedulesRes, logsRes, skipsRes] = await Promise.all([
    env.DB.prepare('SELECT * FROM plants WHERE user_id = ? AND archived_at IS NULL').bind(userId).all(),
    env.DB.prepare('SELECT * FROM care_schedule_templates WHERE user_id = ?').bind(userId).all(),
    env.DB
      .prepare(
        'SELECT cs.* FROM care_schedules cs JOIN plants p ON cs.plant_id = p.id WHERE p.user_id = ? AND p.archived_at IS NULL'
      )
      .bind(userId)
      .all(),
    env.DB
      .prepare(
        'SELECT cl.* FROM care_logs cl JOIN plants p ON cl.plant_id = p.id WHERE p.user_id = ? AND p.archived_at IS NULL ORDER BY cl.done_at DESC'
      )
      .bind(userId)
      .all(),
    env.DB
      .prepare(
        'SELECT cs.* FROM care_skips cs JOIN plants p ON cs.plant_id = p.id WHERE p.user_id = ? AND p.archived_at IS NULL ORDER BY cs.skipped_at DESC'
      )
      .bind(userId)
      .all(),
  ])
  return {
    plantRows: plantsRes.results as any[],
    templates: templatesRes.results as any[],
    plantSchedules: plantSchedulesRes.results as any[],
    logs: logsRes.results as any[],
    skips: skipsRes.results as any[],
  }
}

function dueTaskBuildBase(
  data: Awaited<ReturnType<typeof loadDueTaskSourceData>>,
  tzOffsetMinutes: number,
  today: string
) {
  return {
    ...data,
    toPlant,
    toSchedule,
    tzOffsetMinutes,
    isoToLocalDate,
    today,
  }
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
    const user = await getCurrentUser(env.DB, request)
    if (!user) {
      return Response.json({ error: '未登录' }, { status: 401, headers: CORS })
    }

    try {
    // GET /api/data/plants
    if (path === 'plants' && method === 'GET') {
      const includeArchived = url.searchParams.get('includeArchived') === '1'
      const archivedFilter = includeArchived ? '' : ' AND archived_at IS NULL'
      const { results } = await env.DB
        .prepare(`SELECT * FROM plants WHERE user_id = ?${archivedFilter} ORDER BY created_at DESC`)
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
      return Response.json({ location: row?.location ?? '', timeZone: row?.time_zone ?? '' }, { headers: CORS })
    }

    // PUT /api/data/settings
    if (path === 'settings' && method === 'PUT') {
      const body = (await request.json()) as any
      const location = typeof body.location === 'string' ? body.location : ''
      const timeZone = typeof body.timeZone === 'string' ? body.timeZone : ''
      const now = new Date().toISOString()
      await env.DB
        .prepare(
          'INSERT OR REPLACE INTO user_settings (user_id, location, time_zone, updated_at) VALUES (?, ?, ?, ?)'
        )
        .bind(user.id, location, timeZone, now)
        .run()
      return Response.json({ location, timeZone }, { headers: CORS })
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
      const nextArchivedAt = body.archivedAt !== undefined ? body.archivedAt : current.archived_at
      const nextArchiveReason = body.archiveReason !== undefined ? body.archiveReason : current.archive_reason
      // 默认保留 variety_key：重命名「品种」展示文字不应断开与同品种共享养护模板的匹配。
      // 仅当显式 syncVarietyKey，或当前 key 为空时，才用名称+品种重新计算。
      const curVkey = (current.variety_key ?? '').toString().trim()
      const explicitSync = body.syncVarietyKey === true
      const nextVarietyKey = explicitSync
        ? normalizeVarietyKey(nextName ?? '', nextVariety ?? '')
        : !curVkey
          ? normalizeVarietyKey(nextName ?? '', nextVariety ?? '')
          : curVkey
      await env.DB.prepare(
        'UPDATE plants SET name=?, variety=?, variety_key=?, location=?, planted_at=?, photo_url=?, notes=?, archived_at=?, archive_reason=?, updated_at=? WHERE id=?'
      )
        .bind(
          nextName ?? '',
          nextVariety ?? '',
          nextVarietyKey,
          nextLocation ?? '',
          nextPlantedAt ?? '',
          nextPhotoUrl ?? null,
          nextNotes ?? null,
          nextArchivedAt ?? null,
          nextArchiveReason ?? null,
          now,
          id
        )
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      const row = (results as any[])[0]
      if (!row) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      return Response.json(toPlant(row), { headers: CORS })
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

    // POST /api/data/plants/:id/care-skips
    if (pathParts[0] === 'plants' && pathParts[2] === 'care-skips' && method === 'POST') {
      const plantRows = await env.DB.prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?').bind(id, user.id).all()
      if (!plantRows.results.length) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const body = (await request.json()) as any
      const rid = crypto.randomUUID()
      const now = new Date().toISOString()
      await env.DB.prepare(
        'INSERT INTO care_skips (id, plant_id, task_type, skipped_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(rid, id, body.taskType ?? 'other', body.skippedAt ?? now, body.notes ?? null, now)
        .run()
      const { results } = await env.DB.prepare('SELECT * FROM care_skips WHERE id = ?').bind(rid).all()
      return Response.json(toCareSkip(results[0]), { status: 201, headers: CORS })
    }

    // GET /api/data/plants/:id/schedules
    if (pathParts[0] === 'plants' && pathParts[2] === 'schedules' && method === 'GET') {
      const plantRes = await env.DB
        .prepare('SELECT id, variety_key, name, variety FROM plants WHERE id = ? AND user_id = ?')
        .bind(id, user.id)
        .all()
      const prow = (plantRes.results as any[])[0]
      if (!prow) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      const vkey = resolveVarietyKeyFromPlantRow(prow)
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
      const vkey = resolveVarietyKeyFromPlantRow(prow)
      // 兼容历史数据：若植物 variety_key 为空串，回填为推导值，避免共享计划写入空 key 导致待办无法匹配
      const rawPlantVkey = (prow.variety_key ?? '').toString().trim().toLowerCase()
      if (!rawPlantVkey && vkey) {
        await env.DB.prepare('UPDATE plants SET variety_key = ? WHERE id = ? AND user_id = ?').bind(vkey, id, user.id).run()
      }

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
    if (pathParts[0] === 'tasks' && pathParts[1] === 'due' && pathParts.length === 2 && method === 'GET') {
      const range = (url.searchParams.get('range') || 'today') as 'today' | 'week'
      const today = todayLocal(tzOffsetMinutes)
      const data = await loadDueTaskSourceData(env, user.id)
      const result = buildDueTasks({
        ...dueTaskBuildBase(data, tzOffsetMinutes, today),
        mode: { kind: 'range', range: range === 'week' ? 'week' : 'today' },
      })
      return Response.json(result, { headers: CORS })
    }

    // GET /api/data/tasks/today-count
    if (pathParts[0] === 'tasks' && pathParts[1] === 'today-count' && method === 'GET') {
      const today = todayLocal(tzOffsetMinutes)
      const data = await loadDueTaskSourceData(env, user.id)
      const count = countTodayDueTasks(dueTaskBuildBase(data, tzOffsetMinutes, today))
      return Response.json(count, { headers: CORS })
    }

    // GET /api/data/tasks/due/:date
    if (pathParts[0] === 'tasks' && pathParts[1] === 'due' && pathParts.length === 3 && method === 'GET') {
      const dateStr = pathParts[2]
      const today = todayLocal(tzOffsetMinutes)
      const data = await loadDueTaskSourceData(env, user.id)
      const result = buildDueTasks({
        ...dueTaskBuildBase(data, tzOffsetMinutes, today),
        mode: { kind: 'calendar-date', dateStr },
      })
      return Response.json(result, { headers: CORS })
    }

    // GET /api/data/care-logs/date/:date?tzOffsetMinutes=
    if (pathParts[0] === 'care-logs' && pathParts[1] === 'date' && pathParts.length === 3 && method === 'GET') {
      const dateStr = pathParts[2]
      const { results } = await env.DB
        .prepare(
          'SELECT cl.* FROM care_logs cl JOIN plants p ON cl.plant_id = p.id WHERE p.user_id = ? AND p.archived_at IS NULL ORDER BY cl.done_at DESC'
        )
        .bind(user.id)
        .all()
      const filtered = (results as any[]).filter(
        (row) => isoToLocalDate(row.done_at, tzOffsetMinutes) === dateStr
      )
      return Response.json(filtered.map(toCareLog), { headers: CORS })
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

    // GET /api/data/weather/range?from=YYYY-MM-DD&to=YYYY-MM-DD
    if (path === 'weather/range' && method === 'GET') {
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return Response.json({ error: '请提供有效的 from、to（YYYY-MM-DD）' }, { status: 400, headers: CORS })
      }
      const { results } = await env.DB
        .prepare('SELECT * FROM daily_weather WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date')
        .bind(user.id, from, to)
        .all()
      return Response.json((results as any[]).map(toDailyWeather), { headers: CORS })
    }

    // PUT /api/data/weather/:date
    if (pathParts[0] === 'weather' && pathParts.length === 2 && method === 'PUT') {
      const dateStr = pathParts[1]
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return Response.json({ error: '无效日期' }, { status: 400, headers: CORS })
      }
      let body: Record<string, unknown>
      try {
        body = (await request.json()) as Record<string, unknown>
      } catch {
        return Response.json({ error: '请求体不是合法 JSON' }, { status: 400, headers: CORS })
      }
      let nextMax: number | null | undefined
      let nextMin: number | null | undefined
      let nextP: number | null | undefined
      try {
        nextMax = parseOptionalWeatherNumber(body, 'tempMaxC')
        nextMin = parseOptionalWeatherNumber(body, 'tempMinC')
        nextP = parseOptionalWeatherNumber(body, 'precipitationMm')
      } catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : '参数错误' }, { status: 400, headers: CORS })
      }
      const now = new Date().toISOString()
      const { results: existingRows } = await env.DB
        .prepare('SELECT * FROM daily_weather WHERE user_id = ? AND date = ?')
        .bind(user.id, dateStr)
        .all()
      const cur = (existingRows as any[])[0]
      const mergedMax = nextMax !== undefined ? nextMax : cur != null ? cur.temp_max_c : null
      const mergedMin = nextMin !== undefined ? nextMin : cur != null ? cur.temp_min_c : null
      const mergedP = nextP !== undefined ? nextP : cur != null ? cur.precipitation_mm : null
      const hasAny =
        mergedMax != null ||
        mergedMin != null ||
        mergedP != null
      if (!hasAny) {
        await env.DB.prepare('DELETE FROM daily_weather WHERE user_id = ? AND date = ?').bind(user.id, dateStr).run()
        return Response.json(
          { date: dateStr, tempMaxC: null, tempMinC: null, precipitationMm: null, updatedAt: now },
          { headers: CORS }
        )
      }
      await env.DB
        .prepare(
          'INSERT INTO daily_weather (user_id, date, temp_max_c, temp_min_c, precipitation_mm, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET temp_max_c = excluded.temp_max_c, temp_min_c = excluded.temp_min_c, precipitation_mm = excluded.precipitation_mm, updated_at = excluded.updated_at'
        )
        .bind(user.id, dateStr, mergedMax, mergedMin, mergedP, now)
        .run()
      const { results: after } = await env.DB
        .prepare('SELECT * FROM daily_weather WHERE user_id = ? AND date = ?')
        .bind(user.id, dateStr)
        .all()
      return Response.json(toDailyWeather((after as any[])[0]), { headers: CORS })
    }

    // DELETE /api/data/weather/:date
    if (pathParts[0] === 'weather' && pathParts.length === 2 && method === 'DELETE') {
      const dateStr = pathParts[1]
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return Response.json({ error: '无效日期' }, { status: 400, headers: CORS })
      }
      await env.DB.prepare('DELETE FROM daily_weather WHERE user_id = ? AND date = ?').bind(user.id, dateStr).run()
      return new Response(null, { status: 204, headers: CORS })
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
