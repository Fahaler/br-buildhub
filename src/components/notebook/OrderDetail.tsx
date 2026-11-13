"use client"

import { useEffect, useState, type ReactNode } from 'react'
import {
  MAX_COST, PAYMENT, PAYMENT_KEYS, STATUS, STATUS_KEYS, bricks, cleanDescription, dayLabel, imagesOf, isForSale, isSold,
  longDate, money, num, orderDayOf, owedOf, pad, parseCost, parseDay, paymentKey, priorityKey, receivedOf, soldPriceOf,
  statusKey, titleOf, todayDay, type Order, type PaymentKey, type StatusKey,
} from '@/lib/orders'
import { checkProgress, toggleCheckLine } from '@/lib/checklist'
import type { OrderValues } from '@/lib/saveOrder'
import NoteText from './NoteText'
import { DeadlineBadge, Led, PaymentMark, PriorityBadge, SaleBadge, SaleIcon, Segment, paymentColor } from './parts'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)

export type PatchFn = (values: Partial<OrderValues>, done?: string) => Promise<boolean>

type Props = {
  order: Order
  number: number
  isAdmin: boolean
  today: Date | null
  nicks: string[]
  onStatus: (k: StatusKey) => void
  onPayment: (k: PaymentKey) => void
  onPatch: PatchFn
  onClient: (nick: string) => void
  onEdit: () => void
  onDelete: () => void
}

const moneyInput = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v).replace('.', ','))

/** Ячейка в полосе фактов о заказе. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-[9.5rem] flex-1 bg-(--bg) px-4 py-3">
      <dt className="cs-label">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

/** Быстрая правка суммы предоплаты прямо в карточке. */
function PrepaidQuick({ order, autoFocus, onPatch }: { order: Order; autoFocus: boolean; onPatch: PatchFn }) {
  const saved = moneyInput(num(order.prepaid_amount))
  const [value, setValue] = useState(saved)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const cost = num(order.cost)
  const changed = value.trim() !== saved

  const save = async () => {
    const v = parseCost(value)
    if (v !== null && !Number.isFinite(v)) { setError('Например 500 или 1 000'); return }
    if (v !== null && cost !== null && v > cost) { setError('Больше цены заказа'); return }
    if (v !== null && v > MAX_COST) { setError('Проверьте нули'); return }
    setError('')
    setBusy(true)
    const ok = await onPatch({ prepaid_amount: v }, v === null ? 'Сумма предоплаты убрана' : `Предоплата: ${money(v)}`)
    setBusy(false)
    if (ok) setValue(moneyInput(v))
  }

  const pre = num(order.prepaid_amount)
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (changed) save() }}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-(--amber)/35 bg-(--amber)/[0.06] px-3 py-2.5"
    >
      <label htmlFor={`prepaid-${order.id}`} className="text-[13px] text-(--amber)">Предоплата, ₽</label>
      <input
        id={`prepaid-${order.id}`}
        value={value}
        onChange={(e) => { setValue(e.target.value); setError('') }}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setValue(saved); setError(''); (e.target as HTMLInputElement).blur() } }}
        inputMode="decimal"
        placeholder="сколько внесли"
        autoComplete="off"
        autoFocus={autoFocus && pre === null}
        className="cs-field font-mono-ui w-36 px-2.5 py-1.5 text-[14px]"
      />
      {changed ? (
        <button type="submit" disabled={busy} className="cs-btn bg-(--amber) px-3 py-1.5 text-[13px] text-black hover:bg-(--text)">
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
      ) : (
        <span className="font-mono-ui text-[12.5px] text-(--muted)">
          {cost !== null ? (pre !== null ? `из ${money(cost)} · осталось ${money(owedOf(order))}` : `из ${money(cost)}`) : pre === null ? 'сумма не записана' : ''}
        </span>
      )}
      {error && <span role="alert" className="text-[12.5px] text-(--red)">{error}</span>}
    </form>
  )
}

