import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllPlants, getTodayDueCount, getRecentCareLogs, getUserSettings } from '../lib/storage-api'
import type { Plant } from '../types/plant'
import { CARE_TASK_TYPES } from '../types/plant'
import { getTimeZoneOffsetMinutes, resolveCalendarTimeZone } from '../lib/calendar-timezone'
import { getErrorMessage } from '../lib/api-error'

function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

export function Dashboard() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [todayDue, setTodayDue] = useState(0)
  const [calendarTz, setCalendarTz] = useState('')
  const [recentLogs, setRecentLogs] = useState<Array<{ log: { id: string; taskType: string; doneAt: string }; plant: Plant | undefined }>>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoadError(null)
        const settings = await getUserSettings()
        const tz = resolveCalendarTimeZone(settings)
        const [plantList, logs, count] = await Promise.all([
          getAllPlants(),
          getRecentCareLogs(5),
          getTodayDueCount(getTimeZoneOffsetMinutes(tz)),
        ])
        if (cancelled) return
        setCalendarTz(tz)
        setPlants(plantList)
        setRecentLogs(logs)
        setTodayDue(count)
      } catch (e) {
        if (!cancelled) setLoadError(getErrorMessage(e, '加载仪表盘失败'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">仪表盘</h1>
      <p className="text-stone-600 mb-6">概览你的花园</p>

      {loadError ? <p className="mb-4 text-sm text-red-600">{loadError}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-stone-700 mb-1">植物总数</h2>
          <p className="text-3xl font-semibold text-emerald-600">{plants.length}</p>
          <Link to="/plants" className="mt-2 inline-block text-sm text-emerald-600 hover:underline">
            查看全部 →
          </Link>
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-stone-700 mb-1">今日待办</h2>
          <p className="text-3xl font-semibold text-amber-600">{todayDue}</p>
          {calendarTz ? <p className="text-xs text-stone-500 mt-1">按时区 {calendarTz}</p> : null}
          <Link to="/tasks" className="mt-2 inline-block text-sm text-emerald-600 hover:underline">
            去处理 →
          </Link>
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-stone-700 mb-1">快捷操作</h2>
          <div className="flex flex-col gap-2">
            <Link
              to="/plants/new"
              className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              添加植物
            </Link>
            <Link
              to="/garden-map"
              className="inline-flex items-center rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              花园平面图
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {plants.length > 0 ? (
          <section>
            <h2 className="text-lg font-medium text-stone-700 mb-3">最近植物</h2>
            <ul className="space-y-2">
              {plants.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/plants/${p.id}`}
                    className="block rounded-lg border border-stone-200 bg-white p-3 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <span className="font-medium text-stone-800">{p.name}</span>
                    {p.variety ? <span className="ml-2 text-sm text-stone-500">{p.variety}</span> : null}
                    {p.location ? <span className="ml-2 text-sm text-stone-400">· {p.location}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section>
          <h2 className="text-lg font-medium text-stone-700 mb-3">最近养护</h2>
          {recentLogs.length === 0 ? (
            <p className="text-stone-500 text-sm rounded-lg border border-stone-200 bg-white p-4">暂无养护记录</p>
          ) : (
            <ul className="space-y-2">
              {recentLogs.map(({ log, plant }) => (
                <li key={log.id}>
                  <Link
                    to={plant ? `/plants/${plant.id}` : '#'}
                    className="block rounded-lg border border-stone-200 bg-white p-3 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <span className="font-medium text-stone-800">{plant?.name ?? '未知植物'}</span>
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      {CARE_TASK_TYPES.find((t) => t.value === log.taskType)?.label ?? log.taskType}
                    </span>
                    <span className="ml-2 text-sm text-stone-500">{formatDateOnly(log.doneAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
