"use client"

import { useMemo, useState } from 'react'
import {
  PERIODS, STATUS, STATUS_KEYS, clientSummaries, isForSale, money, monthLabel, monthOf, num, orderDayOf, orderStats,
  owedOf, pad, periodTest, saleStats, statusKey, titleOf, type Order, type Period, type StatusKey,
} from '@/lib/orders'
import { Led, SaleIcon, useToday } from './parts'

/** 1 заказ, 2 заказа, 5 заказов */
export function plural(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b === 1) return forms[0]
  if (b >= 2 && b <= 4) return forms[1]
  return forms[2]
}

const ORDERS: [string, string, string] = ['заказ', 'заказа', 'заказов']
const PURCHASES: [string, string, string] = ['покупка', 'покупки', 'покупок']

/** «2 заказа · 1 покупка» — заказы и покупки готовых вещей отдельно */
function dealsLabel(c: { count: number; purchases: number }) {
  const n = c.count - c.purchases
  const parts = []
  if (n > 0 || c.purchases === 0) parts.push(`${n} ${plural(n, ORDERS)}`)
  if (c.purchases > 0) parts.push(`${c.purchases} ${plural(c.purchases, PURCHASES)}`)
  return parts.join(' · ')
}
const THINGS: [string, string, string] = ['вещь', 'вещи', 'вещей']

