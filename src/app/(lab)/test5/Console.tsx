"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { parseCost, type Order } from '@/lib/orders'
import {
  STATUS_KEYS, countByStatus, imagesOf, isDraft, isUrgent, longDate, money, numberMap, pad, preview,
  requestDate, shortDate, statusKey, titleOf, useLabOrders, type StatusKey,
} from '@/lib/lab'
import NoteText from '@/components/lab/NoteText'
import LabSwitcher from '@/components/lab/LabSwitcher'

type Filter = 'active' | StatusKey | 'all'

const ST: Record<StatusKey, { label: string; color: string }> = {
  queue: { label: 'Очередь', color: 'var(--idle)' },
  work: { label: 'В работе', color: 'var(--amber)' },
  done: { label: 'Готово', color: 'var(--green)' },
  cancel: { label: 'Отмена', color: 'var(--red)' },
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Активные' },
  { key: 'work', label: 'В работе' },
  { key: 'queue', label: 'Очередь' },
  { key: 'done', label: 'Готово' },
  { key: 'cancel', label: 'Отмена' },
  { key: 'all', label: 'Все' },
]

const ORDER_OF: Record<StatusKey, number> = { work: 0, queue: 1, done: 2, cancel: 3 }

function Led({ status, size = 8 }: { status: StatusKey; size?: number }) {
  return (
    <span
      aria-hidden
      className={`cs-led ${status === 'work' ? 'on ws-blink' : ''}`}
      style={{ background: ST[status].color, color: ST[status].color, width: size, height: size }}
    />
  )
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

export default function Console({ orders: initial, failed }: { orders: Order[]; failed: boolean }) {
  const { orders, setStatus, add, touched } = useLabOrders(initial)
  const [filter, setFilter] = useState<Filter>('active')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const numbers = useMemo(() => numberMap(orders), [orders])
  const counts = useMemo(() => countByStatus(orders), [orders])
  const backlog = useMemo(
    () => orders.filter((o) => ['queue', 'work'].includes(statusKey(o))).reduce((s, o) => s + (Number(o.cost) || 0), 0),
    [orders],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders
      .filter((o) => {
        const st = statusKey(o)
        const okF = filter === 'all' || (filter === 'active' ? st === 'queue' || st === 'work' : st === filter)
        return okF && (!q || `${o.title ?? ''} ${o.description ?? ''}`.toLowerCase().includes(q))
      })
      .sort((a, b) =>
        ORDER_OF[statusKey(a)] - ORDER_OF[statusKey(b)] ||
        Number(isUrgent(b)) - Number(isUrgent(a)) ||
        (statusKey(a) === 'queue' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)),
      )
  }, [orders, filter, query])

  // Выбранный заказ остаётся открытым, даже если после смены статуса он выпал из фильтра
  const current = creating ? null : (orders.find((o) => o.id === selected) ?? rows[0] ?? null)

  // Горячие клавиши: ↑/↓ (J/K) — выбор, 1–4 — статус, N — новый, / — поиск
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (creating) setCreating(false)
        else if (mobileOpen) setMobileOpen(false)
        else if (isTyping(e.target)) (e.target as HTMLElement).blur()
        return
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const idx = current ? rows.findIndex((o) => o.id === current.id) : -1
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'о') {
        e.preventDefault()
        const next = rows[Math.min(rows.length - 1, idx + 1)]
        if (next) { setSelected(next.id); setCreating(false) }
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'л') {
        e.preventDefault()
        const prev = rows[Math.max(0, idx - 1)]
        if (prev) { setSelected(prev.id); setCreating(false) }
      } else if (['1', '2', '3', '4'].includes(e.key) && current) {
        setStatus(current.id, (['queue', 'work', 'done', 'cancel'] as StatusKey[])[Number(e.key) - 1])
      } else if (e.key === 'n' || e.key === 'т') {
        e.preventDefault()
        setCreating(true)
        setMobileOpen(true)
      } else if (e.key === '/' || e.key === '.') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, current, creating, mobileOpen, setStatus])

  // Выбранная строка всегда видна в списке
  useEffect(() => {
    if (!current) return
    listRef.current?.querySelector(`[data-id="${current.id}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [current])

  const pick = (id: string) => { setSelected(id); setCreating(false); setMobileOpen(true) }

  return (
    <div className="flex h-full flex-col">
      {/* ── Верхняя панель */}
      <header className="flex shrink-0 items-center gap-3 border-b border-(--line) bg-(--panel) px-3 py-2.5 sm:gap-5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="cs-hazard h-7 w-7 rounded-sm ring-1 ring-(--amber)" />
          <div className="leading-none">
            <p className="cs-display text-[16px] font-semibold tracking-wide">BR BuildHub</p>
            <p className="cs-label mt-1 hidden !text-[9.5px] sm:block">пульт заказов</p>
          </div>
        </div>
        <dl className="cs-mono hidden items-center gap-5 text-[12px] text-(--muted) lg:flex">
          <div className="flex items-center gap-2"><Led status="work" /><dt>в работе</dt><dd className="text-(--text)">{counts.work}</dd></div>
          <div className="flex items-center gap-2"><Led status="queue" /><dt>очередь</dt><dd className="text-(--text)">{counts.queue}</dd></div>
          <div className="flex items-center gap-2"><dt>в работе и очереди на</dt><dd className="text-(--amber)">{money(backlog) ?? '0 ₽'}</dd></div>
        </dl>
        <label className="ml-auto flex min-w-0 flex-1 items-center gap-2 rounded-md border border-(--line) bg-(--bg) px-2.5 py-1.5 sm:max-w-72">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-(--muted)" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск" aria-label="Поиск заказов" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-(--muted)" />
          <span className="cs-key hidden sm:inline">/</span>
        </label>
        <button
          onClick={() => { setCreating(true); setMobileOpen(true) }}
          className="flex shrink-0 items-center gap-2 rounded-md bg-(--amber) px-3 py-1.5 text-[14px] font-semibold text-black transition hover:bg-(--text)"
        >
          <span className="text-lg leading-none">+</span><span className="hidden sm:inline">Заказ</span>
          <span className="cs-key hidden !border-black/30 !text-black/60 md:inline">N</span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Фильтры (слева на компьютере) */}
        <nav aria-label="Фильтры" className="hidden w-52 shrink-0 flex-col gap-0.5 border-r border-(--line) bg-(--panel) p-3 md:flex">
          <p className="cs-label px-2 pb-2">Статус</p>
          {FILTERS.map((f) => {
            const n = f.key === 'all' ? orders.length : f.key === 'active' ? counts.queue + counts.work : counts[f.key]
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-[14px] transition ${filter === f.key ? 'bg-(--panel-2) text-(--text)' : 'text-(--muted) hover:text-(--text)'}`}
              >
                {f.key in ST ? <Led status={f.key as StatusKey} /> : <span className="w-2" />}
                <span className="flex-1">{f.label}</span>
                <span className="cs-mono text-[12px]">{n}</span>
              </button>
            )
          })}
          <div className="mt-auto space-y-1.5 border-t border-(--line) px-2 pt-4 text-[12px] text-(--muted)">
            <p className="cs-label pb-1">Клавиши</p>
            <p className="flex justify-between"><span>выбор</span><span><span className="cs-key">↑</span> <span className="cs-key">↓</span></span></p>
            <p className="flex justify-between"><span>статус</span><span className="cs-key">1–4</span></p>
            <p className="flex justify-between"><span>новый</span><span className="cs-key">N</span></p>
            <p className="flex justify-between"><span>поиск</span><span className="cs-key">/</span></p>
          </div>
        </nav>

        {/* ── Список */}
        <section className="flex min-w-0 flex-1 flex-col border-r border-(--line) lg:max-w-[440px] xl:max-w-[500px]">
          <div className="cs-scroll flex shrink-0 gap-1.5 overflow-x-auto border-b border-(--line) px-3 py-2 md:hidden">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 rounded-full border px-3 py-1 text-[13px] ${filter === f.key ? 'border-(--amber) text-(--amber)' : 'border-(--line) text-(--muted)'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="cs-label flex shrink-0 items-center justify-between border-b border-(--line) px-4 py-2">
            <span>{FILTERS.find((f) => f.key === filter)?.label} · {rows.length}</span>
            <span className="cs-mono normal-case tracking-normal">{touched ? 'макет: правки не сохраняются' : ''}</span>
          </div>
          <div ref={listRef} role="listbox" aria-label="Заказы" className="cs-scroll min-h-0 flex-1 overflow-y-auto pb-20">
            {failed && <p className="p-6 text-(--red)">Не удалось загрузить заказы.</p>}
            {rows.map((o) => {
              const st = statusKey(o)
              const sel = current?.id === o.id && !creating
              const img = imagesOf(o)[0]
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
                      <span className="cs-mono text-[11px] text-(--muted)">#{pad(numbers.get(o.id) ?? 0)}</span>
                      <span className="truncate text-[15px] font-semibold">{titleOf(o)}</span>
                      {isDraft(o) && <span className="cs-mono shrink-0 text-[10px] uppercase text-(--amber)">новый</span>}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-(--muted)">{preview(o) || 'без описания'}</p>
                  </div>
                  <div className="cs-mono shrink-0 text-right">
                    <p className="text-[13px]">{money(o.cost) ?? '—'}</p>
                    <p className="text-[11px] text-(--muted)">{shortDate(o.created_at)}</p>
                  </div>
                </button>
              )
            })}
            {rows.length === 0 && !failed && <p className="p-8 text-center text-[14px] text-(--muted)">{query ? 'Ничего не нашлось' : 'Тут пусто'}</p>}
          </div>
        </section>

        {/* ── Карточка заказа / новый заказ */}
        <section
          className={`${mobileOpen ? 'fixed inset-0 z-40 flex' : 'hidden'} min-w-0 flex-1 flex-col bg-(--bg) lg:static lg:z-auto lg:flex`}
          aria-label="Карточка заказа"
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-(--line) px-4 py-2.5 lg:hidden">
            <button onClick={() => { setMobileOpen(false); setCreating(false) }} className="text-[14px] text-(--muted)">← Назад</button>
          </div>
          <div className="cs-scroll min-h-0 flex-1 overflow-y-auto">
            {creating ? (
              <NewOrder
                onCancel={() => { setCreating(false); setMobileOpen(false) }}
                onSave={(d) => { const id = add(d); setFilter((f) => (f === 'active' || f === 'all' || f === 'queue' ? f : 'active')); setSelected(id); setCreating(false) }}
              />
            ) : current ? (
              <Detail key={current.id} order={current} number={numbers.get(current.id) ?? 0} onStatus={(k) => setStatus(current.id, k)} />
            ) : (
              <p className="p-10 text-center text-(--muted)">Выберите заказ слева</p>
            )}
          </div>
        </section>
      </div>

      <LabSwitcher current={5} />
    </div>
  )
}

