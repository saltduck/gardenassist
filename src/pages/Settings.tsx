import { useMemo, useState } from 'react'
import { getUserSettings, setUserSettings } from '../lib/user-settings'

const PRESETS = [
  '',
  '中国 北京',
  '中国 上海',
  '中国 广州',
  '中国 深圳',
  '中国 杭州',
  '中国 成都',
  '中国 武汉',
  '新加坡',
  '日本 东京',
  '美国 加州湾区',
  '美国 纽约',
  '英国 伦敦',
  '德国 柏林',
  '加拿大 温哥华',
  '澳大利亚 悉尼',
]

export function Settings() {
  const initial = useMemo(() => getUserSettings(), [])
  const [preset, setPreset] = useState('')
  const [location, setLocation] = useState(initial.location)
  const [saved, setSaved] = useState(false)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">设置</h1>
      <p className="text-stone-600 mb-6">设置所在地后，AI 会结合当地季节/气候给出更贴近的养护建议。</p>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm space-y-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">快速选择</label>
          <select
            value={preset}
            onChange={(e) => {
              const v = e.target.value
              setPreset(v)
              if (v) setLocation(v)
            }}
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
          >
            {PRESETS.map((p) => (
              <option key={p || '__empty'} value={p}>
                {p ? p : '— 请选择 —'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">所在地（可自由填写）</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例如：中国 上海 / Singapore / US - Bay Area"
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-stone-500">建议写到城市或地区级别，便于参考季节与气候差异。</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setUserSettings({ location: location.trim() })
              setSaved(true)
              setTimeout(() => setSaved(false), 1200)
            }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            保存
          </button>
          {saved && <span className="text-sm text-emerald-700">已保存</span>}
        </div>
      </section>
    </div>
  )
}