function Tile({ label, value, accent, note, onClick }: { label: string; value: string; accent: string; note?: string; onClick?: () => void }) {
  const body = (
    <>
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
      <dt className="cs-label">{label}</dt>
      <dd className="font-display mt-2 text-[clamp(1.5rem,2.8vw,2.1rem)] leading-none font-semibold tabular-nums" style={{ color: accent }}>
        {value}
      </dd>
      {note && <dd className="mt-2 text-[12.5px] text-(--muted)">{note}</dd>}
    </>
  )
  const cls = 'relative block w-full overflow-hidden rounded-lg border border-(--line) bg-(--panel) px-5 py-4 text-left'
  return onClick ? (
    <div><button type="button" onClick={onClick} className={`${cls} transition hover:border-(--muted)/60`}>{body}</button></div>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** «4,5к» — подпись над столбиком. */
function compact(n: number) {
  if (n < 1000) return String(Math.round(n))
  const k = n / 1000
  return `${k >= 100 ? Math.round(k) : Math.round(k * 10) / 10}к`.replace('.', ',')
}

type MonthRow = { month: string; count: number; sum: number; doneSum: number }

/** Столбики за последние 12 месяцев: сумма заказов (без отменённых) и сумма готовых — по дате заказа. */
function MonthChart({ orders, today, selected, onSelect }: { orders: Order[]; today: Date | null; selected: Period; onSelect: (m: string) => void }) {
  const rows = useMemo<MonthRow[]>(() => {
    if (!today) return []
    const months = Array.from({ length: 12 }, (_, i) => monthOf(today, i - 11))
    const map = new Map(months.map((m) => [m, { month: m, count: 0, sum: 0, doneSum: 0 }]))
    for (const o of orders) {
      if (isForSale(o)) continue
      const st = statusKey(o)
      if (st === 'cancel') continue
      const r = map.get(orderDayOf(o).slice(0, 7))
      if (!r) continue
      const cost = num(o.cost) ?? 0
      r.count++
      r.sum += cost
      if (st === 'done') r.doneSum += cost
    }
    return months.map((m) => map.get(m)!)
  }, [orders, today])

  const max = Math.max(1, ...rows.map((r) => r.sum))
  const thisMonth = today ? monthOf(today) : ''

  return (
    <div className="rounded-lg border border-(--line) bg-(--panel) px-3 pt-4 pb-2 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-(--muted)">
        <span className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-(--amber)" /> сумма заказов</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-(--green)" /> из них готово</span>
        <span className="ml-auto hidden sm:inline">нажмите на месяц, чтобы открыть его</span>
      </div>
      {rows.length === 0 ? (
        <div className="h-[178px]" />
      ) : (
        <div className="grid grid-cols-12 gap-0.5 sm:gap-1.5" role="group" aria-label="Заказы по месяцам">
          {rows.map((r, i) => {
            const on = selected === r.month
            const year = r.month.slice(0, 4)
            const showYear = i === 0 || r.month.endsWith('-01')
            return (
              <button
                key={r.month}
                type="button"
                onClick={() => onSelect(r.month)}
                aria-pressed={on}
                title={`${monthLabel(r.month)}: ${r.count} ${plural(r.count, ORDERS)} на ${money(r.sum)}, готово на ${money(r.doneSum)}`}
                className={`group flex min-w-0 flex-col items-stretch rounded-md px-0.5 pt-1 pb-1.5 transition ${on ? 'bg-(--panel-2) ring-1 ring-(--amber)/60' : 'hover:bg-(--panel-2)'}`}
              >
                <span className={`font-mono-ui block h-4 truncate text-center text-[10px] leading-4 ${r.sum ? 'text-(--text)/80' : 'text-transparent'}`}>
                  {r.sum ? compact(r.sum) : '0'}
                </span>
                <span className="relative flex h-[120px] items-end justify-center gap-[2px] sm:gap-[3px]">
                  <span className="w-[40%] max-w-3.5 rounded-t-[2px] bg-(--amber) transition-[height] group-hover:brightness-110" style={{ height: r.sum ? `${Math.max(3, (r.sum / max) * 100)}%` : 0 }} />
                  <span className="w-[40%] max-w-3.5 rounded-t-[2px] bg-(--green) transition-[height]" style={{ height: r.doneSum ? `${Math.max(3, (r.doneSum / max) * 100)}%` : 0 }} />
                  {!r.sum && <span aria-hidden className="absolute inset-x-1 bottom-0 h-px bg-(--line)" />}
                </span>
                <span className={`mt-1.5 block truncate text-center text-[11px] ${on || r.month === thisMonth ? 'text-(--text)' : 'text-(--muted)'}`}>
                  {monthLabel(r.month, true)}
                </span>
                <span className="font-mono-ui block h-3.5 text-center text-[9.5px] leading-3.5 text-(--muted)/80">{showYear ? year : ''}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function periodText(period: Period, today: Date | null) {
  if (period === 'all') return 'за всё время'
  if (/^\d{4}-\d{2}$/.test(period)) return `за ${monthLabel(period)}`
  if (!today) return ''
  if (period === 'year') return `за ${today.getFullYear()} год`
  return `за ${monthLabel(monthOf(today, period === 'prev' ? -1 : 0))}`
}

type Props = {
  orders: Order[]
  numbers: Map<string, number>
  onFilter: (k: StatusKey | 'sale') => void
  onClient: (nick: string) => void
  onPick: (id: string) => void
}

export default function StatsView({ orders, numbers, onFilter, onClient, onPick }: Props) {
  const today = useToday()
  const [period, setPeriod] = useState<Period>('all')
  const test = useMemo(() => periodTest(period, today), [period, today])
  const inPeriod = useMemo(() => orders.filter((o) => isForSale(o) || test(orderDayOf(o))), [orders, test])

  const s = useMemo(() => orderStats(inPeriod), [inPeriod])
  const sales = useMemo(() => saleStats(orders, test), [orders, test])
  const top = useMemo(
    () => clientSummaries(orders, test).filter((c) => c.count > 0).sort((a, b) => b.total - a.total || b.count - a.count).slice(0, 5),
    [orders, test],
  )
  const debts = useMemo(
    () => inPeriod.filter((o) => !isForSale(o) && statusKey(o) === 'done' && owedOf(o) > 0).sort((a, b) => owedOf(b) - owedOf(a)),
    [inPeriod],
  )

  const avg = s.doneCount ? Math.round((s.doneSum / s.doneCount) * 100) / 100 : null
  const donePct = s.count ? Math.round((s.doneCount / s.count) * 100) : 0
  const cancel = s.byStatus.cancel
  const live = Math.round((s.sum - cancel.sum) * 100) / 100
  const month = /^\d{4}-\d{2}$/.test(period) ? period : null
  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-[13px] transition ${on ? 'border-(--amber) bg-(--amber)/10 text-(--amber)' : 'border-(--line) text-(--muted) hover:text-(--text)'}`

  return (
    <div className="cs-slide mx-auto max-w-4xl px-5 py-6 sm:px-8 sm:py-8">
      <p className="cs-label">Обзор</p>
      <h1 className="font-display mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.05] font-semibold">Статистика</h1>

      <div className="cs-scroll -mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Период">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" onClick={() => setPeriod(p.key)} aria-pressed={period === p.key} disabled={!today && p.key !== 'all'} className={`${chip(period === p.key)} disabled:opacity-50`}>
            {p.label}
          </button>
        ))}
        {month && (
          <button type="button" onClick={() => setPeriod('all')} aria-pressed className={`${chip(true)} flex items-center gap-1.5`} title="Сбросить месяц">
            <span className="first-letter:uppercase">{monthLabel(month)}</span> <span aria-hidden>×</span>
          </button>
        )}
      </div>
      <p className="mt-3 text-[14px] text-(--muted)">
        Заказы клиентов {periodText(period, today)} — по дате заказа. Вещи на продажу считаются отдельно, ниже.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Tile
          label="Сумма всех заказов"
          value={money(s.sum) ?? '0 ₽'}
          accent="var(--amber)"
          note={cancel.count ? `в том числе отменённые: ${cancel.count} на ${money(cancel.sum)}` : `${s.count} ${plural(s.count, ORDERS)}`}
        />
        <Tile
          label="Сумма готовых"
          value={money(s.doneSum) ?? '0 ₽'}
          accent="var(--green)"
          note={avg !== null ? `средний чек ${money(avg)}` : 'пока ничего не сдано'}
        />
        <Tile label="Готовых заказов" value={String(s.doneCount)} accent="var(--green)" note={s.count ? `${donePct}% от всех` : undefined} />
        <Tile label="Всего заказов" value={String(s.count)} accent="var(--text)" note={`в работе ${s.byStatus.work.count} · в очереди ${s.byStatus.queue.count}`} />
      </dl>

      <section className="mt-8" aria-labelledby="money-title">
        <p id="money-title" className="cs-label mb-3">Деньги</p>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Tile label="Получено" value={money(s.received) ?? '0 ₽'} accent="var(--green)" note={live ? `из ${money(live)} без отменённых` : undefined} />
          <Tile label="Осталось получить" value={money(s.owed) ?? '0 ₽'} accent="var(--amber)" note="по активным и готовым" />
          <Tile
            label="Долги по готовым"
            value={money(s.doneDebt.sum) ?? '0 ₽'}
            accent={s.doneDebt.count ? 'var(--red)' : 'var(--muted)'}
            note={s.doneDebt.count ? `${s.doneDebt.count} ${plural(s.doneDebt.count, ORDERS)} сдано, но не оплачено до конца` : 'все готовые оплачены'}
          />
        </dl>
        {debts.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-(--red)/35">
            {debts.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onPick(o.id)}
                className="flex w-full items-center gap-3 border-b border-(--line) px-4 py-2.5 text-left text-[14px] transition last:border-b-0 hover:bg-(--panel)"
              >
                <span className="font-mono-ui shrink-0 text-[11px] text-(--muted)">#{pad(numbers.get(o.id) ?? 0)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {titleOf(o)}
                  {o.client_nick && <span className="font-mono-ui text-(--muted)"> · {o.client_nick}</span>}
                </span>
                <span className="font-mono-ui shrink-0 text-[13px] text-(--red)">{money(owedOf(o))}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="months-title">
        <p id="months-title" className="cs-label mb-3">По месяцам · последние 12</p>
        <MonthChart orders={orders} today={today} selected={period} onSelect={(m) => setPeriod((p) => (p === m ? 'all' : m))} />
      </section>

      <section className="mt-8" aria-labelledby="status-title">
        <p id="status-title" className="cs-label mb-3">По статусам</p>
        <div className="overflow-hidden rounded-lg border border-(--line)">
          {STATUS_KEYS.map((k) => {
            const b = s.byStatus[k]
            const share = s.count ? (b.count / s.count) * 100 : 0
            return (
              <button
                key={k}
                type="button"
                onClick={() => onFilter(k)}
                title={`Показать: ${STATUS[k].label}`}
                className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-(--line) px-4 py-3 text-left transition last:border-b-0 hover:bg-(--panel) sm:grid-cols-[9rem_1fr_4rem_8rem]"
              >
                <span className="flex items-center gap-2.5 text-[14px]">
                  <Led status={k} /> {STATUS[k].label}
                </span>
                <span className="order-last col-span-2 h-1.5 overflow-hidden rounded-full bg-(--panel-2) sm:order-none sm:col-span-1">
                  <span className="block h-full rounded-full" style={{ width: `${share}%`, background: STATUS[k].color }} />
                </span>
                <span className="font-mono-ui hidden text-right text-[13px] sm:block">{b.count}</span>
                <span className="font-mono-ui text-right text-[13px] text-(--muted) group-hover:text-(--text)">
                  <span className="sm:hidden">{b.count} · </span>{money(b.sum) ?? '0 ₽'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="sales-title">
        <p id="sales-title" className="cs-label mb-3 flex items-center gap-2"><span className="text-(--sale)"><SaleIcon /></span> Продажи</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Tile
            label="Сейчас в продаже"
            value={`${sales.inStock.count} ${plural(sales.inStock.count, THINGS)}`}
            accent="var(--sale)"
            note={sales.inStock.count ? `на ${money(sales.inStock.sum)}` : 'ничего не выставлено'}
            onClick={() => onFilter('sale')}
          />
          <Tile
            label={`Продано ${periodText(period, today)}`}
            value={money(sales.sold.sum) ?? '0 ₽'}
            accent="var(--sale)"
            note={`${sales.sold.count} ${plural(sales.sold.count, THINGS)} · по дате продажи`}
            onClick={() => onFilter('sale')}
          />
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="clients-title">
        <p id="clients-title" className="cs-label mb-3">Топ клиентов</p>
        {top.length === 0 ? (
          <p className="rounded-lg border border-(--line) px-4 py-4 text-[14px] text-(--muted)">Пока не у кого считать — впишите ники клиентов в заказы.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-(--line)">
            {top.map((c, i) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onClient(c.nick)}
                className="group grid w-full grid-cols-[1.5rem_1fr_auto] items-center gap-x-3 border-b border-(--line) px-4 py-3 text-left transition last:border-b-0 hover:bg-(--panel) sm:grid-cols-[1.5rem_1fr_6rem_8rem]"
              >
                <span className={`font-mono-ui text-[13px] ${i === 0 ? 'text-(--amber)' : 'text-(--muted)'}`}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="font-mono-ui block truncate text-[14px] group-hover:text-(--amber)">{c.nick}</span>
                  <span className="block text-[12px] text-(--muted) sm:hidden">
                    {dealsLabel(c)}{c.owed > 0 && <span className="text-(--red)"> · должен {money(c.owed)}</span>}
                  </span>
                </span>
                <span className="hidden text-right text-[12.5px] text-(--muted) sm:block">
                  {dealsLabel(c)}
                  {c.owed > 0 && <span className="block text-(--red)">должен {money(c.owed)}</span>}
                </span>
                <span className="font-mono-ui text-right text-[13.5px] text-(--text)">{money(c.total)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 space-y-2 text-[13px] text-(--muted)">
        {s.noPrice > 0 && <p>Без цены: {s.noPrice} {plural(s.noPrice, ORDERS)} — в суммы не вошли, но в количестве посчитаны.</p>}
        {s.prepaidNoAmount > 0 && (
          <p>
            Предоплата без суммы: {s.prepaidNoAmount} {plural(s.prepaidNoAmount, ORDERS)} — в «Получено» не вошли. Впишите сумму в карточке заказа.
          </p>
        )}
      </div>
    </div>
  )
}
