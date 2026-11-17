import { supabase } from '@/lib/supabaseBrowserClient'

const BUCKET = 'order-images'
const MAX_SIDE = 1600
const QUALITY = 0.82
/** Совпадает с лимитом бакета в supabase/002-storage-limits.sql */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Сжимает фото в браузере: максимум 1600 px по большей стороне, WebP (или JPEG,
 * если браузер не умеет WebP). GIF/SVG и всё, что не удалось сжать, — как есть.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file
  }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    let blob = await canvasToBlob(canvas, 'image/webp', QUALITY)
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', QUALITY)
    }
    if (!blob) return file
    // Если «сжатое» вышло тяжелее оригинала и размер не менялся — оставляем оригинал
    if (blob.size >= file.size && scale === 1) return file
    return blob
  } catch {
    return file
  }
}

function extensionFor(type: string) {
  switch (type) {
    case 'image/webp': return 'webp'
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/gif': return 'gif'
    default: return 'img'
  }
}

/** Сжимает и загружает фото, возвращает публичную ссылку. */
export async function uploadOrderImage(file: Blob): Promise<string> {
  const blob = await compressImage(file)
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Фото слишком большое: ${(blob.size / 1024 / 1024).toFixed(1)} МБ (максимум 10 МБ)`)
  }
  const random = Math.random().toString(36).slice(2, 10)
  const path = `${Date.now()}_${random}.${extensionFor(blob.type)}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'application/octet-stream',
    cacheControl: '31536000',
  })
  if (error) throw error

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Достаёт путь файла из публичной ссылки Supabase Storage. */
export function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

/** Удаляет файлы по ссылкам. Ошибки не роняют сценарий — только пишутся в консоль. */
export async function removeOrderImages(urls: (string | null | undefined)[]) {
  const paths = urls.map(pathFromPublicUrl).filter((p): p is string => !!p)
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) console.warn('Не удалось удалить файлы из хранилища:', paths, error)
}

/** Первое изображение из буфера обмена (Ctrl+V), если оно есть. */
export function imageFromClipboard(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items
  if (!items) return null
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile()
      if (file) return file
    }
  }
  return null
}
