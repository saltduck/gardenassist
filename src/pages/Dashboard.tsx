import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllPlants, getTodayDueCount, getRecentCareLogs, syncLocalToD1 } from '../lib/storage-api'
import { getLocalSnapshot } from '../lib/storage'
import type { Plant } from '../types/plant'
import { CARE_TASK_TYPES } from '../types/plant'

const KEY_LAST_SYNC_AT = 'gardenassit_last_cloud_sync_at'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function safeMaxIso(a?: string, b?: string): string | undefined {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

function getLastLocalUpdatedAt(): string | undefined {
  const s = getLocalSnapshot()
  let maxIso: string | undefined

  for (const p of s.plants) maxIso = safeMaxIso(maxIso, p.updatedAt || p.createdAt)
  for (const r of s.growthRecords) maxIso = safeMaxIso(maxIso, r.createdAt)
  for (const l of s.careLogs) maxIso = safeMaxIso(maxIso, l.createdAt)
  for (const c of s.careSchedules) maxIso = safeMaxIso(maxIso, c.createdAt)

  return maxIso
}

export function Dashboard() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [todayDue, setTodayDue] = useState(0)
  const [recentLogs, setRecentLogs] = useState<Array<{ log: { id: string; taskType: string; doneAt: string }; plant: Plant | undefined }>>([])
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<string>(() => localStorage.getItem(KEY_LAST_SYNC_AT) || '')
  const hasLocalPlants = getLocalSnapshot().plants.length > 0
  const lastLocalUpdatedAt = getLastLocalUpdatedAt()
  const hasUnsyncedLocalData = hasLocalPlants && (!lastSyncAt || (lastLocalUpdatedAt ? lastLocalUpdatedAt > lastSyncAt : true))

  useEffect(() => {
    getAllPlants().then(setPlants)
    getTodayDueCount().then(setTodayDue)
    getRecentCareLogs(5).then(setRecentLogs)
  }, [])

  const handleSyncToCloud = async () => {
    setSyncStatus('loading')
    setSyncMessage('')
    const result = await syncLocalToD1()
    if (result.success && result.imported) {
      setSyncStatus('ok')
      const now = new Date().toISOString()
      localStorage.setItem(KEY_LAST_SYNC_AT, now)
      setLastSyncAt(now)
      setSyncMessage(
        `已上传：${result.imported.plants} 株植物、${result.imported.growthRecords} 条生长记录、${result.imported.careLogs} 条养护记录、${result.imported.careSchedules} 条养护计划。`
      )
      getAllPlants().then(setPlants)
      getTodayDueCount().then(setTodayDue)
      getRecentCareLogs(5).then(setRecentLogs)
    } else {
      setSyncStatus('err')
      setSyncMessage(result.error || '上传失败')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">仪表盘</h1>
      <p className="text-stone-600 mb-6">概览你的花园</p>

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
          <Link to="/tasks" className="mt-2 inline-block text-sm text-emerald-600 hover:underline">
            去处理 →
          </Link>
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-stone-700 mb-1">快捷操作</h2>
          <Link
            to="/plants/new"
            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            添加植物
          </Link>
        </section>
      </div>

      {hasUnsyncedLocalData && (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-medium text-amber-800 mb-1">上传本地数据到云端</h2>
          <p className="text-sm text-amber-700 mb-3">
            当前浏览器里还有未同步的数据，上传后可在其他电脑/手机上打开同一网址查看。
          </p>
          <button
            type="button"
            disabled={syncStatus === 'loading'}
            onClick={handleSyncToCloud}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {syncStatus === 'loading' ? '上传中…' : '上传到 D1 云端'}
          </button>
          {syncMessage && (
            <p className={`mt-2 text-sm ${syncStatus === 'err' ? 'text-red-600' : 'text-amber-800'}`}>
              {syncMessage}
            </p>
          )}
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {plants.length > 0 && (
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
                    {p.variety && (
                      <span className="ml-2 text-sm text-stone-500">{p.variety}</span>
                    )}
                    {p.location && (
                      <span className="ml-2 text-sm text-stone-400">· {p.location}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="text-lg font-medium text-stone-700 mb-3">最近养护</h2>
          {recentLogs.length === 0 ? (
            <p className="text-stone-500 text-sm rounded-lg border border-stone-200 bg-white p-4">
              暂无养护记录
            </p>
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
                    <span className="ml-2 text-sm text-stone-500">{formatDateTime(log.doneAt)}</span>
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
