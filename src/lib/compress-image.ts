const MAX_SIZE_BYTES = 1024 * 1024 // 1MB
const MAX_DIMENSION = 1920
const JPEG_QUALITY_START = 0.88

/**
 * 将图片压缩到不超过 maxSizeBytes，返回新的 File（JPEG）
 */
export function compressImage(file: File, maxSizeBytes = MAX_SIZE_BYTES): Promise<File> {
  if (file.size <= maxSizeBytes) {
    return Promise.resolve(file)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth
      const h = img.naturalHeight
      let width = w
      let height = h
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w >= h) {
          width = MAX_DIMENSION
          height = Math.round((h * MAX_DIMENSION) / w)
        } else {
          height = MAX_DIMENSION
          width = Math.round((w * MAX_DIMENSION) / h)
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法创建画布'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      const baseName = file.name.replace(/\.[^.]+$/i, '') || 'image'
      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('压缩失败'))
              return
            }
            if (blob.size <= maxSizeBytes || quality <= 0.2) {
              const out = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
              resolve(out)
              return
            }
            tryQuality(Math.max(0.2, quality - 0.15))
          },
          'image/jpeg',
          quality
        )
      }
      tryQuality(JPEG_QUALITY_START)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}