/** Отметка «Продано» для вещей на продажу. */
function SalePanel({ order, nicks, onPatch }: { order: Order; nicks: string[]; onPatch: PatchFn }) {
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState('')
  const [buyer, setBuyer] = useState('')
  const [day, setDay] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sold = isSold(order)

  const start = () => {
    setPrice(moneyInput(num(order.cost)))
    setBuyer(order.client_nick ?? '')
    setDay(todayDay())
    setError('')
    setOpen(true)
  }

  const confirm = async () => {
    const p = parseCost(price)
    if (p !== null && !Number.isFinite(p)) { setError('Цена: например 1500 или 1 500'); return }
    if (p !== null && p > MAX_COST) { setError('Цена подозрительно большая'); return }
    if (!parseDay(day)) { setError('Укажите дату продажи'); return }
    if (day > todayDay()) { setError('Дата продажи не может быть в будущем'); return }
    if (day < orderDayOf(order)) { setError('Дата раньше, чем начали строить'); return }
    setBusy(true)
    const st = statusKey(order)
    const ok = await onPatch(
      {
        sold_at: day,
        sold_price: p,
        client_nick: buyer.trim() || null,
        ...(st === 'queue' || st === 'work' ? { status: STATUS.done.value } : {}),
      },
      `Продано${p !== null ? ` за ${money(p)}` : ''}`,
    )
    setBusy(false)
    if (ok) setOpen(false)
  }

  if (sold) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-(--sale)/40 bg-(--sale)/[0.07] px-3 py-2.5 text-[14px]">
        <span className="flex items-center gap-2 font-semibold text-(--sale)"><SaleIcon /> Продано</span>
        <span className="font-mono-ui text-[13px] text-(--text)/85">
          {dayLabel(order.sold_at)} · {money(soldPriceOf(order)) ?? 'без цены'}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => { setBusy(true); await onPatch({ sold_at: null, sold_price: null }, 'Снова в продаже'); setBusy(false) }}
          className="cs-btn ml-auto border border-(--line) px-3 py-1.5 text-[13px] font-normal text-(--muted) hover:border-(--sale) hover:text-(--sale)"
        >
          Вернуть в продажу
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={start} className="cs-btn flex w-full items-center justify-center gap-2 border border-(--sale)/60 py-2.5 text-[14px] text-(--sale) hover:bg-(--sale)/10">
        <SaleIcon /> Продано
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); confirm() }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }}
      className="space-y-3 rounded-lg border border-(--sale)/50 bg-(--sale)/[0.06] p-3"
      aria-label="Отметить проданным"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-[12.5px] text-(--muted)">Продали за, ₽</span>
          <input value={price} onChange={(e) => { setPrice(e.target.value); setError('') }} inputMode="decimal" placeholder="1 500" autoComplete="off" autoFocus className="cs-field font-mono-ui mt-1 px-2.5 py-1.5 text-[14px]" />
        </label>
        <label className="block">
          <span className="text-[12.5px] text-(--muted)">Покупатель</span>
          <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="ник" maxLength={64} autoComplete="off" spellCheck={false} list={nicks.length ? 'sale-nicks' : undefined} className="cs-field mt-1 px-2.5 py-1.5 text-[14px]" />
          {nicks.length > 0 && <datalist id="sale-nicks">{nicks.map((n) => <option key={n} value={n} />)}</datalist>}
        </label>
        <label className="block">
          <span className="text-[12.5px] text-(--muted)">Когда</span>
          <input type="date" value={day} max={todayDay()} onChange={(e) => { setDay(e.target.value); setError('') }} className="cs-field font-mono-ui mt-1 px-2.5 py-1.5 text-[14px]" />
        </label>
      </div>
      {error && <p role="alert" className="text-[13px] text-(--red)">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="cs-btn bg-(--sale) px-4 py-2 text-[13px] text-black hover:bg-(--text)">
          {busy ? 'Сохраняем…' : 'Отметить проданным'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className="cs-btn border border-(--line) px-4 py-2 text-[13px] font-normal text-(--muted) hover:text-(--text)">
          Отмена
        </button>
      </div>
    </form>
  )
}

