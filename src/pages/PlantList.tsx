import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllPlants } from '../lib/storage-api'
import { getErrorMessage } from '../lib/api-error'
import type { Plant } from '../types/plant'

export function PlantList() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [filter, setFilter] = useState('')
  const [suburbFilter, setSuburbFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [groupMode, setGroupMode] = useState<'location' | 'suburb'>('location')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    getAllPlants(showArchived)
      .then(setPlants)
      .catch((e) => setLoadError(getErrorMessage(e, '加载植物列表失败')))
  }, [showArchived])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const suburbQ = suburbFilter.trim().toLowerCase()
    return plants.filter((p) => {
      if (suburbQ && !(p.suburb ?? '').toLowerCase().includes(suburbQ)) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.variety.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.suburb ?? '').toLowerCase().includes(q)
      )
    })
  }, [plants, filter, suburbFilter])

  const grouped = useMemo(() => {
    const m = new Map<string, Plant[]>()
    const unset = groupMode === 'suburb' ? '未设置 suburb' : '未设置位置'
    for (const p of filtered) {
      const key =
        groupMode === 'suburb'
          ? (p.suburb ?? '').trim() || unset
          : p.location.trim() || unset
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(p)
    }
    return [...m.entries()].sort(([a], [b]) => {
      if (a === unset) return 1
      if (b === unset) return -1
      return a.localeCompare(b, 'zh-CN')
    })
  }, [filtered, groupMode])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">植物列表</h1>
      <p className="text-stone-600 mb-4">管理花园中的植物</p>

      {loadError && <p className="mb-3 text-sm text-red-600">{loadError}</p>}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="按名称、品种、位置筛选…"
          autoComplete="off"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          type="text"
          placeholder="按 suburb 筛选…"
          value={suburbFilter}
          onChange={(e) => setSuburbFilter(e.target.value)}
          className="sm:w-40 rounded-md border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <Link
          to="/garden-map"
          className="inline-flex items-center justify-center rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          花园平面图
        </Link>
        <Link
          to="/plants/new"
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          添加植物
        </Link>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-stone-600">
        <span>分组：</span>
        <label className="inline-flex items-center gap-1">
          <input
            type="radio"
            name="groupMode"
            checked={groupMode === 'location'}
            onChange={() => setGroupMode('location')}
          />
          按位置
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="radio"
            name="groupMode"
            checked={groupMode === 'suburb'}
            onChange={() => setGroupMode('suburb')}
          />
          按 suburb
        </label>
      </div>
      <label className="mb-3 inline-flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        显示已归档植物（死亡/迁走）
      </label>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-500">
          {plants.length === 0 ? (
            <>
              <p className="mb-4">还没有植物记录</p>
              <Link
                to="/plants/new"
                className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                添加第一株植物
              </Link>
            </>
          ) : (
            <p>没有匹配筛选条件的植物</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([groupLabel, items]) => (
            <section key={groupLabel}>
              <h2 className="mb-2 text-sm font-medium text-stone-600">
                {groupLabel}
                <span className="ml-2 text-xs text-stone-400">({items.length})</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/plants/${p.id}`}
                      className="flex gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50"
                    >
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-stone-100 text-2xl text-stone-400">
                          🌱
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-stone-800">{p.name}</span>
                        {p.archivedAt && (
                          <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 text-xs text-stone-700">已归档</span>
                        )}
                        {p.variety && (
                          <p className="text-sm text-stone-500 truncate">{p.variety}</p>
                        )}
                        {(p.location || p.suburb) && (
                          <p className="text-xs text-stone-400">
                            {[p.location, p.suburb].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
