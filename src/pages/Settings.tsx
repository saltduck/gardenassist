import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getUserSettings, setUserSettings } from '../lib/user-settings'
import { changePassword } from '../lib/auth-api'

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
  const [preset, setPreset] = useState('')
  const [location, setLocation] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    getUserSettings()
      .then((s) => { if (mounted) setLocation(s.location || '') })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : '加载失败') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">设置</h1>
      <p className="text-stone-600 mb-6">设置所在地后，AI 会结合当地季节/气候给出更贴近的养护建议。</p>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm space-y-3">
        {loading && <p className="text-sm text-stone-500">加载中…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
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
            disabled={loading}
            onClick={async () => {
              try {
                setError(null)
                await setUserSettings({ location: location.trim() })
                setSaved(true)
                setTimeout(() => setSaved(false), 1200)
              } catch (e) {
                setError(e instanceof Error ? e.message : '保存失败')
              }
            }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            保存
          </button>
          {saved && <span className="text-sm text-emerald-700">已保存</span>}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-stone-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-medium text-stone-800">修改密码</h2>
        <PasswordForm />
      </section>
    </div>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' })
      return
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少 6 位' })
      return
    }
    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setMessage({ type: 'success', text: '密码已修改，请使用新密码登录' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message || '修改失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">当前密码</label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">新密码</label>
        <input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">再次输入新密码</label>
        <input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-stone-700 px-4 py-2 text-sm font-medium text-white hover:bg-stone-600 disabled:opacity-60"
      >
        {loading ? '提交中…' : '修改密码'}
      </button>
    </form>
  )
}

