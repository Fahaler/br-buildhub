"use client"

import { useEffect, useRef } from 'react'

export const UNSAVED_MESSAGE = 'Есть несохранённые изменения. Уйти со страницы и потерять их?'

/**
 * Предупреждает о несохранённых изменениях:
 * — при закрытии/перезагрузке вкладки (стандартный диалог браузера);
 * — при клике по внутренним ссылкам (next/link) — через confirm().
 * Кнопку «Назад» браузера не перехватываем: в App Router это ломает историю переходов.
 */
export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty)
  useEffect(() => { dirtyRef.current = dirty }, [dirty])

  useEffect(() => {
    if (!dirty) return

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    // Перехват кликов по ссылкам в фазе захвата — раньше, чем сработает next/link.
    // next/link не выполняет переход, если событие уже отменено (defaultPrevented).
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return // открытие в новой вкладке
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin) return
      if (url.pathname === location.pathname && url.search === location.search) return
      if (!window.confirm(UNSAVED_MESSAGE)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
      }
  }, [dirty])
}
