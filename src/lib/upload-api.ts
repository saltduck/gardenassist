import { compressImage } from './compress-image'

const COMPRESS_TARGET_BYTES = 1024 * 1024 // 超过 1MB 时压缩到此大小再上传
const MAX_INPUT_BYTES = 30 * 1024 * 1024 // 原始文件最大 30MB，过大会先压缩再上传
const SERVER_MAX_BYTES = 5 * 1024 * 1024 // 服务端限制 5MB

/**
 * 上传图片到 R2，返回可访问的 URL（相对路径，同源）
 * 超过 1MB 时先在前端压缩再上传；原始文件最大 30MB
 */
export async function uploadPhoto(file: File): Promise<{ url: string }> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('图片请小于 30MB')
  }
  let toUpload: File = file
  if (file.size > COMPRESS_TARGET_BYTES) {
    toUpload = await compressImage(file, COMPRESS_TARGET_BYTES)
  }
  if (toUpload.size > SERVER_MAX_BYTES) {
    throw new Error('压缩后仍超过 5MB，请换一张更小的图')
  }
  const form = new FormData()
  form.append('file', toUpload)
  const r = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const data = await r.json().catch(() => ({})) as { url?: string; error?: string }
  if (!r.ok) throw new Error(data.error || r.statusText)
  if (!data.url) throw new Error('上传返回无 URL')
  return { url: data.url }
}
