"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  PAYMENT, STATUS, STATUS_KEYS, byOrderDay, deadlineInfo, imagesOf, isForSale, isSold, isUrgent, knownNicks, money,
  numberMap, orderDayOf, pad, paymentKey, preview, shortDay, soldDayOf, statusKey, titleOf, type Order, type PaymentKey,
  type StatusKey,
} from '@/lib/orders'
import { checkProgress } from '@/lib/checklist'
import { deleteOrder, errorText, fetchOrders, patchOrder, type OrderValues } from '@/lib/saveOrder'
import { UNSAVED_MESSAGE, useUnsavedChanges } from '@/lib/useUnsavedChanges'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toaster'
import ConfirmDialog from '@/components/ConfirmDialog'
import ClientDialog from './ClientDialog'
import OrderDetail from './OrderDetail'
import OrderEditor from './OrderEditor'
import StatsView from './StatsView'
import { DeadlineBadge, Led, PaymentMark, SaleIcon, useMounted, useToday } from './parts'

type Filter = 'all' | 'active' | StatusKey | 'sale'
type Mode = 'view' | 'new' | 'edit'
export type View = 'orders' | 'stats'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'work', label: 'В работе' },
  { key: 'queue', label: 'Очередь' },
  { key: 'done', label: 'Готово' },
  { key: 'cancel', label: 'Отмена' },
  { key: 'sale', label: 'На продажу' },
]

const GROUP: Record<StatusKey, number> = { work: 0, queue: 1, done: 2, cancel: 3 }

function matchesFilter(o: Order, filter: Filter) {
  if (filter === 'all') return true
  if (filter === 'sale') return isForSale(o)
  const st = statusKey(o)
  return filter === 'active' ? (st === 'queue' || st === 'work') && !isSold(o) : st === filter
}

/** Проданная вещь стоит в списке вместе с готовыми. */
const groupOf = (o: Order) => (isSold(o) ? GROUP.done : GROUP[statusKey(o)])

/**
 * Порядок: сначала «в работе», потом очередь (срочные первыми, дальше — кто раньше заказал),
 * в конце готовые и отменённые (свежие сверху).
 */
function compareOrders(a: Order, b: Order) {
  const ga = groupOf(a)
  const gb = groupOf(b)
  if (ga !== gb) return ga - gb
  if (ga <= GROUP.queue) {
    if (statusKey(a) !== statusKey(b)) return GROUP[statusKey(a)] - GROUP[statusKey(b)]
    return Number(isUrgent(b)) - Number(isUrgent(a)) || byOrderDay(a, b)
  }
  return byOrderDay(b, a)
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)

type Props = { initialOrders: Order[]; loadFailed: boolean; initialId: string | null; initialNew: boolean; initialView: View }

