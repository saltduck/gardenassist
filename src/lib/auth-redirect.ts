/** 登录/注册成功后安全回跳（AUTH-04） */
export function resolvePostAuthPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return '/'
  const from = (state as { from?: { pathname?: string; search?: string; hash?: string } }).from
  const pathname = from?.pathname
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) return '/'
  if (pathname === '/login' || pathname === '/register') return '/'
  return `${pathname}${from?.search ?? ''}${from?.hash ?? ''}`
}
