"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  KIND, KIND_KEYS, MAX_BRICKS, MAX_COST, MAX_NICK, PAYMENT, PAYMENT_KEYS, PRIORITY, PRIORITY_KEYS, STATUS, STATUS_KEYS,
  cleanDescription, imagesOf, kindKey, money, orderDayOf, pad, parseBricks, parseCost, parseDay, paymentKey, priorityKey,
  statusKey, todayDay,
  type KindKey, type Order, type PaymentKey, type PriorityKey, type StatusKey,
} from '@/lib/orders'
import { errorText, saveOrder, type PhotoItem } from '@/lib/saveOrder'
import { useToast } from '@/components/Toaster'
import PhotoEditor, { photosFromUrls } from './PhotoEditor'
import { Segment, paymentColor } from './parts'

type Form = {
  title: string
  kind: KindKey
  nick: string
  description: string
  cost: string
  status: StatusKey
  priority: PriorityKey
  payment: PaymentKey
  deadline: string
  orderedAt: string
  prepaid: string
  bricks: string
  soldAt: string
  soldPrice: string
}

const moneyInput = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v).replace('.', ','))

function initialForm(order: Order | null): Form {
  return {
    title: order?.title ?? '',
    kind: order ? kindKey(order) : 'order',
    nick: order?.client_nick ?? '',
    description: cleanDescription(order?.description),
    cost: moneyInput(order?.cost),
    status: order ? statusKey(order) : 'queue',
    priority: order ? priorityKey(order) : 'normal',
    payment: order ? paymentKey(order) : 'none',
    deadline: order?.deadline?.slice(0, 10) ?? '',
    orderedAt: order ? orderDayOf(order) : todayDay(),
    prepaid: moneyInput(order?.prepaid_amount),
    bricks: order?.brick_limit ? String(order.brick_limit) : '',
    soldAt: order?.sold_at?.slice(0, 10) ?? '',
    soldPrice: moneyInput(order?.sold_price),
  }
}

const photoSignature = (photos: PhotoItem[]) => photos.map((p) => p.url ?? p.key).join('|')

type Props = {
  order: Order | null
  number?: number
  onSaved: (order: Order, created: boolean) => void
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
  /** Знакомые ники — подсказка при вводе */
  nicks?: string[]
}

