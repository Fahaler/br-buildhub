"use client"

import { useCallback, useMemo, useRef, useState } from 'react'
import { parseCost, type Order } from '@/lib/orders'
import {
  countByStatus, imagesOf, isDraft, isUrgent, longDate, money, numberMap, pad, preview, requestDate,
  statusKey, titleOf, useLabOrders, useModal, type StatusKey,
} from '@/lib/lab'
import NoteText from '@/components/lab/NoteText'
import LabSwitcher from '@/components/lab/LabSwitcher'

const COLS: { key: StatusKey; title: string; hint: string }[] = [
  { key: 'queue', title: 'Очередь', hint: 'ждут, пока освободимся' },
  { key: 'work', title: 'В цеху', hint: 'строим прямо сейчас' },
  { key: 'done', title: 'Сдано', hint: 'отдали клиенту' },
]

const STATUS_LABEL: Record<StatusKey, string> = { queue: 'Очередь', work: 'В цеху', done: 'Сдано', cancel: 'Отмена' }

/** Небольшой случайный, но стабильный наклон бирки — висят «как попало». */
function tilt(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 7) - 3) * 0.45
}

function Tag({ order, number, onOpen }: { order: Order; number: number; onOpen: () => void }) {
  const st = statusKey(order)
  const img = imagesOf(order)[0]
  const text = preview(order)
  const price = money(order.cost)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`tg-tag ${isDraft(order) ? 'is-draft tg-pop' : ''}`}
      style={{ transform: `rotate(${tilt(order.id)}deg)` }}
    >
      {st === 'work' && <span aria-hidden className="tg-hazard absolute inset-x-0 top-0 h-[6px]" />}
      <div className="flex items-center justify-between gap-2">
        <span className="tg-mono text-[11px] font-medium text-(--ink-2)">№ {pad(number)}</span>
        {isUrgent(order) && <span className="tg-mono rounded-sm bg-(--orange) px-1.5 text-[10px] font-bold uppercase text-black">срочно</span>}
        {isDraft(order) && <span className="tg-mono text-[10px] font-bold uppercase text-(--orange)">новая</span>}
      </div>
      <h3 className="tg-display mt-1 text-[19px] leading-[1.1]">{titleOf(order)}</h3>
      {img && (
        <div className="mt-3 aspect-[16/9] overflow-hidden rounded-[3px] bg-(--tag-2) ring-1 ring-black/10">
          <img src={img} alt="" loading="lazy" className="h-full w-full object-cover sepia-[.15]" />
        </div>
      )}
      {text && <p className="mt-3 line-clamp-3 text-[13px] leading-snug text-(--ink)/80">{text}</p>}
      <div className="mt-3 flex items-end justify-between gap-2 border-t border-dashed border-(--ink)/25 pt-2.5">
        <span className="tg-mono text-[15px] font-semibold">{price ?? 'цена ?'}</span>
        {st === 'done' ? (
          <span className="tg-stamp text-[12px]">СДАНО</span>
        ) : (
          <span className="tg-mono text-[11px] text-(--ink-2)">{requestDate(order) ?? longDate(order.created_at)}</span>
        )}
      </div>
    </button>
  )
}

/** Быстрая запись, как в Google Keep: одна строка, раскрывается по клику. */
function QuickAdd({ onAdd }: { onAdd: (d: { title: string; description: string; cost: number | null }) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  const reset = () => { setTitle(''); setDescription(''); setCost(''); setError(''); setOpen(false) }
  const submit = () => {
    if (!title.trim()) { setError('Нужно хотя бы название'); titleRef.current?.focus(); return }
    const c = parseCost(cost)
    if (c !== null && !Number.isFinite(c)) { setError('Цена: например 1500 или 1 500'); return }
    onAdd({ title: title.trim(), description: description.trim(), cost: c })
    reset()
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit() }}
      onKeyDown={(e) => { if (e.key === 'Escape') reset(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
      className="tg-plate mx-auto w-full max-w-2xl rounded-xl"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-(--orange) text-xl font-bold leading-none text-black">+</span>
        <input
          ref={titleRef}
          value={title}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setTitle(e.target.value); setError('') }}
          placeholder="Записать заказ… (что строим?)"
          aria-label="Название постройки"
          className="tg-input tg-display text-[17px]"
        />
      </div>
      {open && (
        <div className="space-y-3 border-t border-(--line) px-4 pb-4 pt-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Что хочет клиент: двери, лимит бриков, сроки…"
            aria-label="Что хочет клиент"
            className="tg-input resize-y text-[14px] leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-md border border-(--line) px-3 py-1.5">
              <span className="tg-mono text-[12px] text-(--muted)">₽</span>
              <input value={cost} onChange={(e) => { setCost(e.target.value); setError('') }} inputMode="decimal" placeholder="цена" aria-label="Цена" className="tg-input tg-mono w-24 text-[14px]" />
            </label>
            {error && <span className="text-[13px] text-(--orange)">{error}</span>}
            <span className="tg-mono ml-auto hidden text-[11px] text-(--muted) sm:inline">Ctrl+Enter — повесить</span>
            <button type="button" onClick={reset} className="rounded-md px-3 py-2 text-[14px] text-(--muted) hover:text-(--text)">Закрыть</button>
            <button type="submit" className="tg-display rounded-md bg-(--orange) px-4 py-2 text-[14px] text-black transition hover:bg-(--text)">Повесить бирку</button>
          </div>
        </div>
      )}
    </form>
  )
}