export default function OrderDetail({ order, number, isAdmin, today, nicks, onStatus, onPayment, onPatch, onClient, onEdit, onDelete }: Props) {
  const images = imagesOf(order)
  const [shown, setShown] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [justPrepaid, setJustPrepaid] = useState(false)
  const st = statusKey(order)
  const pay = paymentKey(order)
  const active = st === 'queue' || st === 'work'
  const sale = isForSale(order)
  const sold = isSold(order)
  const text = cleanDescription(order.description)
  const index = Math.min(shown, Math.max(0, images.length - 1))
  const progress = sale ? { done: 0, total: 0 } : checkProgress(text)
  const cost = num(order.cost)
  const owed = owedOf(order)
  const limit = bricks(order.brick_limit)

  const toggle = isAdmin && !sale
    ? (line: number) => {
        const next = toggleCheckLine(text, line)
        if (next === text) return
        // Старые заказы хранили дату в тексте («*От: …») — переносим её в поле, раз текст перезаписывается
        onPatch({ description: next, ...(order.ordered_at ? {} : { ordered_at: orderDayOf(order) }) })
      }
    : undefined

  // ←/→ — листать фото, Esc — закрыть увеличенное
  useEffect(() => {
    if (images.length === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (document.querySelector('[data-modal-open]')) return
      if (e.key === 'Escape' && zoom) { e.stopPropagation(); setZoom(false); return }
      if (images.length < 2) return
      if (e.key === 'ArrowRight') { e.preventDefault(); setShown((i) => (Math.min(i, images.length - 1) + 1) % images.length) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setShown((i) => (Math.min(i, images.length - 1) - 1 + images.length) % images.length) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [images.length, zoom])

  return (
    <article className="cs-slide mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-mono-ui text-[13px] text-(--muted)">#{pad(number)}</span>
        <span className="flex items-center gap-2 rounded-full border border-(--line) px-2.5 py-0.5 text-[12px]" style={{ color: STATUS[st].color }}>
          <Led status={st} size={7} /> {STATUS[st].label}
        </span>
        <PriorityBadge priority={priorityKey(order)} />
        {sale && <SaleBadge sold={sold} />}
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <button onClick={onEdit} className="cs-btn flex items-center gap-2 border border-(--line) px-3 py-1.5 text-[13px] font-medium text-(--text) hover:border-(--amber) hover:text-(--amber)">
              Изменить <span className="cs-key hidden md:inline">E</span>
            </button>
            <button onClick={onDelete} aria-label="Удалить заказ" title="Удалить" className="cs-btn border border-(--line) px-2.5 py-1.5 text-(--muted) hover:border-(--red) hover:text-(--red)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            </button>
          </div>
        )}
      </div>

      <h1 className="font-display mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.05] font-semibold break-words">{titleOf(order)}</h1>
      {order.client_nick && (
        <p className="mt-2 text-[15px] text-(--muted)">
          {sale ? 'покупатель' : 'для'}{' '}
          <button
            type="button"
            onClick={() => onClient(order.client_nick as string)}
            title="Все заказы этого клиента"
            className="font-mono-ui text-(--text) underline decoration-(--muted)/60 decoration-dotted underline-offset-4 transition hover:text-(--amber) hover:decoration-(--amber)"
          >
            {order.client_nick}
          </button>
        </p>
      )}

      {isAdmin && (
        <div className="mt-5 space-y-2">
          <Segment
            label="Статус"
            value={st}
            onChange={onStatus}
            options={STATUS_KEYS.map((k, i) => ({ key: k, label: STATUS[k].label, dot: STATUS[k].color, hint: String(i + 1) }))}
            columns="grid-cols-2 sm:grid-cols-4"
          />
          {sale ? (
            <SalePanel key={`${order.sold_at ?? ''}`} order={order} nicks={nicks} onPatch={onPatch} />
          ) : (
            <>
              <Segment
                label="Оплата"
                value={pay}
                onChange={(k) => { setJustPrepaid(k === 'prepaid'); onPayment(k) }}
                options={PAYMENT_KEYS.map((k) => ({ key: k, label: PAYMENT[k].label, dot: paymentColor(k) }))}
              />
              {pay === 'prepaid' && (
                <PrepaidQuick key={`${order.prepaid_amount ?? ''}`} order={order} autoFocus={justPrepaid} onPatch={onPatch} />
              )}
            </>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label="Открыть фото крупно"
            className="relative block aspect-[16/9] w-full overflow-hidden rounded-lg border border-(--line) bg-(--panel)"
          >
            <img src={images[index]} alt={`${titleOf(order)} — фото ${index + 1}`} className="h-full w-full object-cover" />
            {st === 'work' && <span aria-hidden className="cs-hazard absolute inset-x-0 bottom-0 h-1.5" />}
            {images.length > 1 && (
              <span className="font-mono-ui absolute top-2 right-2 rounded-sm bg-black/70 px-1.5 text-[11px] leading-[18px]">{index + 1} / {images.length}</span>
            )}
          </button>
          {images.length > 1 && (
            <div className="cs-scroll mt-2 flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setShown(i)}
                  aria-label={`Фото ${i + 1}`}
                  aria-current={index === i}
                  className={`h-14 w-24 shrink-0 overflow-hidden rounded-md border-2 transition ${index === i ? 'border-(--amber)' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <dl className="font-mono-ui mt-6 flex flex-wrap gap-px overflow-hidden rounded-lg border border-(--line) bg-(--line) text-[13px]">
        {sale ? (
          <>
            <Fact label="Цена продажи">
              <span className="text-[16px] text-(--sale)">{money(order.cost) ?? '—'}</span>
            </Fact>
            <Fact label="Продажа">
              {sold ? (
                <span className="text-(--sale)">
                  продано {dayLabel(order.sold_at, false)}
                  {num(order.sold_price) !== null && num(order.sold_price) !== cost && <span className="block text-(--text)/85">за {money(order.sold_price)}</span>}
                </span>
              ) : (
                <span className="text-(--muted)">{st === 'cancel' ? 'снято' : 'в продаже'}</span>
              )}
            </Fact>
          </>
        ) : (
          <>
            <Fact label="Цена">
              <span className="text-[16px] text-(--amber)">{money(order.cost) ?? '—'}</span>
            </Fact>
            <Fact label="Оплата">
              <span className="flex items-center gap-1.5" style={{ color: paymentColor(pay) }}>
                <PaymentMark payment={pay} decorative /> {PAYMENT[pay].label}
              </span>
              {pay === 'prepaid' && num(order.prepaid_amount) !== null && (
                <span className="mt-0.5 block text-(--text)/85">внесли {money(receivedOf(order))}</span>
              )}
              {owed > 0 && st !== 'cancel' && pay !== 'none' && (
                <span className={`mt-0.5 block ${st === 'done' ? 'text-(--red)' : 'text-(--muted)'}`}>осталось {money(owed)}</span>
              )}
              {owed > 0 && st === 'done' && pay === 'none' && <span className="mt-0.5 block text-(--red)">долг {money(owed)}</span>}
            </Fact>
          </>
        )}
        <Fact label={sale ? 'Начали' : 'Заказ от'}>{dayLabel(orderDayOf(order))}</Fact>
        <Fact label="Дедлайн">
          {order.deadline ? <DeadlineBadge deadline={order.deadline} active={active} today={today} long /> : <span className="text-(--muted)">нет</span>}
        </Fact>
        {limit && (
          <Fact label="Лимит бриков">
            <span className="text-[16px]">{limit}</span>
          </Fact>
        )}
      </dl>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <p className="cs-label">{sale ? 'Описание' : 'ТЗ / что хотел клиент'}</p>
          {progress.total > 0 && (
            <span className="font-mono-ui flex items-center gap-2 text-[12px] text-(--muted)" title="Отмечено пунктов">
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-(--panel-2)">
                <span className="block h-full rounded-full bg-(--green) transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </span>
              <span className={progress.done === progress.total ? 'text-(--green)' : ''}>{progress.done}/{progress.total}</span>
            </span>
          )}
        </div>
        {text ? (
          <NoteText
            text={text}
            checklist={!sale}
            onToggle={toggle}
            className="text-[15px] leading-relaxed text-(--text)/90"
            linkClassName="text-(--amber) underline underline-offset-4 break-all"
            markerClassName="bg-(--amber)"
          />
        ) : (
          <p className="text-[15px] text-(--muted)">Пусто.{isAdmin ? ' Нажмите «Изменить», чтобы записать детали.' : ''}</p>
        )}
        {isAdmin && !sale && text && progress.total === 0 && (
          <p className="mt-3 text-[12.5px] text-(--muted)">Строки с «•», «-» или «1.» в ТЗ станут пунктами, которые можно отмечать.</p>
        )}
      </div>

      <p className="font-mono-ui mt-10 border-t border-(--line) pt-3 text-[11.5px] text-(--muted)">Внесён в блокнот {longDate(order.created_at)}</p>

      {zoom && images.length > 0 && (
        <div role="dialog" aria-modal="true" aria-label="Фото крупно" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-3" onClick={() => setZoom(false)}>
          <img src={images[index]} alt={`${titleOf(order)} — фото ${index + 1}`} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setZoom(false)} aria-label="Закрыть" className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-md bg-black/70 text-2xl text-(--text)">×</button>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setShown((index - 1 + images.length) % images.length) }}
                aria-label="Предыдущее фото"
                className="absolute top-1/2 left-3 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-md bg-black/70 text-xl text-(--text) hover:text-(--amber)"
              >
                ←
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShown((index + 1) % images.length) }}
                aria-label="Следующее фото"
                className="absolute top-1/2 right-3 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-md bg-black/70 text-xl text-(--text) hover:text-(--amber)"
              >
                →
              </button>
              <span className="font-mono-ui absolute bottom-3 left-1/2 -translate-x-1/2 rounded-sm bg-black/70 px-2 text-[12px]">{index + 1} / {images.length}</span>
            </>
          )}
        </div>
      )}
    </article>
  )
}
