import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../lib/auth-api'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await requestPasswordReset(email)
      setMessage(res.message)
    } catch (err) {
      setError((err as Error).message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold text-emerald-900 mb-4 text-center">忘记密码</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-3 text-sm text-emerald-700">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1">注册邮箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white rounded py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? '发送中…' : '发送重置链接'}
          </button>
        </form>
        <p className="mt-4 text-xs text-stone-600 text-center">
          <Link to="/login" className="text-emerald-700 hover:underline">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  )
}