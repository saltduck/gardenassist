import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../lib/auth-api'

export function ResetPassword() {
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError('链接无效，请重新申请重置邮件')
      return
    }
    if (newPassword.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (newPassword !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, newPassword)
      navigate('/login', { replace: true, state: { message: '密码已重置，请登录' } })
    } catch (err) {
      setError((err as Error).message || '重置失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold text-emerald-900 mb-4 text-center">设置新密码</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1">新密码</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1">确认新密码</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-emerald-600 text-white rounded py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? '保存中…' : '保存新密码'}
          </button>
        </form>
        <p className="mt-4 text-xs text-stone-600 text-center">
          <Link to="/forgot-password" className="text-emerald-700 hover:underline">
            重新发送链接
          </Link>
        </p>
      </div>
    </div>
  )
}
