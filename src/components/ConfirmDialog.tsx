"use client"

import { useEffect } from 'react'

type Props = {
  open: boolean
  title: string
  text?: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, text, confirmLabel = 'Удалить', loading, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 backdrop-blur-[2px] sm:items-center" onClick={() => !loading && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="cs-up w-full max-w-sm overflow-hidden rounded-lg border border-(--line) bg-(--panel) p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="cs-hazard -mx-6 -mt-6 mb-5 block h-1.5 opacity-80" />
        <h2 id="confirm-title" className="font-display text-[20px] font-semibold text-(--text)">{title}</h2>
        {text && <p className="mt-2 text-[14px] leading-relaxed text-(--muted)">{text}</p>}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="cs-btn flex-1 border border-(--line) py-2.5 font-medium text-(--muted) hover:text-(--text)"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            autoFocus
            className="cs-btn flex-1 bg-(--red) py-2.5 text-black hover:bg-(--text)"
          >
            {loading ? 'Удаление…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
