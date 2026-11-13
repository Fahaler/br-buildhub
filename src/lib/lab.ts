"use client"

// Общие помощники для макетов /test3, /test4, /test5.
// Только чтение: никаких изменений в базе отсюда не делается.

import { useCallback, useEffect, useState } from 'react'
import { getPriority, getStatus, type Order } from '@/lib/orders'

export type StatusKey = 'queue' | 'work' | 'done' | 'cancel'

export const STATUS_KEYS: StatusKey[] = ['queue', 'work', 'done', 'cancel']

const KEY_BY_VALUE: Record<string, StatusKey> = {
  'в очереди': 'queue',
  'в процессе': 'work',
  'готов': 'done',
  'отмена': 'cancel',
}

export const VALUE_BY_KEY: Record<StatusKey, string> = { queue: 'в очереди', work: 'в процессе', done: 'готов', cancel: 'отмена' }

export function statusKey(o: Order): StatusKey {
  return KEY_BY_VALUE[getStatus(o.status)?.value ?? ''] ?? 'queue'
}

export function isUrgent(o: Order) {
  return getPriority(o.priority)?.value === 'высокий'
}

export function countByStatus(orders: Order[]) {
  const c: Record<StatusKey, number> = { queue: 0, work: 0, done: 0, cancel: 0 }
  for (const o of orders) c[statusKey(o)]++
  return c
}

/** Порядковый номер заказа: самый старый — №1. */
export function numberMap(orders: Order[]) {
  const sorted = [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  return new Map(sorted.map((o, i) => [o.id, i + 1]))
}

export const pad = (n: number, len = 3) => String(n).padStart(len, '0')

export function imagesOf(o: Order) {
  return [o.image_url, o.image_url_2].filter((u): u is string => !!u)
}

export function titleOf(o: Order) {
  return o.title?.trim() || 'Без названия'
}

const REQUEST_DATE = /\*?\s*от:?\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})/i

/** Дата заявки из описания («*От: 05.11.26»), если она там есть. */
export function requestDate(o: Order): string | null {
  const m = o.description?.match(REQUEST_DATE)
  if (!m) return null
  const year = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}.${year}`
}

/** Короткий текст для карточки: без служебных строк, ссылок и пустых заголовков. */
export function preview(o: Order): string {
  return (o.description ?? '')
    .split('\n')
    .map((l) => l.trim().replace(/^(?:[•\-–—]|\*(?!\s*от))\s*/i, ''))
    .filter((l) => l && !REQUEST_DATE.test(l) && !/^https?:\/\//.test(l) && !/^(тз|пожелание)[^:]*:$/i.test(l))
    .join(' · ')
}

export function money(cost: number | null | undefined) {
  if (cost === null || cost === undefined || !Number.isFinite(Number(cost))) return null
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(cost))} ₽`
}

export function shortDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function longDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Окно поверх страницы: закрытие по Esc и запрет прокрутки фона. */
export function useModal(open: boolean, onClose: () => void, onKey?: (e: KeyboardEvent) => void) {
  useEffect(() => {
    if (!open) return
    const scroller = document.querySelector<HTMLElement>('.lab-root')
    const prev = scroller?.style.overflow ?? ''
    if (scroller) scroller.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else onKey?.(e)
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (scroller) scroller.style.overflow = prev
    }
  }, [open, onClose, onKey])
}

/**
 * Заказы макета + локальные правки (новый заказ, смена статуса).
 * Ничего не уходит в базу — после перезагрузки страницы всё как было.
 */
export function useLabOrders(initial: Order[]) {
  const [orders, setOrders] = useState(initial)
  const [touched, setTouched] = useState(false)

  const setStatus = useCallback((id: string, key: StatusKey) => {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: VALUE_BY_KEY[key] } : o)))
    setTouched(true)
  }, [])

  const add = useCallback((draft: { title: string; description: string; cost: number | null }) => {
    const order: Order = {
      id: `draft-${Date.now()}`,
      title: draft.title,
      description: draft.description || null,
      cost: draft.cost,
      status: VALUE_BY_KEY.queue,
      priority: 'обычный',
      image_url: null,
      image_url_2: null,
      created_at: new Date().toISOString(),
    }
    setOrders((os) => [order, ...os])
    setTouched(true)
    return order.id
  }, [])

  return { orders, setStatus, add, touched }
}

export const isDraft = (o: Order) => o.id.startsWith('draft-')
