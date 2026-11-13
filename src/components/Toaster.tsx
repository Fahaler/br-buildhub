"use client"

import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; type: ToastType; message: string }
type ToastFn = (message: string, type?: ToastType) => void

const ToastContext = createContext<ToastFn>(() => {})

const styles: Record<ToastType, string> = {
  success: 'border-(--green)/50 text-(--text) [--dot:var(--green)]',
  error: 'border-(--red)/60 text-(--text) [--dot:var(--red)]',
  info: 'border-(--line) text-(--text) [--dot:var(--idle)]',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback<ToastFn>((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((list) => [...list, { id, type, message }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), type === 'error' ? 6000 : 3500)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`cs-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-(--panel)/95 px-4 py-3 text-[14px] shadow-xl backdrop-blur ${styles[t.type]}`}
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
          >
            <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-(--dot)" />
            <span className="min-w-0 break-words">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
