import type { SessionD1 } from './session'

export function getClientIp(request: Request): string {
  const cf = request.headers.get('CF-Connecting-IP')?.trim()
  if (cf) return cf
  const xff = request.headers.get('X-Forwarded-For')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return 'unknown'
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number }

/** 固定窗口计数；超限返回 allowed: false */
export async function consumeRateLimit(
  db: SessionD1,
  bucketKey: string,
  maxCount: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowId = String(Math.floor(now / windowMs))
  const key = bucketKey.slice(0, 200)

  await db
    .prepare(
      `INSERT INTO rate_limit_buckets (bucket_key, window_id, count) VALUES (?, ?, 1)
       ON CONFLICT(bucket_key, window_id) DO UPDATE SET count = count + 1`
    )
    .bind(key, windowId)
    .run()

  const { results } = await db
    .prepare('SELECT count FROM rate_limit_buckets WHERE bucket_key = ? AND window_id = ?')
    .bind(key, windowId)
    .all()

  const count = Number((results as { count?: number }[])[0]?.count ?? 0)
  if (count > maxCount) {
    const windowEnd = (Math.floor(now / windowMs) + 1) * windowMs
    const retryAfterSec = Math.max(1, Math.ceil((windowEnd - now) / 1000))
    return { allowed: false, retryAfterSec }
  }
  return { allowed: true }
}
