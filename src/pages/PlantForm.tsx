import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getPlantById, createPlant, updatePlant } from '../lib/storage-api'
import { identifyPlant } from '../lib/api'

const emptyForm = {
  name: '',
  variety: '',
  location: '',
  plantedAt: new Date().toISOString().slice(0, 10),
  photoUrl: '',
  notes: '',
}

export function PlantForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [identifyLoading, setIdentifyLoading] = useState(false)
  const [identifyError, setIdentifyError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    getPlantById(id).then((plant) => {
      if (plant) {
        setForm({
          name: plant.name,
          variety: plant.variety,
          location: plant.location,
          plantedAt: plant.plantedAt.slice(0, 10),
          photoUrl: plant.photoUrl ?? '',
          notes: plant.notes ?? '',
        })
      }
    })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit && id) {
        await updatePlant(id, {
          ...form,
          plantedAt: new Date(form.plantedAt).toISOString(),
          photoUrl: form.photoUrl || undefined,
          notes: form.notes || undefined,
        })
        navigate(`/plants/${id}`)
      } else {
        const created = await createPlant({
          ...form,
          plantedAt: new Date(form.plantedAt).toISOString(),
          photoUrl: form.photoUrl || undefined,
          notes: form.notes || undefined,
        })
        navigate(`/plants/${created.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link to={isEdit && id ? `/plants/${id}` : '/plants'} className="text-sm text-stone-500 hover:text-stone-700">
          ← 返回
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-4">
        {isEdit ? '编辑植物' : '添加植物'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label htmlFor="name" className="block text-sm font-medium text-stone-700">
              名称 *
            </label>
            <button
              type="button"
              disabled={identifyLoading}
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-emerald-600 hover:underline disabled:opacity-50"
            >
              {identifyLoading ? '识别中…' : '📷 拍照识别'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || file.size > 4 * 1024 * 1024) {
                setIdentifyError(file && file.size > 4 * 1024 * 1024 ? '图片请小于 4MB' : '')
                return
              }
              setIdentifyError(null)
              setIdentifyLoading(true)
              try {
                const res = await identifyPlant(file)
                setForm((f) => ({
                  ...f,
                  name: res.name ?? f.name,
                  variety: res.variety ?? f.variety,
                }))
              } catch (err) {
                setIdentifyError(err instanceof Error ? err.message : '识别失败')
              } finally {
                setIdentifyLoading(false)
                e.target.value = ''
              }
            }}
          />
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label htmlFor="variety" className="block text-sm font-medium text-stone-700 mb-1">
            品种
          </label>
          <input
            id="variety"
            type="text"
            value={form.variety}
            onChange={(e) => setForm((f) => ({ ...f, variety: e.target.value }))}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="如：绿萝、多肉"
          />
          {identifyError && <p className="mt-1 text-sm text-red-600">{identifyError}</p>}
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-stone-700 mb-1">
            位置
          </label>
          <input
            id="location"
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="如：阳台、客厅"
          />
        </div>
        <div>
          <label htmlFor="plantedAt" className="block text-sm font-medium text-stone-700 mb-1">
            种植日期
          </label>
          <input
            id="plantedAt"
            type="date"
            value={form.plantedAt}
            onChange={(e) => setForm((f) => ({ ...f, plantedAt: e.target.value }))}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label htmlFor="photoUrl" className="block text-sm font-medium text-stone-700 mb-1">
            照片 URL
          </label>
          <input
            id="photoUrl"
            type="url"
            value={form.photoUrl}
            onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="https://..."
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-stone-700 mb-1">
            备注
          </label>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="养护习惯、注意事项等"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? '保存中…' : isEdit ? '保存' : '添加'}
          </button>
          <Link
            to={isEdit && id ? `/plants/${id}` : '/plants'}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  )
}