export default function OrderEditor({ order, number, onSaved, onCancel, onDirtyChange, nicks = [] }: Props) {
  const toast = useToast()
  const [start] = useState(() => initialForm(order))
  const [form, setForm] = useState<Form>(start)
  const [startPhotos] = useState(() => photosFromUrls(order ? imagesOf(order) : []))
  const [photos, setPhotos] = useState<PhotoItem[]>(startPhotos)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const [today] = useState(() => todayDay())

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(start) || photoSignature(photos) !== photoSignature(startPhotos),
    [form, start, photos, startPhotos],
  )
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  useEffect(() => { if (!order) titleRef.current?.focus() }, [order])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError('')
  }

  const submit = async () => {
    if (saving) return
    const title = form.title.trim()
    if (!title) { setError('Укажите, что строим'); titleRef.current?.focus(); return }
    const nick = form.nick.trim()
    if (nick.length > MAX_NICK) { setError(`Ник слишком длинный — максимум ${MAX_NICK} символов`); return }
    const cost = parseCost(form.cost)
    if (cost !== null && !Number.isFinite(cost)) { setError('Цена: например 1500, 1 500 или 99,90'); return }
    if (cost !== null && cost > MAX_COST) { setError('Цена подозрительно большая — проверьте нули'); return }
    const dateName = form.kind === 'sale' ? 'Дата начала' : 'Дата заказа'
    if (!parseDay(form.orderedAt)) { setError(`Укажите: ${dateName.toLowerCase()}`); return }
    if (form.orderedAt > today) { setError(`${dateName} не может быть в будущем`); return }
    if (form.deadline && !parseDay(form.deadline)) { setError('Дедлайн: неверная дата'); return }
    if (form.deadline && form.deadline < form.orderedAt) { setError(`Дедлайн раньше, чем ${dateName.toLowerCase()}`); return }

    const sale = form.kind === 'sale'
    const usePrepaid = !sale && form.payment === 'prepaid'
    const prepaid = usePrepaid ? parseCost(form.prepaid) : null
    if (prepaid !== null && !Number.isFinite(prepaid)) { setError('Предоплата: например 500 или 1 000'); return }
    if (prepaid !== null && cost !== null && prepaid > cost) { setError('Предоплата больше цены заказа'); return }
    if (prepaid !== null && prepaid > MAX_COST) { setError('Предоплата подозрительно большая — проверьте нули'); return }

    const brickLimit = parseBricks(form.bricks)
    if (brickLimit !== null && (!Number.isFinite(brickLimit) || brickLimit < 1)) { setError('Лимит бриков: целое число, например 2 300'); return }
    if (brickLimit !== null && brickLimit > MAX_BRICKS) { setError('Лимит бриков слишком большой — проверьте нули'); return }

    const soldAt = sale && form.soldAt ? form.soldAt : null
    if (soldAt && !parseDay(soldAt)) { setError('Дата продажи: неверная дата'); return }
    if (soldAt && soldAt > today) { setError('Дата продажи не может быть в будущем'); return }
    if (soldAt && soldAt < form.orderedAt) { setError('Дата продажи раньше, чем начали строить'); return }
    const soldPrice = soldAt ? parseCost(form.soldPrice) : null
    if (soldPrice !== null && !Number.isFinite(soldPrice)) { setError('Продали за: например 1500 или 1 500'); return }
    if (soldPrice !== null && soldPrice > MAX_COST) { setError('Цена продажи подозрительно большая — проверьте нули'); return }

    setSaving(true)
    setError('')
    try {
      const saved = await saveOrder(
        order,
        {
          title,
          client_nick: nick || null,
          description: form.description.trim() || null,
          cost,
          status: STATUS[form.status].value,
          priority: PRIORITY[form.priority].value,
          payment: PAYMENT[form.payment].value,
          kind: KIND[form.kind].value,
          deadline: form.deadline || null,
          ordered_at: form.orderedAt,
          prepaid_amount: prepaid,
          brick_limit: brickLimit,
          sold_at: soldAt,
          sold_price: soldPrice,
        },
        photos,
      )
      onDirtyChange(false)
      onSaved(saved, !order)
    } catch (e) {
      const message = errorText(e)
      setError(message)
      toast(`Не сохранилось: ${message}`, 'error')
      setSaving(false)
    }
  }

  const newPhotos = photos.filter((p) => p.file).length
  const isOld = !!form.orderedAt && form.orderedAt < today
  const sale = form.kind === 'sale'
  const costValue = parseCost(form.cost)
  const prepaidValue = parseCost(form.prepaid)
  const prepaidHint =
    costValue !== null && Number.isFinite(costValue) && prepaidValue !== null && Number.isFinite(prepaidValue) && prepaidValue <= costValue
      ? `из ${money(costValue)} · осталось ${money(Math.round((costValue - prepaidValue) * 100) / 100)}`
      : costValue !== null && Number.isFinite(costValue)
      ? `из ${money(costValue)}`
      : 'Сколько клиент уже перевёл.'
  const nickOptions = nicks.filter((n) => n !== form.nick)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit() }}
      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit() } }}
      className="cs-slide mx-auto max-w-3xl space-y-6 px-5 pt-6 sm:px-8 sm:pt-8"
      aria-label={order ? 'Правка заказа' : 'Новый заказ'}
    >
      <div>
        <p className="cs-label">{order ? `Правка · #${pad(number ?? 0)}` : sale ? 'Новая вещь на продажу' : 'Новый заказ'}</p>
        <input
          ref={titleRef}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Что строим?"
          aria-label="Название"
          maxLength={200}
          className="font-display mt-2 w-full border-b border-(--line) bg-transparent pb-2 text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold outline-none transition placeholder:text-(--muted)/50 focus:border-(--amber)"
        />
      </div>

      <div>
        <p className="cs-label mb-2">Для кого</p>
        <Segment
          label="Для кого"
          value={form.kind}
          onChange={(k) => set('kind', k)}
          options={KIND_KEYS.map((k) => ({ key: k, label: KIND[k].label, dot: k === 'sale' ? 'var(--sale)' : 'var(--amber)' }))}
        />
        <p className="mt-1.5 text-[12.5px] leading-snug text-(--muted)">
          {sale
            ? 'Строим сами, чтобы продать. В статистику заказов не попадает.'
            : 'Обычный заказ от клиента — учитывается в статистике.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr_1fr]">
        <label className="block">
          <span className="cs-label">{sale ? 'Покупатель' : 'Ник клиента'}</span>
          <input
            value={form.nick}
            onChange={(e) => set('nick', e.target.value)}
            placeholder={sale ? 'если уже купили — ник' : 'например, Kirill_228'}
            maxLength={MAX_NICK}
            autoComplete="off"
            spellCheck={false}
            list={nickOptions.length ? 'known-nicks' : undefined}
            className="cs-field mt-2 text-[15px]"
          />
          {nickOptions.length > 0 && (
            <datalist id="known-nicks">
              {nickOptions.map((n) => <option key={n} value={n} />)}
            </datalist>
          )}
        </label>
        <label className="block">
          <span className="cs-label">{sale ? 'Цена продажи, ₽' : 'Цена, ₽'}</span>
          <input
            value={form.cost}
            onChange={(e) => set('cost', e.target.value)}
            inputMode="decimal"
            placeholder="1 500"
            autoComplete="off"
            className="cs-field font-mono-ui mt-2 text-[15px]"
          />
        </label>
        <label className="block">
          <span className="cs-label">Лимит бриков</span>
          <input
            value={form.bricks}
            onChange={(e) => set('bricks', e.target.value)}
            inputMode="numeric"
            placeholder="2 300"
            autoComplete="off"
            className="cs-field font-mono-ui mt-2 text-[15px]"
          />
        </label>
      </div>

      <label className="block">
        <span className="cs-label">{sale ? 'Описание' : 'ТЗ клиента'}</span>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={7}
          placeholder={sale ? '• что за постройка, чем хороша\n• особенности' : '• рабочие двери\n• покраска в цвета клуба\nпункты с «•», «-» или «1.» станут чек-листом, ссылки — кликабельными'}
          className="cs-field mt-2 resize-y text-[15px] leading-relaxed"
        />
      </label>

      <PhotoEditor photos={photos} onChange={(p) => { setPhotos(p); setError('') }} onError={(m) => toast(m, 'error')} disabled={saving} />

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="cs-label mb-2">Статус</p>
          <Segment
            label="Статус"
            value={form.status}
            onChange={(k) => set('status', k)}
            options={STATUS_KEYS.map((k) => ({ key: k, label: STATUS[k].label, dot: STATUS[k].color }))}
            columns="grid-cols-2 sm:grid-cols-4"
          />
        </div>
        <div>
          <p className="cs-label mb-2">Приоритет</p>
          <Segment
            label="Приоритет"
            value={form.priority}
            onChange={(k) => set('priority', k)}
            options={PRIORITY_KEYS.map((k) => ({ key: k, label: PRIORITY[k].label, dot: k === 'high' ? 'var(--red)' : undefined }))}
          />
        </div>
      </div>

      {!sale && (
        <div>
          <p className="cs-label mb-2">Оплата</p>
          <Segment
            label="Оплата"
            value={form.payment}
            onChange={(k) => set('payment', k)}
            options={PAYMENT_KEYS.map((k) => ({ key: k, label: PAYMENT[k].label, dot: paymentColor(k) }))}
          />
          {form.payment === 'prepaid' && (
            <label className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="cs-label">Сумма предоплаты, ₽</span>
              <input
                value={form.prepaid}
                onChange={(e) => set('prepaid', e.target.value)}
                inputMode="decimal"
                placeholder="500"
                autoComplete="off"
                className="cs-field font-mono-ui w-36 py-2 text-[15px]"
              />
              <span className="text-[12.5px] text-(--muted)">{prepaidHint}</span>
            </label>
          )}
        </div>
      )}

      {sale && (
        <div>
          <p className="cs-label mb-2">Продажа</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sold-at" className="text-[13px] text-(--muted)">Дата продажи</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="sold-at"
                  type="date"
                  value={form.soldAt}
                  min={form.orderedAt || undefined}
                  max={today}
                  onChange={(e) => set('soldAt', e.target.value)}
                  className={`cs-field font-mono-ui text-[15px] ${form.soldAt ? '' : 'text-(--muted)'}`}
                />
                {form.soldAt ? (
                  <button type="button" onClick={() => set('soldAt', '')} className="cs-btn shrink-0 border border-(--line) px-3 text-[13px] font-normal text-(--muted) hover:text-(--text)">
                    В продаже
                  </button>
                ) : (
                  <button type="button" onClick={() => set('soldAt', today)} className="cs-btn shrink-0 border border-(--sale)/60 px-3 text-[13px] font-normal text-(--sale) hover:bg-(--sale)/10">
                    Сегодня
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-(--muted)">{form.soldAt ? 'Продано — попадёт в статистику продаж.' : 'Пусто — ещё в продаже.'}</p>
            </div>
            {form.soldAt && (
              <label className="block">
                <span className="text-[13px] text-(--muted)">Продали за, ₽</span>
                <input
                  value={form.soldPrice}
                  onChange={(e) => set('soldPrice', e.target.value)}
                  inputMode="decimal"
                  placeholder={form.cost || '1 500'}
                  autoComplete="off"
                  className="cs-field font-mono-ui mt-1.5 text-[15px]"
                />
                <span className="mt-1.5 block text-[12.5px] leading-snug text-(--muted)">Пусто — по цене продажи.</span>
              </label>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block">
            <span className="cs-label">{sale ? 'Начали строить' : 'Дата заказа'}</span>
            <input
              type="date"
              value={form.orderedAt}
              max={today}
              required
              onChange={(e) => set('orderedAt', e.target.value)}
              className="cs-field font-mono-ui mt-2 text-[15px]"
            />
          </label>
          <p className="mt-1.5 text-[12.5px] leading-snug text-(--muted)">
            {sale
              ? 'По этой дате считается номер записи.'
              : isOld
              ? 'Старый заказ: номер и место в очереди считаются по этой дате.'
              : 'Добавляете старый заказ? Поставьте день, когда его заказали.'}
          </p>
        </div>
        <div>
          <label htmlFor="deadline" className="cs-label">Дедлайн</label>
          <div className="mt-2 flex gap-2">
            <input
              id="deadline"
              type="date"
              value={form.deadline}
              min={form.orderedAt || undefined}
              onChange={(e) => set('deadline', e.target.value)}
              className={`cs-field font-mono-ui text-[15px] ${form.deadline ? '' : 'text-(--muted)'}`}
            />
            {form.deadline && (
              <button
                type="button"
                onClick={() => set('deadline', '')}
                className="cs-btn shrink-0 border border-(--line) px-3 text-[13px] font-normal text-(--muted) hover:text-(--text)"
              >
                Убрать
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-snug text-(--muted)">{form.deadline ? 'Покажем, сколько дней осталось.' : 'Пусто — без дедлайна.'}</p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-md border border-(--red)/50 bg-(--red)/10 px-3 py-2 text-[14px] text-(--red)">{error}</p>}

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-(--line) bg-(--bg)/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" disabled={saving} className="cs-btn bg-(--amber) px-5 py-2.5 text-black hover:bg-(--text)">
          {saving ? (newPhotos ? `Загружаем фото (${newPhotos})…` : 'Сохраняем…') : order ? 'Сохранить' : sale ? 'Добавить' : 'Добавить заказ'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="cs-btn border border-(--line) px-5 py-2.5 font-normal text-(--muted) hover:text-(--text)">
          Отмена
        </button>
        <span className="font-mono-ui hidden text-[12px] text-(--muted) md:inline">
          <span className="cs-key">Ctrl</span> + <span className="cs-key">Enter</span> — сохранить · <span className="cs-key">Esc</span> — отмена
        </span>
        {dirty && !saving && <span className="font-mono-ui ml-auto text-[12px] text-(--amber)">● есть изменения</span>}
      </div>
    </form>
  )
}