export default function Notebook({ initialOrders, loadFailed, initialId, initialNew, initialView }: Props) {
  const { loading: authLoading, isAdmin, email, signOut } = useAuth()
  const toast = useToast()
  const mounted = useMounted()
  const today = useToday()

  const [orders, setOrders] = useState(initialOrders)
  const [failed, setFailed] = useState(loadFailed)
  const [filter, setFilter] = useState<Filter>(() => {
    const o = initialOrders.find((x) => x.id === initialId)
    return o && !matchesFilter(o, 'active') ? 'all' : 'active'
  })
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(initialId)
  const [modeState, setMode] = useState<Mode>(initialNew ? 'new' : 'view')
  const [view, setView] = useState<View>(initialNew || initialId ? 'orders' : initialView)
  // Гостю нечего делать в редакторе
  const mode: Mode = !authLoading && !isAdmin ? 'view' : modeState
  const [mobileOpen, setMobileOpen] = useState(!!initialId || initialNew)
  const [dirty, setDirty] = useState(false)
  const [toDelete, setToDelete] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [client, setClient] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const dirtyRef = useRef(false)

  useUnsavedChanges(dirty)
  const onDirtyChange = useCallback((d: boolean) => { dirtyRef.current = d; setDirty(d) }, [])
  /** Можно ли бросить открытый редактор (спросит, если есть несохранённое). */
  const canLeave = useCallback(() => !dirtyRef.current || window.confirm(UNSAVED_MESSAGE), [])

  const numbers = useMemo(() => numberMap(orders), [orders])
  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { queue: 0, work: 0, done: 0, cancel: 0 }
    orders.forEach((o) => { c[statusKey(o)]++ })
    return c
  }, [orders])
  const saleCount = useMemo(() => orders.filter(isForSale).length, [orders])
  const nicks = useMemo(() => knownNicks(orders), [orders])
  const backlog = useMemo(
    () => orders.filter((o) => matchesFilter(o, 'active') && !isForSale(o)).reduce((s, o) => s + (Number(o.cost) || 0), 0),
    [orders],
  )
  const late = today
    ? orders.filter((o) => matchesFilter(o, 'active') && deadlineInfo(o.deadline, today)?.tone === 'late').length
    : 0

  const { rows, elsewhere } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const num = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : null
    const found = orders.filter((o) => {
      if (!q) return true
      if (num !== null && numbers.get(o.id) === num) return true
      return `${o.title ?? ''}\n${o.client_nick ?? ''}\n${o.description ?? ''}`.toLowerCase().includes(q)
    })
    const shown = found.filter((o) => matchesFilter(o, filter)).sort(compareOrders)
    return { rows: shown, elsewhere: q ? found.length - shown.length : 0 }
  }, [orders, filter, query, numbers])

  // Выбранный заказ остаётся открытым, даже если после смены статуса он выпал из фильтра
  const current = orders.find((o) => o.id === selected) ?? (mode === 'new' ? null : rows[0] ?? null)
  const editing = mode === 'edit' && current ? current : null

  // Адрес страницы повторяет выбранное: ссылкой на заказ можно поделиться
  useEffect(() => {
    if (!mounted) return
    const url = new URL(window.location.href)
    url.searchParams.delete('id')
    url.searchParams.delete('new')
    url.searchParams.delete('view')
    if (view === 'stats') url.searchParams.set('view', 'stats')
    else if (mode === 'new') url.searchParams.set('new', '1')
    else if (selected && orders.some((o) => o.id === selected)) url.searchParams.set('id', selected)
    const next = url.pathname + url.search
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, '', next)
  }, [mounted, mode, selected, orders, view])

  // Подтягиваем свежие данные, когда возвращаемся на вкладку (друг мог что-то поменять)
  const lastLoad = useRef(0)
  const reload = useCallback(async (manual = false) => {
    if (manual) setReloading(true)
    try {
      const fresh = await fetchOrders()
      setOrders(fresh)
      setFailed(false)
      lastLoad.current = Date.now()
    } catch (e) {
      if (manual) toast(`Не удалось обновить: ${errorText(e)}`, 'error')
    } finally {
      if (manual) setReloading(false)
    }
  }, [toast])
  useEffect(() => {
    lastLoad.current = Date.now()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > 30_000) reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  const replaceOrder = useCallback((saved: Order) => {
    setOrders((list) => (list.some((o) => o.id === saved.id) ? list.map((o) => (o.id === saved.id ? saved : o)) : [saved, ...list]))
  }, [])

  /**
   * Быстрая правка (статус, оплата, предоплата, продажа, чек-лист): сразу на экране, откат при ошибке.
   * Если по заказу ушло несколько правок подряд, ответ на старую не перетирает новую.
   */
  const patchSeq = useRef(new Map<string, number>())
  const quickPatch = useCallback(async (order: Order, values: Partial<OrderValues>, done?: string): Promise<boolean> => {
    const id = order.id
    const n = (patchSeq.current.get(id) ?? 0) + 1
    patchSeq.current.set(id, n)
    const before = Object.fromEntries(Object.keys(values).map((k) => [k, order[k as keyof Order] ?? null])) as Partial<Order>
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...values } : o)))
    try {
      const saved = await patchOrder(id, values)
      if (patchSeq.current.get(id) === n) replaceOrder(saved)
      if (done) toast(done, 'success')
      return true
    } catch (e) {
      if (patchSeq.current.get(id) === n) setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...before } : o)))
      toast(`Не сохранилось: ${errorText(e)}`, 'error')
      return false
    }
  }, [replaceOrder, toast])

  const setStatus = useCallback((order: Order, k: StatusKey) => {
    if (statusKey(order) === k) return
    quickPatch(order, { status: STATUS[k].value }, `#${pad(numbers.get(order.id) ?? 0)} → ${STATUS[k].label}`)
  }, [quickPatch, numbers])
  const setPayment = useCallback((order: Order, k: PaymentKey) => {
    if (paymentKey(order) === k) return
    quickPatch(order, { payment: PAYMENT[k].value }, `#${pad(numbers.get(order.id) ?? 0)}: ${PAYMENT[k].label.toLowerCase()}`)
  }, [quickPatch, numbers])

  const pick = useCallback((id: string) => {
    if (mode !== 'view' && !canLeave()) return
    setSelected(id)
    setMode('view')
    setMobileOpen(true)
  }, [mode, canLeave])

  /** Открыть заказ из статистики или карточки клиента. */
  const openOrder = useCallback((id: string) => {
    if (mode !== 'view' && !canLeave()) return
    const o = orders.find((x) => x.id === id)
    setClient(null)
    setView('orders')
    setSelected(id)
    setMode('view')
    setMobileOpen(true)
    if (o) setFilter((f) => (matchesFilter(o, f) ? f : 'all'))
  }, [mode, canLeave, orders])

  const startNew = useCallback(() => {
    if (!isAdmin) return
    if (mode !== 'view' && !canLeave()) return
    setView('orders')
    setMode('new')
    setMobileOpen(true)
  }, [isAdmin, mode, canLeave])

  const closeEditor = useCallback(() => {
    if (!canLeave()) return
    if (mode === 'new') setMobileOpen(false)
    setMode('view')
  }, [canLeave, mode])

  /** Переключение «Заказы» ↔ «Статистика»; открытый редактор спросит про несохранённое. */
  const openView = useCallback((v: View, f?: Filter) => {
    if (v === 'stats' && mode !== 'view' && !canLeave()) return
    if (v === 'stats') { setMode('view'); setMobileOpen(false) }
    if (f) setFilter(f)
    setView(v)
  }, [mode, canLeave])

  const onSaved = useCallback((saved: Order, created: boolean) => {
    replaceOrder(saved)
    setSelected(saved.id)
    setMode('view')
    setFilter((f) => (matchesFilter(saved, f) ? f : matchesFilter(saved, 'active') ? 'active' : 'all'))
    toast(created ? 'Заказ добавлен' : 'Сохранено', 'success')
  }, [replaceOrder, toast])

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteOrder(toDelete)
      setOrders((list) => list.filter((o) => o.id !== toDelete.id))
      setSelected(null)
      setMobileOpen(false)
      toast('Заказ удалён', 'success')
      setToDelete(null)
    } catch (e) {
      toast(`Не удалось удалить: ${errorText(e)}`, 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Горячие клавиши: ↑/↓ (J/K) — выбор, 1–4 — статус, N — новый, E — правка, / — поиск
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (toDelete || client) return
      if (e.key === 'Escape') {
        if (mode !== 'view') { e.preventDefault(); closeEditor() }
        else if (isTyping(e.target)) (e.target as HTMLElement).blur()
        else if (mobileOpen) setMobileOpen(false)
        return
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey || mode !== 'view') return
      const key = e.key.toLowerCase()
      if (key === 's' || key === 'ы') { e.preventDefault(); openView(view === 'stats' ? 'orders' : 'stats'); return }
      if (view === 'stats' && key !== 'n' && key !== 'т' && key !== '/' && key !== '.') return
      const idx = current ? rows.findIndex((o) => o.id === current.id) : -1
      if (key === 'arrowdown' || key === 'j' || key === 'о') {
        e.preventDefault()
        const next = rows[Math.min(rows.length - 1, idx + 1)]
        if (next) setSelected(next.id)
      } else if (key === 'arrowup' || key === 'k' || key === 'л') {
        e.preventDefault()
        const prev = rows[Math.max(0, idx - 1)]
        if (prev) setSelected(prev.id)
      } else if (['1', '2', '3', '4'].includes(key) && current && isAdmin) {
        setStatus(current, STATUS_KEYS[Number(key) - 1])
      } else if ((key === 'n' || key === 'т') && isAdmin) {
        e.preventDefault()
        startNew()
      } else if ((key === 'e' || key === 'у') && isAdmin && current) {
        e.preventDefault()
        setMode('edit')
        setMobileOpen(true)
      } else if (key === '/' || key === '.') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, current, mode, mobileOpen, isAdmin, toDelete, client, setStatus, startNew, closeEditor, view, openView])

  // Выбранная строка всегда видна в списке
  useEffect(() => {
    if (!current || view !== 'orders') return
    listRef.current?.querySelector(`[data-id="${current.id}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [current, view])

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-[13px] ${on ? 'border-(--amber) text-(--amber)' : 'border-(--line) text-(--muted)'}`
  const mobileTabs = (
    <div className="cs-scroll flex shrink-0 gap-1.5 overflow-x-auto border-b border-(--line) px-3 py-2 md:hidden">
      {FILTERS.map((f) => (
        <button key={f.key} onClick={() => openView('orders', f.key)} aria-pressed={view === 'orders' && filter === f.key} className={chip(view === 'orders' && filter === f.key)}>
          {f.label}
        </button>
      ))}
      <button onClick={() => openView('stats')} aria-pressed={view === 'stats'} className={chip(view === 'stats')}>
        Статистика
      </button>
    </div>
  )

  const showEditor = mode !== 'view' && mounted && !authLoading && isAdmin
  const waitingEditor = mode !== 'view' && (!mounted || authLoading)

  return (
    <div className="flex h-full flex-col">
      {/* ── Верхняя панель */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-(--line) bg-(--panel) px-3 py-2.5 sm:gap-5 sm:px-5">
        <Link href="/" onClick={(e) => { e.preventDefault(); if (mode === 'view' || canLeave()) { setMode('view'); setMobileOpen(false); setFilter('active'); setQuery(''); setView('orders') } }} className="flex shrink-0 items-center gap-2.5">
          <span aria-hidden className="cs-hazard h-7 w-7 rounded-sm ring-1 ring-(--amber)" />
          <span className="hidden leading-none min-[420px]:block">
            <span className="font-display block text-[16px] font-semibold tracking-wide">BR BuildHub</span>
            <span className="cs-label mt-1 hidden !text-[9.5px] sm:block">пульт заказов</span>
          </span>
        </Link>
        <dl className="font-mono-ui hidden items-center gap-5 text-[12px] text-(--muted) xl:flex">
          <div className="flex items-center gap-2"><Led status="work" /><dt>в работе</dt><dd className="text-(--text)">{counts.work}</dd></div>
          <div className="flex items-center gap-2"><Led status="queue" /><dt>очередь</dt><dd className="text-(--text)">{counts.queue}</dd></div>
          {late > 0 && <div className="flex items-center gap-2 text-(--red)"><dt>просрочено</dt><dd>{late}</dd></div>}
          <div className="flex items-center gap-2"><dt>активных на</dt><dd className="text-(--amber)">{money(backlog) ?? '0 ₽'}</dd></div>
        </dl>
        <label className="ml-auto flex min-w-0 flex-1 items-center gap-2 rounded-md border border-(--line) bg-(--bg) px-2.5 py-1.5 sm:max-w-72">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-(--muted)" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setView('orders') }}
            placeholder="Название, ник, ТЗ, №"
            aria-label="Поиск заказов"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-(--muted) [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск" className="text-(--muted) hover:text-(--text)">×</button>
          ) : (
            <span className="cs-key hidden sm:inline">/</span>
          )}
        </label>
        {isAdmin ? (
          <>
            <button onClick={startNew} className="cs-btn flex shrink-0 items-center gap-2 bg-(--amber) px-3 py-1.5 text-[14px] text-black hover:bg-(--text)">
              <span className="text-lg leading-none">+</span><span className="hidden sm:inline">Заказ</span>
              <span className="cs-key hidden !border-black/30 !text-black/60 md:inline">N</span>
            </button>
            <button
              onClick={async () => { if (mode === 'view' || canLeave()) { setMode('view'); await signOut(); toast('Вы вышли', 'info') } }}
              title={email ? `Выйти (${email})` : 'Выйти'}
              aria-label="Выйти"
              className="cs-btn hidden shrink-0 border border-(--line) px-2.5 py-1.5 text-(--muted) hover:text-(--text) sm:block"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>
            </button>
          </>
        ) : !authLoading ? (
          <Link href="/login" className="cs-btn shrink-0 border border-(--line) px-3 py-1.5 text-[14px] font-medium text-(--muted) hover:border-(--amber) hover:text-(--amber)">
            Войти
          </Link>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Фильтры (слева на компьютере) */}
        <nav aria-label="Фильтры" className="hidden w-52 shrink-0 flex-col gap-0.5 border-r border-(--line) bg-(--panel) p-3 md:flex">
          <p className="cs-label px-2 pb-2">Заказы</p>
          {FILTERS.map((f) => {
            const n = f.key === 'all' ? orders.length : f.key === 'active' ? counts.queue + counts.work : f.key === 'sale' ? saleCount : counts[f.key]
            const on = view === 'orders' && filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => openView('orders', f.key)}
                aria-pressed={on}
                className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-[14px] transition ${f.key === 'sale' ? 'mt-2' : ''} ${on ? 'bg-(--panel-2) text-(--text)' : 'text-(--muted) hover:text-(--text)'}`}
              >
                {f.key in STATUS ? (
                  <Led status={f.key as StatusKey} />
                ) : f.key === 'sale' ? (
                  <span className="-mx-0.5 text-(--sale)"><SaleIcon /></span>
                ) : (
                  <span className="w-2" />
                )}
                <span className="flex-1">{f.label}</span>
                <span className="font-mono-ui text-[12px]">{n}</span>
              </button>
            )
          })}
          <p className="cs-label px-2 pt-5 pb-2">Обзор</p>
          <button
            onClick={() => openView('stats')}
            aria-pressed={view === 'stats'}
            className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-[14px] transition ${view === 'stats' ? 'bg-(--panel-2) text-(--text)' : 'text-(--muted) hover:text-(--text)'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="-mx-0.5 text-(--amber)"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
            <span className="flex-1">Статистика</span>
            <span className="cs-key hidden lg:inline">S</span>
          </button>
          <div className="mt-auto space-y-1.5 border-t border-(--line) px-2 pt-4 text-[12px] text-(--muted)">
            <p className="cs-label pb-1">Клавиши</p>
            <p className="flex justify-between"><span>выбор</span><span><span className="cs-key">↑</span> <span className="cs-key">↓</span></span></p>
            <p className="flex justify-between"><span>фото</span><span><span className="cs-key">←</span> <span className="cs-key">→</span></span></p>
            {isAdmin && (
              <>
                <p className="flex justify-between"><span>статус</span><span className="cs-key">1–4</span></p>
                <p className="flex justify-between"><span>изменить</span><span className="cs-key">E</span></p>
                <p className="flex justify-between"><span>новый</span><span className="cs-key">N</span></p>
              </>
            )}
            <p className="flex justify-between"><span>поиск</span><span className="cs-key">/</span></p>
            <p className="flex justify-between"><span>статистика</span><span className="cs-key">S</span></p>
          </div>
        </nav>

        {view === 'stats' && (
          <section aria-label="Статистика" className="flex min-w-0 flex-1 flex-col">
            {mobileTabs}
            <div className="cs-scroll min-h-0 flex-1 overflow-y-auto">
              <StatsView orders={orders} numbers={numbers} onFilter={(k) => openView('orders', k)} onClient={setClient} onPick={openOrder} />
            </div>
          </section>
        )}

        {/* ── Список */}
        <section aria-label="Список заказов" className={`${view === 'stats' ? '!hidden' : ''} flex min-w-0 flex-1 flex-col border-r border-(--line) lg:max-w-[440px] xl:max-w-[500px]`}>
          {mobileTabs}
          <div className="cs-label flex shrink-0 items-center justify-between gap-3 border-b border-(--line) px-4 py-2">
            <span>{FILTERS.find((f) => f.key === filter)?.label} · {rows.length}</span>
            {!authLoading && !isAdmin && <span className="font-mono-ui tracking-normal normal-case">только просмотр</span>}
          </div>
          <div ref={listRef} role="listbox" aria-label="Заказы" className="cs-scroll min-h-0 flex-1 overflow-y-auto pb-16">
            {failed && (
              <div className="m-4 rounded-lg border border-(--red)/50 bg-(--red)/10 p-4 text-[14px]">
                <p className="text-(--red)">Не удалось загрузить заказы.</p>
                <button onClick={() => reload(true)} disabled={reloading} className="cs-btn mt-3 border border-(--line) px-3 py-1.5 text-[13px] text-(--text) hover:border-(--amber)">
                  {reloading ? 'Загружаем…' : 'Повторить'}
                </button>
              </div>
            )}
            {rows.map((o) => {
              const st = statusKey(o)
              const sel = current?.id === o.id && mode !== 'new'
              const img = imagesOf(o)[0]
              const active = st === 'queue' || st === 'work'
              const text = preview(o)
              const sale = isForSale(o)
              const sold = sale && isSold(o)
              const steps = active && !sale ? checkProgress(o.description) : null
              return (
                <button
                  key={o.id}
                  data-id={o.id}
                  role="option"
                  aria-selected={sel}
                  onClick={() => pick(o.id)}
                  className="cs-row flex w-full items-center gap-3 border-b border-(--line) px-4 py-3 text-left transition hover:bg-(--panel)"
                >
                  <Led status={st} />
                  <div className="h-11 w-16 shrink-0 overflow-hidden rounded bg-(--panel-2)">
                    {img && <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-ui shrink-0 text-[11px] text-(--muted)">#{pad(numbers.get(o.id) ?? 0)}</span>
                      <span className="truncate text-[15px] font-semibold">{titleOf(o)}</span>
                      {isUrgent(o) && active && <span className="shrink-0 self-center rounded-sm bg-(--red) px-1.5 text-[10.5px] leading-[17px] font-bold tracking-wide uppercase text-black">срочно</span>}
                      {sale && (
                        <span title={sold ? 'Продано' : 'На продажу'} className={`shrink-0 self-center rounded-sm px-1 text-[10.5px] leading-[15px] ${sold ? 'bg-(--sale) text-black' : 'border border-(--sale)/60 text-(--sale)'}`}>
                          {sold ? 'продано' : 'продажа'}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-(--muted)">
                      {o.client_nick && <span className="font-mono-ui text-(--text)/80">{o.client_nick}</span>}
                      {o.client_nick && text && ' · '}
                      {text || (o.client_nick ? '' : 'без описания')}
                    </p>
                  </div>
                  <div className="font-mono-ui flex shrink-0 flex-col items-end gap-1">
                    <span className="flex items-center gap-1.5 text-[13px]">
                      {sale ? <span className="text-(--sale)" title="На продажу"><SaleIcon size={11} /></span> : <PaymentMark payment={paymentKey(o)} size={11} />}
                      {money(o.cost) ?? '—'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {steps && steps.total > 0 && (
                        <span
                          title={`ТЗ: сделано ${steps.done} из ${steps.total}`}
                          className={`flex items-center gap-1 text-[11px] ${steps.done === steps.total ? 'text-(--green)' : 'text-(--muted)'}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m7.5 12.5 3 3 6-6.5" /></svg>
                          {steps.done}/{steps.total}
                        </span>
                      )}
                      {o.deadline && active && !sold ? (
                        <DeadlineBadge deadline={o.deadline} active today={today} />
                      ) : sold ? (
                        <span className="text-[11px] text-(--sale)" title="Дата продажи">{shortDay(soldDayOf(o))}</span>
                      ) : (
                        <span className="text-[11px] text-(--muted)" title="Дата заказа">{shortDay(orderDayOf(o))}</span>
                      )}
                    </span>
                  </div>
                </button>
              )
            })}
            {elsewhere > 0 && (
              <button onClick={() => setFilter('all')} className="block w-full px-4 py-3 text-left text-[13px] text-(--muted) transition hover:text-(--amber)">
                Ещё {elsewhere} в других статусах — показать все →
              </button>
            )}
            {rows.length === 0 && !failed && elsewhere === 0 && (
              <div className="p-8 text-center text-[14px] text-(--muted)">
                {query ? (
                  <p>Ничего не нашлось по «{query.trim()}»</p>
                ) : orders.length === 0 ? (
                  <p>Пока ни одного заказа.{isAdmin ? ' Нажмите «+ Заказ».' : ''}</p>
                ) : (
                  <p>Здесь пусто</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Карточка заказа / редактор */}
        <section
          className={`${view === 'stats' ? '!hidden' : ''} ${mobileOpen ? 'fixed inset-0 z-40 flex' : 'hidden'} min-w-0 flex-1 flex-col bg-(--bg) lg:static lg:z-auto lg:flex`}
          aria-label={mode === 'view' ? 'Карточка заказа' : 'Редактор заказа'}
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-(--line) px-4 py-2.5 lg:hidden">
            <button onClick={() => (mode === 'view' ? setMobileOpen(false) : closeEditor())} className="text-[14px] text-(--muted)">
              ← {mode === 'view' ? 'К списку' : 'Отмена'}
            </button>
          </div>
          <div className="cs-scroll min-h-0 flex-1 overflow-y-auto">
            {showEditor ? (
              <OrderEditor
                key={mode === 'edit' && editing ? editing.id : 'new'}
                order={mode === 'edit' ? editing : null}
                number={editing ? numbers.get(editing.id) : undefined}
                onSaved={onSaved}
                onCancel={closeEditor}
                onDirtyChange={onDirtyChange}
                nicks={nicks}
              />
            ) : waitingEditor ? (
              <p className="cs-label cs-blink p-10 text-center">Открываем редактор…</p>
            ) : current ? (
              <OrderDetail
                key={current.id}
                order={current}
                number={numbers.get(current.id) ?? 0}
                isAdmin={isAdmin}
                today={today}
                nicks={nicks}
                onStatus={(k) => setStatus(current, k)}
                onPayment={(k) => setPayment(current, k)}
                onPatch={(values, done) => quickPatch(current, values, done)}
                onClient={setClient}
                onEdit={() => { setMode('edit'); setMobileOpen(true) }}
                onDelete={() => setToDelete(current)}
              />
            ) : (
              <p className="p-10 text-center text-(--muted)">{orders.length ? 'Выберите заказ в списке' : 'Заказов пока нет'}</p>
            )}
          </div>
        </section>
      </div>

      {client && (
        <ClientDialog nick={client} orders={orders} numbers={numbers} onPick={openOrder} onClose={() => setClient(null)} />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={`Удалить заказ #${pad(toDelete ? numbers.get(toDelete.id) ?? 0 : 0)}?`}
        text={toDelete ? `«${titleOf(toDelete)}» и все его фото удалятся навсегда.` : undefined}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
