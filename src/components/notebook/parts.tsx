"use client"

import { useSyncExternalStore } from 'react'
import {
  PAYMENT, PRIORITY, STATUS, deadlineInfo, type DeadlineInfo, type PaymentKey, type PriorityKey, type StatusKey,
} from '@/lib/orders'

const noop = () => () => {}

/** true только в браузере после гидратации — для всего, что зависит от «сегодня» и часового пояса. */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false)
}

/** Сегодняшний день; на сервере — null, чтобы не было расхождений при гидратации. */
export function useToday(): Date | null {
  const mounted = useMounted()
  return mounted ? new Date() : null
}

export function Led({ status, size = 8 }: { status: StatusKey; size?: number }) {
  return (
    <span
      aria-hidden
      className={`cs-led ${status === 'work' ? 'on' : ''}`}
      style={{ background: STATUS[status].color, color: STATUS[status].color, width: size, height: size }}
    />
  )
}

const TONE: Record<DeadlineInfo['tone'], string> = {
  late: 'bg-(--red) text-black',
  today: 'bg-(--amber) text-black',
  soon: 'border border-(--amber) text-(--amber)',
  ok: 'border border-(--line) text-(--muted)',
}

/** Бирка дедлайна. Для готовых и отменённых — просто дата, без «просрочен». */
export function DeadlineBadge({ deadline, active, today, long = false }: {
  deadline: string | null | undefined
  active: boolean
  today: Date | null
  long?: boolean
}) {
  if (!deadline) return null
  const info = deadlineInfo(deadline, today ?? undefined)
  if (!info) return null
  const live = active && today
  return (
    <span
      title={`Дедлайн: ${info.date}`}
      className={`font-mono-ui inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 text-[11px] leading-[18px] ${live ? TONE[info.tone] : TONE.ok}`}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
      {live ? (long ? `${info.date} · ${info.label}` : info.label) : info.date}
    </span>
  )
}

const PAY_COLOR: Record<PaymentKey, string> = {
  none: 'var(--muted)',
  prepaid: 'var(--amber)',
  paid: 'var(--green)',
}

/** Монетка оплаты: пустая — не оплачено, половина — предоплата, полная — оплачено. */
export function PaymentMark({ payment, size = 12, decorative = false }: { payment: PaymentKey; size?: number; decorative?: boolean }) {
  const color = PAY_COLOR[payment]
  return (
    <span title={decorative ? undefined : PAYMENT[payment].label} aria-hidden={decorative || undefined} className="inline-flex shrink-0" style={{ color }}>
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        {payment === 'paid' && <circle cx="8" cy="8" r="4" fill="currentColor" />}
        {payment === 'prepaid' && <path d="M8 4a4 4 0 0 0 0 8z" fill="currentColor" />}
      </svg>
      {!decorative && <span className="sr-only">{PAYMENT[payment].label}</span>}
    </span>
  )
}

export function paymentColor(payment: PaymentKey) {
  return PAY_COLOR[payment]
}

/** Сегмент-переключатель (статус, оплата, приоритет). */
export function Segment<K extends string>({ options, value, onChange, disabled, label, columns }: {
  options: { key: K; label: string; dot?: string; hint?: string }[]
  value: K
  onChange?: (key: K) => void
  disabled?: boolean
  label: string
  columns?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`cs-seg grid gap-1 rounded-lg border border-(--line) bg-(--panel) p-1 ${columns ?? ''}`}
      style={columns ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled && !on}
            onClick={() => onChange?.(o.key)}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-md px-2 py-2 text-[13px] transition ${
              on ? 'bg-(--panel-2) text-(--text) ring-1 ring-(--line)' : 'text-(--muted) hover:text-(--text) disabled:hover:text-(--muted)'
            } ${disabled ? 'cursor-default' : ''}`}
          >
            {o.dot && <span aria-hidden className="cs-led" style={{ background: o.dot, width: 7, height: 7 }} />}
            <span className="truncate">{o.label}</span>
            {o.hint && <span className="cs-key hidden md:inline">{o.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Бирка приоритета для карточки заказа: видна всегда, «Срочно» — крупно и ярко. */
export function PriorityBadge({ priority }: { priority: PriorityKey }) {
  if (priority === 'high') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-(--red) py-[3px] pr-3 pl-2 text-[12.5px] leading-[18px] font-bold tracking-wide text-black uppercase shadow-[0_0_0_3px_rgba(255,90,60,0.22)]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
        Срочно
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-(--line) px-2.5 py-0.5 text-[12px] text-(--text)/85">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden className="text-(--muted)">
        {priority === 'low' ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M5 12h14" />}
      </svg>
      <span className="text-(--muted)">приоритет</span> {PRIORITY[priority].label.toLowerCase()}
    </span>
  )
}

/** Иконка-ценник для вещей на продажу. */
export function SaleIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

export function SaleBadge({ sold = false }: { sold?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-(--sale)/60 px-2.5 py-0.5 text-[12px] text-(--sale) ${sold ? '' : 'bg-(--sale)/10'}`}>
      <SaleIcon /> {sold ? 'Продано' : 'На продажу'}
    </span>
  )
}
