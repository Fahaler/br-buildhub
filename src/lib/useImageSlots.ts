"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { imageFromClipboard } from '@/lib/images'

export type ImageSlotState = { file: File | null; preview: string }
type Slots = [ImageSlotState, ImageSlotState]

const fromUrls = (urls: [string, string]): Slots => [
  { file: null, preview: urls[0] },
  { file: null, preview: urls[1] },
]

/**
 * Состояние двух фото заказа + вставка картинки через Ctrl+V в любом месте страницы
 * (в первый свободный слот).
 */
export function useImageSlots(options: { enabled: boolean; onPasteRejected?: () => void }) {
  const [slots, setSlots] = useState<Slots>(fromUrls(['', '']))
  const objectUrls = useRef<string[]>([])
  const slotsRef = useRef(slots)
  const rejectRef = useRef(options.onPasteRejected)

  useEffect(() => { slotsRef.current = slots }, [slots])
  useEffect(() => { rejectRef.current = options.onPasteRejected }, [options.onPasteRejected])

  /** Освобождает память превью, созданных из локальных файлов (blob:…). */
  const revoke = useCallback((url: string) => {
    if (!url.startsWith('blob:')) return
    URL.revokeObjectURL(url)
    objectUrls.current = objectUrls.current.filter((u) => u !== url)
  }, [])

  const setFile = useCallback((index: 0 | 1, file: File) => {
    const url = URL.createObjectURL(file)
    objectUrls.current.push(url)
    revoke(slotsRef.current[index].preview)
    const next = [...slotsRef.current] as Slots
    next[index] = { file, preview: url }
    slotsRef.current = next
    setSlots(next)
  }, [revoke])

  const clear = useCallback((index: 0 | 1) => {
    revoke(slotsRef.current[index].preview)
    const next = [...slotsRef.current] as Slots
    next[index] = { file: null, preview: '' }
    slotsRef.current = next
    setSlots(next)
  }, [revoke])

  const reset = useCallback((urls: [string, string]) => {
    slotsRef.current.forEach((s) => revoke(s.preview))
    const next = fromUrls(urls)
    slotsRef.current = next
    setSlots(next)
  }, [revoke])

  useEffect(() => {
    const urls = objectUrls
    return () => urls.current.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  useEffect(() => {
    if (!options.enabled) return
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFromClipboard(e)
      if (!file) return // обычный текст вставляется как обычно
      e.preventDefault()
      const s = slotsRef.current
      const index = !s[0].preview ? 0 : !s[1].preview ? 1 : null
      if (index === null) {
        rejectRef.current?.()
        return
      }
      setFile(index, file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [options.enabled, setFile])

  return { slots, setFile, clear, reset }
}
