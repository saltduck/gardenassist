import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getAllPlants,
  getGardenMap,
  saveGardenMap,
  updatePlantMapPosition,
} from '../lib/storage-api'
import type { Plant } from '../types/plant'
import { getErrorMessage } from '../lib/api-error'

const MIN_SCALE = 0.5
const MAX_SCALE = 3

export function GardenMap() {
  const navigate = useNavigate()
  const [mapMeta, setMapMeta] = useState<{ imageUrl: string; name: string; id: string } | null>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [placePlantId, setPlacePlantId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const markerDragId = useRef<string | null>(null)

  const reload = useCallback(async () => {
    setLoadError(null)
    try {
      const [m, ps] = await Promise.all([getGardenMap(), getAllPlants()])
      setMapMeta(m ? { imageUrl: m.imageUrl, name: m.name, id: m.id } : null)
      setPlants(ps.filter((p) => !p.archivedAt))
    } catch (e) {
      setLoadError(getErrorMessage(e, '加载花园地图失败'))
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleUpload(file: File) {
    setUploading(true)
    setLoadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('kind', 'garden-map')
      const r = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form })
      const data = (await r.json()) as { url?: string; error?: string }
      if (!r.ok || !data.url) throw new Error(data.error || '上传失败')
      const saved = await saveGardenMap({ imageUrl: data.url, name: '我的花园' })
      setMapMeta({ imageUrl: saved.imageUrl, name: saved.name, id: saved.id })
    } catch (e) {
      setLoadError(getErrorMessage(e, '上传平面图失败'))
    } finally {
      setUploading(false)
    }
  }

  function clientToMapNorm(clientX: number, clientY: number): { mapX: number; mapY: number } | null {
    if (!imgRef.current) return null
    const rect = imgRef.current.getBoundingClientRect()
    return {
      mapX: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      mapY: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    }
  }

  async function savePosition(plantId: string, clientX: number, clientY: number) {
    if (!mapMeta) return
    const norm = clientToMapNorm(clientX, clientY)
    if (!norm) return
    const updated = await updatePlantMapPosition(plantId, norm.mapX, norm.mapY, mapMeta.id)
    setPlants((prev) => prev.map((p) => (p.id === plantId ? updated : p)))
  }

  async function placePlant(plantId: string, clientX: number, clientY: number) {
    await savePosition(plantId, clientX, clientY)
    setPlacePlantId(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">花园平面图</h1>
      <p className="text-stone-600 mb-4 text-sm">
        滚轮缩放、拖拽平移查看。选植物后点击落点；已标注标签拖拽松手可更新位置，双击进入详情。
      </p>
      {loadError && <p className="mb-3 text-sm text-red-600">{loadError}</p>}

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <label className="inline-flex cursor-pointer items-center rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">
          {uploading ? '上传中…' : '上传平面图'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUpload(f)
              e.target.value = ''
            }}
          />
        </label>
        {placePlantId && (
          <span className="text-sm text-amber-800">
            放置模式：{plants.find((p) => p.id === placePlantId)?.name}
            <button type="button" className="ml-2 underline" onClick={() => setPlacePlantId(null)}>
              取消
            </button>
          </span>
        )}
        {!placePlantId && mapMeta && (
          <span className="text-xs text-stone-500">只读：拖拽平移、滚轮缩放；选植物后进入放置模式</span>
        )}
      </div>

      {!mapMeta ? (
        <p className="text-stone-500 text-sm">尚未上传平面图。</p>
      ) : (
        <div
          className="relative max-w-full h-[min(70vh,520px)] border border-stone-200 rounded-lg overflow-hidden bg-stone-200 touch-none"
          style={{ cursor: placePlantId ? 'crosshair' : panning ? 'grabbing' : 'grab' }}
          onWheel={(e) => {
            e.preventDefault()
            setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s - e.deltaY * 0.001)))
          }}
          onPointerDown={(e) => {
            if (placePlantId || markerDragId.current) return
            if (e.button !== 0) return
            setPanning(true)
            panRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (!panRef.current) return
            const { x, y, ox, oy } = panRef.current
            setOffset({ x: ox + e.clientX - x, y: oy + e.clientY - y })
          }}
          onPointerUp={(e) => {
            if (!panRef.current) return
            panRef.current = null
            setPanning(false)
            ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
          }}
          onPointerCancel={(e) => {
            panRef.current = null
            setPanning(false)
            ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
          }}
        >
          <div
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
            }}
          >
            <div
              ref={imgRef}
              className="relative inline-block min-w-[280px]"
              onClick={(e) => {
                if (placePlantId) void placePlant(placePlantId, e.clientX, e.clientY)
              }}
            >
              <img
                src={mapMeta.imageUrl}
                alt="花园平面图"
                className="max-w-none w-[640px] block select-none"
                draggable={false}
              />
              {plants
                .filter((p) => p.mapX != null && p.mapY != null)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600 text-white text-xs px-2 py-0.5 shadow cursor-move z-10"
                    style={{ left: `${(p.mapX ?? 0) * 100}%`, top: `${(p.mapY ?? 0) * 100}%` }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      markerDragId.current = p.id
                      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                    }}
                    onPointerUp={(e) => {
                      if (markerDragId.current !== p.id) return
                      markerDragId.current = null
                      void savePosition(p.id, e.clientX, e.clientY)
                      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      navigate(`/plants/${p.id}`)
                    }}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <ul className="mt-6 space-y-2 max-w-md">
        <li className="text-sm font-medium text-stone-700">植物列表（选后落点，或进详情）：</li>
        {plants.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlacePlantId(p.id)}
              className={`text-sm px-2 py-1 rounded border ${
                placePlantId === p.id ? 'border-emerald-600 bg-emerald-50' : 'border-stone-200'
              }`}
            >
              {p.name}
              {p.mapX != null ? ` (${Math.round((p.mapX ?? 0) * 100)}%, ${Math.round((p.mapY ?? 0) * 100)}%)` : ''}
            </button>
            <Link to={`/plants/${p.id}`} className="text-xs text-emerald-600 hover:underline">
              详情
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
