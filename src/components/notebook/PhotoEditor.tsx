"use client"

import { useEffect, useRef, useState } from 'react'
import { MAX_PHOTOS } from '@/lib/orders'
import type { PhotoItem } from '@/lib/saveOrder'

/** Слишком большие исходники даже не пытаемся сжимать в браузере. */
const MAX_SOURCE_BYTES = 40 * 1024 * 1024

let seq = 0
const newKey = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`

export function photosFromUrls(urls: string[]): PhotoItem[] {
  return urls.map((url) => ({ key: newKey(), url, file: null, preview: url }))
}

/** Картинки из буфера обмена (Ctrl+V) — все, а не только первая. */
function filesFromClipboard(e: ClipboardEvent): File[] {
  const items = e.clipboardData?.items
  if (!items) return []
  const files: File[] = []
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
      const f = items[i].getAsFile()
      if (f) files.push(f)
    }
  }
  return files
}

function move<T>(list: T[], from: number, to: number) {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

type Props = {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  onError: (message: string) => void
  disabled?: boolean
}

/**
 * До 8 фото: перетащить файлы, выбрать, вставить Ctrl+V.
 * Порядок меняется перетаскиванием или стрелками; первое фото — обложка в списке.
 */
export default function PhotoEditor({ photos, onChange, onError, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const created = useRef(new Set<string>())
  const dragFrom = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [filesOver, setFilesOver] = useState(false)

  // Актуальные значения для обработчика вставки, подписанного один раз
  const latest = useRef({ photos, onChange, onError, disabled })
  useEffect(() => { latest.current = { photos, onChange, onError, disabled } })

  // Освобождаем превью новых файлов, когда редактор закрывается
  useEffect(() => {
    const urls = created.current
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear() }
  }, [])

  const addFiles = (files: File[]) => {
    const { photos: current, onChange: change, onError: fail, disabled: off } = latest.current
    if (off || files.length === 0) return
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length < files.length) fail('Можно добавлять только картинки')
    const fit = images.filter((f) => {
      if (f.size <= MAX_SOURCE_BYTES) return true
      fail(`«${f.name}» слишком большой файл (больше 40 МБ)`)
      return false
    })
    const free = MAX_PHOTOS - current.length
    if (fit.length > free) fail(free > 0 ? `Влезет ещё ${free} фото из ${fit.length} — максимум ${MAX_PHOTOS}` : `Уже ${MAX_PHOTOS} фото — это максимум`)
    const added = fit.slice(0, Math.max(0, free)).map((file) => {
      const preview = URL.createObjectURL(file)
      created.current.add(preview)
      return { key: newKey(), url: null, file, preview }
    })
    if (added.length) change([...current, ...added])
  }

  // Ctrl+V в любом месте редактора (кроме случаев, когда в буфере только текст)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = filesFromClipboard(e)
      if (files.length === 0) return
      e.preventDefault()
      addFiles(files)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // addFiles читает свежие значения из latest — подписка нужна одна
  }, [])

  const remove = (i: number) => {
    const p = photos[i]
    if (p.file && created.current.has(p.preview)) {
      URL.revokeObjectURL(p.preview)
      created.current.delete(p.preview)
    }
    onChange(photos.filter((_, j) => j !== i))
  }

  const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files')

  return (
    <div
      onDragOver={(e) => {
        if (disabled || !isFileDrag(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setFilesOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFilesOver(false)
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return
        e.preventDefault()
        setFilesOver(false)
        addFiles(Array.from(e.dataTransfer.files))
      }}
      className={`rounded-lg border border-dashed p-3 transition ${filesOver ? 'border-(--amber) bg-(--amber)/5' : 'border-(--line)'}`}
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <p className="cs-label">Фото · {photos.length} / {MAX_PHOTOS}</p>
        {photos.length > 1 && <p className="hidden text-[12px] text-(--muted) sm:block">Перетащите, чтобы поменять порядок. Первое — обложка</p>}
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li
            key={p.key}
            draggable={!disabled}
            onDragStart={(e) => {
              dragFrom.current = i
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', String(i))
            }}
            onDragEnd={() => { dragFrom.current = null; setOver(null) }}
            onDragOver={(e) => {
              if (dragFrom.current === null) return
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              if (over !== i) setOver(i)
            }}
            onDrop={(e) => {
              if (dragFrom.current === null) return
              e.preventDefault()
              e.stopPropagation()
              const from = dragFrom.current
              dragFrom.current = null
              setOver(null)
              if (from !== i) onChange(move(photos, from, i))
            }}
            className={`group relative aspect-[4/3] overflow-hidden rounded-md border-2 bg-(--panel-2) ${
              over === i ? 'border-(--amber)' : 'border-transparent'
            } ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
          >
            <img src={p.preview} alt={`Фото ${i + 1}`} draggable={false} className="h-full w-full object-cover" />
            <span className={`font-mono-ui absolute top-1 left-1 rounded-sm px-1.5 text-[10.5px] leading-[18px] ${i === 0 ? 'bg-(--amber) text-black' : 'bg-black/70 text-(--text)'}`}>
              {i === 0 ? 'обложка' : i + 1}
            </span>
            {p.file && <span className="font-mono-ui absolute top-1 right-8 rounded-sm bg-black/70 px-1.5 text-[10.5px] leading-[18px] text-(--amber)">новое</span>}
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(i)}
              aria-label={`Убрать фото ${i + 1}`}
              className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-sm bg-black/70 text-[15px] leading-none text-(--text) transition hover:bg-(--red) hover:text-black"
            >
              ×
            </button>
            {photos.length > 1 && (
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                <button
                  type="button"
                  disabled={disabled || i === 0}
                  onClick={() => onChange(move(photos, i, i - 1))}
                  aria-label={`Фото ${i + 1} левее`}
                  className="grid h-7 w-7 place-items-center rounded-sm bg-black/70 text-[13px] text-(--text) transition hover:bg-(--amber) hover:text-black disabled:invisible"
                >
                  ←
                </button>
                {i > 0 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(move(photos, i, 0))}
                    className="h-7 rounded-sm bg-black/70 px-2 text-[11.5px] text-(--text) opacity-100 transition hover:bg-(--amber) hover:text-black sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  >
                    в обложку
                  </button>
                )}
                <button
                  type="button"
                  disabled={disabled || i === photos.length - 1}
                  onClick={() => onChange(move(photos, i, i + 1))}
                  aria-label={`Фото ${i + 1} правее`}
                  className="grid h-7 w-7 place-items-center rounded-sm bg-black/70 text-[13px] text-(--text) transition hover:bg-(--amber) hover:text-black disabled:invisible"
                >
                  →
                </button>
              </div>
            )}
          </li>
        ))}

        {photos.length < MAX_PHOTOS && (
          <li className="aspect-[4/3]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-(--line) bg-(--bg) px-2 text-center text-(--muted) transition hover:border-(--amber) hover:text-(--amber)"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-[12.5px]">Добавить фото</span>
              <span className="hidden text-[11px] opacity-70 sm:block">или перетащите / Ctrl+V</span>
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </div>
  )
}
