export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getErrorMessage(err: unknown, fallback = '请求失败'): string {
  return err instanceof Error ? err.message : fallback
}