function Detail({ order, number, onStatus }: { order: Order; number: number; onStatus: (k: StatusKey) => void }) {
  const images = imagesOf(order)
  const [shown, setShown] = useState(0)
  const st = statusKey(order)
  return (
    <article className="cs-slide mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="cs-mono text-[13px] text-(--muted)">#{pad(number)}</span>
        <span className="flex items-center gap-2 rounded-full border border-(--line) px-2.5 py-0.5 text-[12px]" style={{ color: ST[st].color }}>
          <Led status={st} size={7} /> {ST[st].label}
        </span>
        {isUrgent(order) && <span className="cs-mono rounded-sm bg-(--red) px-1.5 text-[11px] font-bold uppercase text-black">срочно</span>}
      </div>
      <h1 className="cs-display mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-[1.05]">{titleOf(order)}</h1>

      <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-lg border border-(--line) bg-(--panel) p-1 sm:grid-cols-4">
        {STATUS_KEYS.map((k, i) => (
          <button
            key={k}
            onClick={() => onStatus(k)}
            aria-pressed={st === k}
            className={`flex items-center justify-center gap-2 rounded-md py-2 text-[13px] transition ${st === k ? 'bg-(--panel-2) text-(--text) ring-1 ring-(--line)' : 'text-(--muted) hover:text-(--text)'}`}
          >
            <Led status={k} size={7} /> {ST[k].label} <span className="cs-key hidden md:inline">{i + 1}</span>
          </button>
        ))}
      </div>

      {images.length > 0 && (
        <div className="mt-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-(--line) bg-(--panel)">
            <img src={images[shown]} alt={titleOf(order)} className="h-full w-full object-cover" />
            {st === 'work' && <div aria-hidden className="cs-hazard absolute inset-x-0 bottom-0 h-1.5" />}
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex gap-2">
              {images.map((src, i) => (
                <button key={i} onClick={() => setShown(i)} aria-label={`Фото ${i + 1}`} className={`h-14 w-24 overflow-hidden rounded-md border-2 transition ${shown === i ? 'border-(--amber)' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <dl className="cs-mono mt-6 grid grid-cols-3 divide-x divide-(--line) rounded-lg border border-(--line) text-[13px]">
        <div className="px-4 py-3"><dt className="cs-label">Цена</dt><dd className="mt-1 text-[16px] text-(--amber)">{money(order.cost) ?? '—'}</dd></div>
        <div className="px-4 py-3"><dt className="cs-label">Заявка</dt><dd className="mt-1">{requestDate(order) ?? '—'}</dd></div>
        <div className="px-4 py-3"><dt className="cs-label">Записан</dt><dd className="mt-1">{longDate(order.created_at)}</dd></div>
      </dl>

      <div className="mt-8">
        <p className="cs-label mb-3">ТЗ / что хотел клиент</p>
        {order.description ? (
          <NoteText text={order.description} className="text-[15px] leading-relaxed text-(--text)/90" linkClassName="text-(--amber) underline underline-offset-4" markerClassName="bg-(--amber)" />
        ) : (
          <p className="text-[15px] text-(--muted)">Пусто. Самое время записать детали.</p>
        )}
      </div>
    </article>
  )
}

function NewOrder({ onSave, onCancel }: { onSave: (d: { title: string; description: string; cost: number | null }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = () => {
    if (!title.trim()) { setError('Укажите название'); ref.current?.focus(); return }
    const c = parseCost(cost)
    if (c !== null && !Number.isFinite(c)) { setError('Цена: например 1500 или 1 500'); return }
    onSave({ title: title.trim(), description: description.trim(), cost: c })
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit() }}
      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
      className="cs-slide mx-auto max-w-3xl space-y-5 px-5 py-6 sm:px-8 sm:py-8"
    >
      <div>
        <p className="cs-label">Новый заказ</p>
        <input ref={ref} value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="Что строим?" aria-label="Название" className="cs-display mt-2 w-full bg-transparent text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold outline-none placeholder:text-(--muted)/50" />
      </div>
      <label className="block">
        <span className="cs-label">ТЗ клиента</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={7} placeholder={'• рабочие двери\n• лимит бриков 2 300\n*От: 12.11.26'} className="cs-field mt-2 resize-y text-[15px] leading-relaxed" />
      </label>
      <label className="block max-w-xs">
        <span className="cs-label">Цена, ₽</span>
        <input value={cost} onChange={(e) => { setCost(e.target.value); setError('') }} inputMode="decimal" placeholder="1 500" className="cs-field cs-mono mt-2" />
      </label>
      {error && <p className="text-[14px] text-(--red)">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" className="rounded-md bg-(--amber) px-5 py-2.5 font-semibold text-black transition hover:bg-(--text)">Добавить в очередь</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-(--line) px-5 py-2.5 text-(--muted) transition hover:text-(--text)">Отмена</button>
        <span className="cs-mono text-[12px] text-(--muted)"><span className="cs-key">Ctrl</span> + <span className="cs-key">Enter</span> — добавить, <span className="cs-key">Esc</span> — отмена</span>
      </div>
    </form>
  )
}
