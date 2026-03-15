import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAllPlants } from '../lib/storage'

export function PlantList() {
  const plants = useMemo(() => getAllPlants(), [])
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter.trim()) return plants
    const q = filter.toLowerCase()
    return plants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.variety.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
    )
  }, [plants, filter])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">植物列表</h1>
      <p className="text-stone-600 mb-4">管理花园中的植物</p>

      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          placeholder="按名称、品种、位置筛选…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <Link
          to="/plants/new"
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          添加植物
        </Link>
      </div>

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
            <p>没有匹配「{filter}」的植物</p>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => (
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
                  {p.variety && (
                    <p className="text-sm text-stone-500 truncate">{p.variety}</p>
                  )}
                  {p.location && (
                    <p className="text-xs text-stone-400">{p.location}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
