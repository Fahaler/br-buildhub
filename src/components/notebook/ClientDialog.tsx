"use client"

import { useEffect, useMemo } from 'react'
import {
  STATUS, clientSummaries, isForSale, isSold, money, nickKey, orderDayOf, owedOf, pad, paymentKey, shortDay, soldDayOf,
  soldPriceOf, statusKey, titleOf, type Order,
} from '@/lib/orders'
import { Led, PaymentMark, SaleIcon } from './parts'
import { plural } from './StatsView'

type Props = {
  nick: string
  orders: Order[]
  numbers: Map<string, number>
  onPick: (id: string) => void
  onClose: () => void
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0 flex-1 bg-(--panel) px-3 py-2.5">
      <dt className="cs-label !text-[9.5px]">{label}</dt>
      <dd className="font-mono-ui mt-1 truncate text-[15px]" style={color ? { color } : undefined}>{value}</dd>
    </div>
  )
}

/** Карточка клиента: все его заказы и покупки, сколько всего, сколько получено и сколько должен. */
export default function ClientDialog({ nick, orders, numbers, onPick, onClose }: Props) {
  const client = useMemo(() => clientSummaries(orders).find((c) => c.key === nickKey(nick)) ?? null, [orders, nick])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const list = client?.orders ?? []
  const purchases = list.filter(isForSale).length

  return (
    <div data-modal-open className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-title"
        className="cs-up flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-xl border border-(--line) bg-(--bg) shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-(--line) bg-(--panel) px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <p className="cs-label">Клиент</p>
            <h2 id="client-title" className="font-mono-ui mt-1 truncate text-[22px] font-semibold text-(--text)">{client?.nick ?? nick}</h2>
            <p className="mt-0.5 text-[13px] text-(--muted)">
              {list.length - purchases} {plural(list.length - purchases, ['заказ', 'заказа', 'заказов'])}
              {purchases > 0 && ` · ${purchases} ${plural(purchases, ['покупка', 'покупки', 'покупок'])}`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" autoFocus className="cs-btn grid h-9 w-9 place-items-center border border-(--line) text-xl text-(--muted) hover:text-(--text)">×</button>
        </div>

        {client && (
          <dl className="flex gap-px border-b border-(--line) bg-(--line)">
            <Cell label="Всего" value={money(client.total) ?? '0 ₽'} color="var(--amber)" />
            <Cell label="Получено" value={money(client.received) ?? '0 ₽'} color="var(--green)" />
            <Cell label="Должен" value={money(client.owed) ?? '0 ₽'} color={client.owed > 0 ? 'var(--red)' : 'var(--muted)'} />
          </dl>
        )}

        <div className="cs-scroll min-h-0 flex-1 overflow-y-auto">
          {list.length === 0 && <p className="p-8 text-center text-[14px] text-(--muted)">У этого ника пока нет заказов.</p>}
          {list.map((o) => {
            const st = statusKey(o)
            const sale = isForSale(o)
            const owed = owedOf(o)
            const day = sale ? soldDayOf(o) : orderDayOf(o)
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onPick(o.id)}
                className="flex w-full items-center gap-3 border-b border-(--line) px-5 py-3 text-left transition last:border-b-0 hover:bg-(--panel)"
              >
                <Led status={st} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-ui shrink-0 text-[11px] text-(--muted)">#{pad(numbers.get(o.id) ?? 0)}</span>
                    <span className={`truncate text-[14.5px] font-semibold ${st === 'cancel' ? 'text-(--muted) line-through' : ''}`}>{titleOf(o)}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-(--muted)">
                    {sale ? (
                      <span className="flex items-center gap-1 text-(--sale)"><SaleIcon size={10} /> {isSold(o) ? 'покупка' : 'на продаже'}</span>
                    ) : (
                      <span>{STATUS[st].label}</span>
                    )}
                    {day && <span className="font-mono-ui">· {shortDay(day)}</span>}
                  </p>
                </div>
                <div className="font-mono-ui flex shrink-0 flex-col items-end gap-0.5 text-[13px]">
                  <span className="flex items-center gap-1.5">
                    {!sale && <PaymentMark payment={paymentKey(o)} size={11} />}
                    {money(sale ? soldPriceOf(o) : o.cost) ?? '—'}
                  </span>
                  {owed > 0 && (
                    <span className={`text-[11.5px] ${st === 'done' ? 'text-(--red)' : 'text-(--muted)'}`}>
                      {st === 'done' ? 'долг' : 'осталось'} {money(owed)}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