export default function Tags({ orders: initial, failed }: { orders: Order[]; failed: boolean }) {
  const { orders, setStatus, add, touched } = useLabOrders(initial)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [mobileCol, setMobileCol] = useState<StatusKey>('queue')
  const [showCancelled, setShowCancelled] = useState(false)

  const numbers = useMemo(() => numberMap(orders), [orders])
  const counts = useMemo(() => countByStatus(orders), [orders])
  const inPlay = useMemo(
    () => orders.filter((o) => ['queue', 'work'].includes(statusKey(o))).reduce((s, o) => s + (Number(o.cost) || 0), 0),
    [orders],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => `${o.title ?? ''} ${o.description ?? ''}`.toLowerCase().includes(q))
  }, [orders, query])

  const byCol = useMemo(() => {
    const m: Record<StatusKey, Order[]> = { queue: [], work: [], done: [], cancel: [] }
    for (const o of visible) m[statusKey(o)].push(o)
    m.queue.sort((a, b) => Number(isUrgent(b)) - Number(isUrgent(a)) || a.created_at.localeCompare(b.created_at))
    return m
  }, [visible])

  const opened = orders.find((o) => o.id === openId) ?? null
  const close = useCallback(() => setOpenId(null), [])
  useModal(!!opened, close)

  const handleAdd = (d: { title: string; description: string; cost: number | null }) => {
    add(d)
    setMobileCol('queue')
  }

  return (
    <div className="min-h-full pb-24">
      <header className="border-b border-(--line) bg-[#120f0c]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-md bg-(--tag) text-(--ink)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"><path d="M3 12.5 11.5 4H20v8.5L11.5 21z" /><circle cx="16" cy="8" r="1.6" fill="currentColor" /></svg>
            </span>
            <div>
              <p className="tg-display text-[20px] leading-none">BR BuildHub</p>
              <p className="tg-mono mt-1 text-[11px] uppercase tracking-[0.18em] text-(--muted)">доска заказов</p>
            </div>
          </div>
          <dl className="tg-mono flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-(--muted)">
            <div className="flex gap-1.5"><dt>очередь</dt><dd className="text-(--text)">{counts.queue}</dd></div>
            <div className="flex gap-1.5"><dt>в цеху</dt><dd className="text-(--orange)">{counts.work}</dd></div>
            <div className="flex gap-1.5"><dt>сдано</dt><dd className="text-(--text)">{counts.done}</dd></div>
            <div className="flex gap-1.5"><dt>в очереди и в цеху на</dt><dd className="text-(--text)">{money(inPlay) ?? '0 ₽'}</dd></div>
          </dl>
          <label className="ml-auto flex w-full items-center gap-2 rounded-md border border-(--line) bg-black/30 px-3 py-2 sm:w-64">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-(--muted)" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти бирку…" aria-label="Поиск" className="tg-input text-[14px]" />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="py-8">
          <QuickAdd onAdd={handleAdd} />
          {touched && (
            <p className="tg-mono mt-3 text-center text-[11px] text-(--muted)">макет: изменения живут до перезагрузки страницы и в базу не попадают</p>
          )}
          {failed && <p className="mt-4 text-center text-(--orange)">Не удалось загрузить заказы из базы.</p>}
        </div>

        {/* Переключатель колонок на телефоне */}
        <div role="tablist" aria-label="Колонки" className="tg-plate sticky top-2 z-20 mb-6 grid grid-cols-3 rounded-lg p-1 md:hidden">
          {COLS.map((c) => (
            <button
              key={c.key}
              role="tab"
              aria-selected={mobileCol === c.key}
              onClick={() => setMobileCol(c.key)}
              className={`tg-display rounded-md py-2 text-[14px] transition ${mobileCol === c.key ? 'bg-(--tag) text-(--ink)' : 'text-(--muted)'}`}
            >
              {c.title} <span className="tg-mono text-[11px] opacity-70">{byCol[c.key].length}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          {COLS.map((c) => (
            <section key={c.key} className={`${mobileCol === c.key ? '' : 'hidden'} md:block`} aria-label={c.title}>
              <div className="mb-5 hidden items-end justify-between border-b-2 border-(--tag)/70 pb-2 md:flex">
                <div>
                  <h2 className="tg-display text-[26px] leading-none">{c.title}</h2>
                  <p className="mt-1 text-[12px] text-(--muted)">{c.hint}</p>
                </div>
                <span className={`tg-mono text-[28px] leading-none ${c.key === 'work' ? 'text-(--orange)' : 'text-(--tag)'}`}>{pad(byCol[c.key].length, 2)}</span>
              </div>
              <div className="grid grid-cols-1 gap-7 min-[480px]:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {byCol[c.key].map((o) => (
                  <Tag key={o.id} order={o} number={numbers.get(o.id) ?? 0} onOpen={() => setOpenId(o.id)} />
                ))}
              </div>
              {byCol[c.key].length === 0 && (
                <p className="rounded-lg border border-dashed border-(--line) px-4 py-10 text-center text-[14px] text-(--muted)">
                  {query ? 'Ничего не нашлось' : 'Пустой крючок'}
                </p>
              )}
            </section>
          ))}
        </div>

        {byCol.cancel.length > 0 && (
          <div className="mt-12">
            <button onClick={() => setShowCancelled((v) => !v)} className="tg-mono text-[12px] uppercase tracking-[0.16em] text-(--muted) hover:text-(--text)">
              {showCancelled ? '▾' : '▸'} отменённые ({byCol.cancel.length})
            </button>
            {showCancelled && (
              <div className="mt-5 grid grid-cols-1 gap-7 opacity-60 min-[480px]:grid-cols-2 lg:grid-cols-4">
                {byCol.cancel.map((o) => <Tag key={o.id} order={o} number={numbers.get(o.id) ?? 0} onOpen={() => setOpenId(o.id)} />)}
              </div>
            )}
          </div>
        )}
      </main>

      {opened && (
        <Drawer
          order={opened}
          number={numbers.get(opened.id) ?? 0}
          onClose={close}
          onStatus={(k) => setStatus(opened.id, k)}
        />
      )}

      <LabSwitcher current={4} />
    </div>
  )
}

