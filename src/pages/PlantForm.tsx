import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getPlantById, createPlant, updatePlant, getUserSettings } from '../lib/storage-api'
import { identifyPlant } from '../lib/api'
import { uploadPhoto } from '../lib/upload-api'
import { compressImage } from '../lib/compress-image'
import { MarkdownTextarea } from '../components/MarkdownTextarea'

const emptyForm = {
  name: '',
  variety: '',
  location: '',
  suburb: '',
  plantedAt: new Date().toISOString().slice(0, 10),
  photoUrl: '',
  notes: '',
  externalPlantId: '' as string | undefined,
}

export function PlantForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [identifyLoading, setIdentifyLoading] = useState(false)
  const [identifyError, setIdentifyError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [syncVarietyKey, setSyncVarietyKey] = useState(false)
  const [identifyConfidence, setIdentifyConfidence] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) return
    getUserSettings()
      .then((s) => {
        setForm((f) => ({
          ...f,
          suburb: f.suburb || s.suburb || '',
          location: f.location || s.location || '',
        }))
      })
      .catch(() => {
        /* 默认 suburb 非关键，失败时用户可手填 */
      })
  }, [id])

  useEffect(() => {
    if (!id) return
    getPlantById(id).then((plant) => {
      if (plant) {
        setForm({
          name: plant.name,
          variety: plant.variety,
          location: plant.location,
          suburb: plant.suburb ?? '',
          plantedAt: plant.plantedAt.slice(0, 10),
          photoUrl: plant.photoUrl ?? '',
          notes: plant.notes ?? '',
          externalPlantId: plant.externalPlantId,
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
          photoUrl: form.photoUrl,
          notes: form.notes,
          externalPlantId: form.externalPlantId || undefined,
          ...(syncVarietyKey ? { syncVarietyKey: true } : {}),
        })
        navigate(`/plants/${id}`)
      } else {
        const created = await createPlant({
          ...form,
          plantedAt: new Date(form.plantedAt).toISOString(),
          photoUrl: form.photoUrl,
          notes: form.notes,
          externalPlantId: form.externalPlantId || undefined,
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
              if (!file || file.size > 30 * 1024 * 1024) {
                setIdentifyError(file && file.size > 30 * 1024 * 1024 ? '图片请小于 30MB' : '')
                return
              }
              setIdentifyError(null)
              setIdentifyLoading(true)
              try {
                const toSend = file.size > 1024 * 1024 ? await compressImage(file, 1024 * 1024) : file
                const settings = await getUserSettings().catch(() => null)
                const coords =
                  settings?.latitude != null && settings?.longitude != null
                    ? { latitude: settings.latitude, longitude: settings.longitude }
                    : undefined
                const res = await identifyPlant(toSend, coords)
                const up = await uploadPhoto(toSend).then((r) => r.url).catch(() => '')
                setIdentifyConfidence(
                  res.confidence != null ? Math.round(res.confidence * 100) : null
                )
                setForm((f) => ({
                  ...f,
                  name: res.name ?? f.name,
                  variety: res.variety ?? f.variety,
                  photoUrl: up || f.photoUrl,
                  externalPlantId: res.plantId ?? f.externalPlantId,
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
          {isEdit && (
            <p className="mt-1 text-xs text-stone-500">
              修改品种名称不会影响已有养护计划；系统仍按保存时的「品种关联键」匹配同品种共享计划。
            </p>
          )}
          {identifyError && <p className="mt-1 text-sm text-red-600">{identifyError}</p>}
          {identifyConfidence != null && !identifyError && (
            <p className="mt-1 text-sm text-stone-600">
              识别置信度约 {identifyConfidence}%
              {identifyConfidence < 50 ? '，请核对后保存' : ''}
            </p>
          )}
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
          <label htmlFor="suburb" className="block text-sm font-medium text-stone-700 mb-1">
            郊区 / 街区
          </label>
          <input
            id="suburb"
            type="text"
            value={form.suburb}
            onChange={(e) => setForm((f) => ({ ...f, suburb: e.target.value }))}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="可选，如 Paddington"
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
          <div className="flex items-center justify-between gap-2 mb-1">
            <label htmlFor="photoUrl" className="block text-sm font-medium text-stone-700">
              照片
            </label>
            <button
              type="button"
              disabled={uploading}
              onClick={() => photoInputRef.current?.click()}
              className="text-sm text-emerald-600 hover:underline disabled:opacity-50"
            >
              {uploading ? '上传中…' : '📷 上传照片'}
            </button>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploadError(null)
              setUploading(true)
              try {
                const { url } = await uploadPhoto(file)
                setForm((f) => ({ ...f, photoUrl: url }))
              } catch (err) {
                setUploadError(err instanceof Error ? err.message : '上传失败')
              } finally {
                setUploading(false)
                e.target.value = ''
              }
            }}
          />
          <input
            id="photoUrl"
            type="text"
            value={form.photoUrl}
            onChange={(e) => {
              setForm((f) => ({ ...f, photoUrl: e.target.value }))
              setUploadError(null)
            }}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
            placeholder="上传或粘贴图片链接"
          />
          {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-stone-700 mb-1">
            备注
          </label>
          <MarkdownTextarea
            value={form.notes}
            onChange={(next) => setForm((f) => ({ ...f, notes: next }))}
            rows={3}
            placeholder="养护习惯、注意事项等"
            textareaClassName="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        {isEdit && (
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={syncVarietyKey}
              onChange={(e) => setSyncVarietyKey(e.target.checked)}
              className="mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              同步更新养护计划关联键（按当前名称+品种重新计算）。一般不要勾选，除非你明确要改与同品种共享模板的匹配方式。
            </span>
          </label>
        )}
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
