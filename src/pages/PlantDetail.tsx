import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getPlantById,
  deletePlant,
  getGrowthRecordsByPlantId,
  getCareLogsByPlantId,
  getTimelineByPlantId,
  getCareSchedulesByPlantId,
  addGrowthRecord,
  addCareLog,
  addCareSchedule,
  deleteGrowthRecord,
  deleteCareLog,
  deleteCareSchedule,
  updatePlant,
} from '../lib/storage-api'
import { getAdvice, getCarePlan } from '../lib/api'
import type { CarePlanItem } from '../lib/api'
import type { TimelineItem } from '../lib/storage-api'
import { CARE_TASK_TYPES } from '../types/plant'
import type { Plant, GrowthRecord, CareLog, CareSchedule } from '../types/plant'
import type { CareTaskType } from '../types/plant'
import { useEffect, useState } from 'react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PlantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plant, setPlant] = useState<Plant | null>(null)
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([])
  const [careLogs, setCareLogs] = useState<CareLog[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [careSchedules, setCareSchedules] = useState<CareSchedule[]>([])
  const [showGrowthForm, setShowGrowthForm] = useState(false)
  const [showCareForm, setShowCareForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [adviceQuestion, setAdviceQuestion] = useState('')
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [adviceResult, setAdviceResult] = useState<string | null>(null)
  const [adviceError, setAdviceError] = useState<string | null>(null)
  const [carePlanLoading, setCarePlanLoading] = useState(false)
  const [carePlanItems, setCarePlanItems] = useState<CarePlanItem[] | null>(null)
  const [carePlanSelected, setCarePlanSelected] = useState<Set<number>>(new Set())
  const [carePlanError, setCarePlanError] = useState<string | null>(null)

  const refresh = async () => {
    if (!id) return
    const [p, growth, care, tl, sched] = await Promise.all([
      getPlantById(id),
      getGrowthRecordsByPlantId(id),
      getCareLogsByPlantId(id),
      getTimelineByPlantId(id),
      getCareSchedulesByPlantId(id),
    ])
    setPlant(p ?? null)
    setGrowthRecords(growth)
    setCareLogs(care)
    setTimeline(tl)
    setCareSchedules(sched)
  }

  useEffect(() => {
    refresh()
  }, [id])

  const handleDeletePlant = async () => {
    if (!id || !plant) return
    if (!window.confirm(`确定要删除「${plant.name}」吗？相关生长与养护记录也会被删除。`)) return
    const ok = await deletePlant(id)
    if (ok) navigate('/plants')
  }

  if (plant === null && id) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
        <p className="text-stone-500 mb-4">未找到该植物</p>
        <Link to="/plants" className="text-emerald-600 hover:underline">
          返回列表
        </Link>
      </div>
    )
  }

  if (!plant) return null

  const plantedDate = plant.plantedAt
    ? formatDate(plant.plantedAt)
    : '—'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link to="/plants" className="text-sm text-stone-500 hover:text-stone-700">
          ← 返回列表
        </Link>
        <div className="flex gap-2">
          <Link
            to={`/plants/${plant.id}/edit`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            编辑
          </Link>
          <button
            type="button"
            onClick={handleDeletePlant}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            删除
          </button>
        </div>
      </div>

      {/* 档案卡片 */}
      <div className="rounded-lg border border-stone-200 bg-white shadow-sm overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex gap-4 flex-wrap">
            {plant.photoUrl ? (
              <img
                src={plant.photoUrl}
                alt=""
                className="h-32 w-32 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-stone-100 text-5xl text-stone-400">
                🌱
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-stone-800">{plant.name}</h1>
              {plant.variety && (
                <p className="text-stone-600 mt-1">品种：{plant.variety}</p>
              )}
              {plant.location && (
                <p className="text-stone-500 text-sm mt-1">位置：{plant.location}</p>
              )}
              <p className="text-stone-500 text-sm mt-1">种植日期：{plantedDate}</p>
            </div>
          </div>
          {plant.notes && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <h2 className="text-sm font-medium text-stone-600 mb-1">备注</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{plant.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI 助手：养护建议 + 自动养护计划 */}
      <section className="mb-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-stone-800 mb-3">AI 助手</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">获取养护建议</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={adviceQuestion}
                onChange={(e) => setAdviceQuestion(e.target.value)}
                placeholder="例如：叶片发黄怎么办？"
                className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                disabled={adviceLoading}
                onClick={async () => {
                  setAdviceError(null)
                  setAdviceResult(null)
                  setAdviceLoading(true)
                  try {
                    const summary = `名称：${plant.name}，品种：${plant.variety || '未知'}，位置：${plant.location || '未填'}，备注：${plant.notes || '无'}`
                    const res = await getAdvice(summary, adviceQuestion || '请给一些养护建议')
                    setAdviceResult(res.text ?? null)
                  } catch (e) {
                    setAdviceError(e instanceof Error ? e.message : '请求失败')
                  } finally {
                    setAdviceLoading(false)
                  }
                }}
                className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {adviceLoading ? '请求中…' : '发送'}
              </button>
            </div>
            {adviceError && <p className="mt-1 text-sm text-red-600">{adviceError}</p>}
            {adviceResult && (
              <div className="mt-2 rounded border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 whitespace-pre-wrap">
                {adviceResult}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(adviceResult)}
                    className="text-emerald-600 hover:underline"
                  >
                    复制
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await updatePlant(plant.id, { notes: (plant.notes ? plant.notes + '\n\n' : '') + adviceResult })
                      refresh()
                      setAdviceResult(null)
                    }}
                    className="text-emerald-600 hover:underline"
                  >
                    保存到备注
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">自动生成养护计划</label>
            {plant.variety ? (
              <>
                {!carePlanItems ? (
                  <button
                    type="button"
                    disabled={carePlanLoading}
                    onClick={async () => {
                      setCarePlanError(null)
                      setCarePlanItems(null)
                      setCarePlanLoading(true)
                      try {
                        const res = await getCarePlan(plant.variety, plant.location)
                        setCarePlanItems(res.items ?? [])
                        setCarePlanSelected(new Set((res.items ?? []).map((_, i) => i)))
                      } catch (e) {
                        setCarePlanError(e instanceof Error ? e.message : '请求失败')
                      } finally {
                        setCarePlanLoading(false)
                      }
                    }}
                    className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {carePlanLoading ? '生成中…' : '一键生成'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <ul className="space-y-1">
                      {carePlanItems.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={carePlanSelected.has(i)}
                            onChange={(e) => {
                              setCarePlanSelected((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(i)
                                else next.delete(i)
                                return next
                              })
                            }}
                          />
                          <span className="rounded bg-amber-100 px-1.5 py-0.5">
                            {CARE_TASK_TYPES.find((t) => t.value === item.taskType)?.label ?? item.taskType}
                          </span>
                          <span>每 {item.intervalDays} 天</span>
                          {item.note && <span className="text-stone-500">· {item.note}</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const validTypes: CareTaskType[] = ['watering', 'fertilizing', 'pruning', 'repotting', 'pest_control', 'other']
                          for (let i = 0; i < carePlanItems.length; i++) {
                            if (!carePlanSelected.has(i)) continue
                            const item = carePlanItems[i]
                            const taskType = validTypes.includes(item.taskType as CareTaskType) ? (item.taskType as CareTaskType) : 'other'
                            await addCareSchedule({ plantId: plant.id, taskType, intervalDays: item.intervalDays })
                          }
                          setCarePlanItems(null)
                          setCarePlanSelected(new Set())
                          refresh()
                        }}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                      >
                        确认添加
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCarePlanItems(null); setCarePlanSelected(new Set()) }}
                        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
                {carePlanError && <p className="mt-1 text-sm text-red-600">{carePlanError}</p>}
              </>
            ) : (
              <p className="text-stone-500 text-sm">请先填写品种后即可生成养护计划</p>
            )}
          </div>
        </div>
      </section>

      {/* 时间线 */}
      <section className="mb-6">
        <h2 className="text-lg font-medium text-stone-800 mb-3">时间线</h2>
        {timeline.length === 0 ? (
          <p className="text-stone-500 text-sm rounded-lg border border-stone-200 bg-white p-4">
            暂无生长或养护记录，添加后会在这里按时间展示。
          </p>
        ) : (
          <ul className="space-y-2">
            {timeline.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="flex gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm"
              >
                <span className="text-stone-400 shrink-0 w-24">{formatDate(item.date)}</span>
                {item.kind === 'growth' ? (
                  <>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">生长</span>
                    <span>
                      {[
                        item.data.height != null && `${item.data.height} cm`,
                        item.data.leafCount != null && `叶片 ${item.data.leafCount}`,
                        item.data.healthScore != null && `健康 ${item.data.healthScore}/5`,
                        item.data.notes,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '无详情'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">
                      {CARE_TASK_TYPES.find((t) => t.value === item.data.taskType)?.label ?? item.data.taskType}
                    </span>
                    {item.data.notes && <span className="text-stone-600">{item.data.notes}</span>}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 养护计划（周期） */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-stone-800">养护计划</h2>
          <button
            type="button"
            onClick={() => setShowScheduleForm((v) => !v)}
            className="text-sm text-emerald-600 hover:underline"
          >
            {showScheduleForm ? '收起' : '+ 添加周期'}
          </button>
        </div>
        {showScheduleForm && (
          <ScheduleForm
            plantId={plant.id}
            onSuccess={() => {
              refresh()
              setShowScheduleForm(false)
            }}
            onCancel={() => setShowScheduleForm(false)}
          />
        )}
        {careSchedules.length === 0 && !showScheduleForm ? (
          <p className="text-stone-500 text-sm">暂无养护计划，添加后会在「待办任务」中生成到期提醒。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {careSchedules.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white p-3"
              >
                <span className="rounded bg-amber-100 px-2 py-0.5 text-sm text-amber-700">
                  {CARE_TASK_TYPES.find((t) => t.value === s.taskType)?.label ?? s.taskType}
                </span>
                <span className="text-stone-600 text-sm">每 {s.intervalDays} 天</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('删除这条养护计划？')) {
                      await deleteCareSchedule(s.id)
                      refresh()
                    }
                  }}
                  className="text-red-500 text-sm hover:underline shrink-0"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 生长记录 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-stone-800">生长记录</h2>
          <button
            type="button"
            onClick={() => setShowGrowthForm((v) => !v)}
            className="text-sm text-emerald-600 hover:underline"
          >
            {showGrowthForm ? '收起' : '+ 添加生长记录'}
          </button>
        </div>
        {showGrowthForm && (
          <GrowthForm
            plantId={plant.id}
            onSuccess={() => {
              refresh()
              setShowGrowthForm(false)
            }}
            onCancel={() => setShowGrowthForm(false)}
          />
        )}
        {growthRecords.length === 0 && !showGrowthForm ? (
          <p className="text-stone-500 text-sm">暂无生长记录</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {growthRecords.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-stone-200 bg-white p-3"
              >
                <div>
                  <span className="font-medium text-stone-700">{formatDate(r.date)}</span>
                  <div className="text-sm text-stone-500 mt-1">
                    {[
                      r.height != null && `高度 ${r.height} cm`,
                      r.leafCount != null && `叶片 ${r.leafCount}`,
                      r.healthScore != null && `健康度 ${r.healthScore}/5`,
                      r.notes,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('删除这条生长记录？')) {
                      await deleteGrowthRecord(r.id)
                      refresh()
                    }
                  }}
                  className="text-red-500 text-sm hover:underline shrink-0"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 养护记录 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-stone-800">养护记录</h2>
          <button
            type="button"
            onClick={() => setShowCareForm((v) => !v)}
            className="text-sm text-emerald-600 hover:underline"
          >
            {showCareForm ? '收起' : '+ 添加养护记录'}
          </button>
        </div>
        {showCareForm && (
          <CareForm
            plantId={plant.id}
            onSuccess={() => {
              refresh()
              setShowCareForm(false)
            }}
            onCancel={() => setShowCareForm(false)}
          />
        )}
        {careLogs.length === 0 && !showCareForm ? (
          <p className="text-stone-500 text-sm">暂无养护记录</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {careLogs.map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-stone-200 bg-white p-3"
              >
                <div>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-sm text-amber-700">
                    {CARE_TASK_TYPES.find((t) => t.value === log.taskType)?.label ?? log.taskType}
                  </span>
                  <span className="ml-2 text-stone-600 text-sm">{formatDateTime(log.doneAt)}</span>
                  {log.notes && <p className="text-sm text-stone-500 mt-1">{log.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('删除这条养护记录？')) {
                      await deleteCareLog(log.id)
                      refresh()
                    }
                  }}
                  className="text-red-500 text-sm hover:underline shrink-0"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function GrowthForm({
  plantId,
  onSuccess,
  onCancel,
}: {
  plantId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [height, setHeight] = useState('')
  const [leafCount, setLeafCount] = useState('')
  const [healthScore, setHealthScore] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addGrowthRecord({
      plantId,
      date: new Date(date).toISOString().slice(0, 10),
      height: height ? Number(height) : undefined,
      leafCount: leafCount ? Number(leafCount) : undefined,
      healthScore: healthScore ? Number(healthScore) : undefined,
      photoUrl: photoUrl || undefined,
      notes: notes || undefined,
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-3 mb-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">日期</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">高度 (cm)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">叶片数</label>
          <input
            type="number"
            min="0"
            value={leafCount}
            onChange={(e) => setLeafCount(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">健康度 (1-5)</label>
          <select
            value={healthScore}
            onChange={(e) => setHealthScore(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">照片 URL</label>
        <input
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">备注</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
        >
          保存
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100">
          取消
        </button>
      </div>
    </form>
  )
}

function CareForm({
  plantId,
  onSuccess,
  onCancel,
}: {
  plantId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [taskType, setTaskType] = useState<'watering' | 'fertilizing' | 'pruning' | 'repotting' | 'pest_control' | 'other'>('watering')
  const [doneAt, setDoneAt] = useState(new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addCareLog({
      plantId,
      taskType,
      doneAt: new Date(doneAt).toISOString(),
      notes: notes || undefined,
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-3 mb-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">类型</label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as CareLog['taskType'])}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          >
            {CARE_TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">完成时间</label>
          <input
            type="datetime-local"
            value={doneAt}
            onChange={(e) => setDoneAt(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">备注</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
        >
          保存
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100">
          取消
        </button>
      </div>
    </form>
  )
}

function ScheduleForm({
  plantId,
  onSuccess,
  onCancel,
}: {
  plantId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [taskType, setTaskType] = useState<CareSchedule['taskType']>('watering')
  const [intervalDays, setIntervalDays] = useState('7')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const days = Number(intervalDays)
    if (days < 1) return
    await addCareSchedule({ plantId, taskType, intervalDays: days })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-3 mb-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">类型</label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as CareSchedule['taskType'])}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          >
            {CARE_TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">间隔（天）</label>
          <input
            type="number"
            min="1"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
        >
          添加
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100">
          取消
        </button>
      </div>
    </form>
  )
}