function Drawer({ order, number, onClose, onStatus }: { order: Order; number: number; onClose: () => void; onStatus: (k: StatusKey) => void }) {
  const images = imagesOf(order)
  const [shown, setShown] = useState(0)
  const st = statusKey(order)
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="tg-title"
        onClick={(e) => e.stopPropagation()}
        className="tg-drawer flex h-full w-full max-w-xl flex-col overflow-y-auto bg-(--tag) text-(--ink) shadow-2xl"
      >
        {st === 'work' && <div aria-hidden className="tg-hazard h-2 shrink-0" />}
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <p className="tg-mono text-[12px] text-(--ink-2)">Бирка № {pad(number)}{isDraft(order) ? ' · новая, не сохранена' : ''}</p>
            <h2 id="tg-title" className="tg-display mt-1 text-[32px] leading-[1.05]">{titleOf(order)}</h2>
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-(--ink) text-xl leading-none transition hover:bg-(--ink) hover:text-(--tag)">×</button>
        </div>

        <div className="px-6 pt-5">
          <p className="tg-mono mb-2 text-[11px] uppercase tracking-[0.16em] text-(--ink-2)">Перевесить на крючок</p>
          <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-(--ink)/10 p-1">
            {(['queue', 'work', 'done', 'cancel'] as StatusKey[]).map((k) => (
              <button
                key={k}
                onClick={() => onStatus(k)}
                aria-pressed={st === k}
                className={`tg-display rounded-md py-2 text-[13px] transition ${st === k ? (k === 'work' ? 'bg-(--orange) text-black' : 'bg-(--ink) text-(--tag)') : 'hover:bg-(--ink)/10'}`}
              >
                {STATUS_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        {images.length > 0 && (
          <div className="px-6 pt-6">
            <div className="aspect-[16/10] overflow-hidden rounded-md bg-(--tag-2) ring-1 ring-black/10">
              <img src={images[shown]} alt={titleOf(order)} className="h-full w-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="mt-2 flex gap-2">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setShown(i)} aria-label={`Фото ${i + 1}`} className={`h-14 w-20 overflow-hidden rounded ring-2 transition ${shown === i ? 'ring-(--ink)' : 'ring-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <dl className="tg-mono mx-6 mt-6 grid grid-cols-3 border-y border-dashed border-(--ink)/30 py-3 text-[13px]">
          <div><dt className="text-[10.5px] uppercase tracking-[0.14em] text-(--ink-2)">Цена</dt><dd className="mt-1 text-[16px] font-semibold">{money(order.cost) ?? '—'}</dd></div>
          <div><dt className="text-[10.5px] uppercase tracking-[0.14em] text-(--ink-2)">Заявка</dt><dd className="mt-1">{requestDate(order) ?? '—'}</dd></div>
          <div><dt className="text-[10.5px] uppercase tracking-[0.14em] text-(--ink-2)">Записали</dt><dd className="mt-1">{longDate(order.created_at)}</dd></div>
        </dl>

        <div className="flex-1 px-6 py-6">
          <p className="tg-mono mb-3 text-[11px] uppercase tracking-[0.16em] text-(--ink-2)">Что хотел клиент</p>
          {order.description ? (
            <NoteText text={order.description} className="text-[15px] leading-relaxed" linkClassName="font-semibold underline decoration-(--orange) decoration-2 underline-offset-2" markerClassName="bg-(--orange) rotate-45" />
          ) : (
            <p className="text-[15px] text-(--ink-2)">Пока пусто — допишите, пока не забыли.</p>
          )}
        </div>
      </aside>
    </div>
  )
}
