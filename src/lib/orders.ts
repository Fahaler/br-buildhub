// Единое место для заказов: типы, статусы, оплата, форматирование.
// Значения в базе — русские слова в нижнем регистре (как и раньше).

export type Order = {
  id: string
  title: string | null
  description: string | null
  cost: number | null
  status: string | null
  priority: string | null
  client_nick?: string | null
  /** Дата в формате YYYY-MM-DD или null — дедлайна нет */
  deadline?: string | null
  /** Когда клиент сделал заказ (YYYY-MM-DD). Для старых заказов ставится вручную */
  ordered_at?: string | null
  payment?: string | null
  /** 'заказ' — для клиента, 'продажа' — строим сами на продажу (не входит в статистику) */
  kind?: string | null
  /** Сколько внесли предоплатой (₽) — когда payment = 'предоплата' */
  prepaid_amount?: number | null
  /** Вещь на продажу: когда продали (YYYY-MM-DD). Пусто — ещё в продаже */
  sold_at?: string | null
  /** За сколько продали. Пусто — по цене из карточки (cost) */
  sold_price?: number | null
  /** Лимит бриков постройки */
  brick_limit?: number | null
  /** Ссылки на фото по порядку, первое — обложка */
  images?: string[] | null
  /** Старые поля (до 003-notebook-fields.sql) — только для чтения */
  image_url?: string | null
  image_url_2?: string | null
  created_at: string
}

export const MAX_PHOTOS = 8
export const MAX_NICK = 64
/** Максимальная цена, которую разрешаем ввести (защита от опечаток вроде лишних нулей). */
export const MAX_COST = 100_000_000

// ── Статус ──────────────────────────────────────────────────────────────────────
export type StatusKey = 'queue' | 'work' | 'done' | 'cancel'
export const STATUS_KEYS: StatusKey[] = ['queue', 'work', 'done', 'cancel']
export const STATUS: Record<StatusKey, { value: string; label: string; color: string }> = {
  queue: { value: 'в очереди', label: 'Очередь', color: 'var(--idle)' },
  work: { value: 'в процессе', label: 'В работе', color: 'var(--amber)' },
  done: { value: 'готов', label: 'Готово', color: 'var(--green)' },
  cancel: { value: 'отмена', label: 'Отмена', color: 'var(--red)' },
}
export function statusKey(o: Pick<Order, 'status'>): StatusKey {
  const v = o.status?.trim().toLowerCase()
  return STATUS_KEYS.find((k) => STATUS[k].value === v) ?? 'queue'
}

// ── Оплата ──────────────────────────────────────────────────────────────────────
export type PaymentKey = 'none' | 'prepaid' | 'paid'
export const PAYMENT_KEYS: PaymentKey[] = ['none', 'prepaid', 'paid']
export const PAYMENT: Record<PaymentKey, { value: string; label: string }> = {
  none: { value: 'нет', label: 'Не оплачено' },
  prepaid: { value: 'предоплата', label: 'Предоплата' },
  paid: { value: 'оплачено', label: 'Оплачено' },
}
export function paymentKey(o: Pick<Order, 'payment'>): PaymentKey {
  const v = o.payment?.trim().toLowerCase()
  return PAYMENT_KEYS.find((k) => PAYMENT[k].value === v) ?? 'none'
}

// ── Приоритет ───────────────────────────────────────────────────────────────────
export type PriorityKey = 'low' | 'normal' | 'high'
export const PRIORITY_KEYS: PriorityKey[] = ['low', 'normal', 'high']
export const PRIORITY: Record<PriorityKey, { value: string; label: string }> = {
  low: { value: 'низкий', label: 'Низкий' },
  normal: { value: 'обычный', label: 'Обычный' },
  high: { value: 'высокий', label: 'Срочно' },
}
export function priorityKey(o: Pick<Order, 'priority'>): PriorityKey {
  const v = o.priority?.trim().toLowerCase()
  return PRIORITY_KEYS.find((k) => PRIORITY[k].value === v) ?? 'normal'
}
export const isUrgent = (o: Order) => priorityKey(o) === 'high'

// ── Тип: заказ клиента или вещь на продажу ─────────────────────────────────────
export type KindKey = 'order' | 'sale'
export const KIND_KEYS: KindKey[] = ['order', 'sale']
export const KIND: Record<KindKey, { value: string; label: string }> = {
  order: { value: 'заказ', label: 'Заказ клиента' },
  sale: { value: 'продажа', label: 'На продажу' },
}
export function kindKey(o: Pick<Order, 'kind'>): KindKey {
  return o.kind?.trim().toLowerCase() === KIND.sale.value ? 'sale' : 'order'
}
export const isForSale = (o: Pick<Order, 'kind'>) => kindKey(o) === 'sale'

// ── Деньги ──────────────────────────────────────────────────────────────────────
const round2 = (n: number) => Math.round(n * 100) / 100

/** Число из базы (numeric может прийти строкой) или null. */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Вещь на продажу уже продана. */
export const isSold = (o: Order) => isForSale(o) && !!parseDay(o.sold_at)
/** Цена, за которую продали (или цена из карточки). */
export const soldPriceOf = (o: Order) => num(o.sold_price) ?? num(o.cost)
/** День продажи (YYYY-MM-DD) или null. */
export const soldDayOf = (o: Order) => (isSold(o) ? (o.sold_at as string).slice(0, 10) : null)

/** Сколько денег уже получили по записи. */
export function receivedOf(o: Order): number {
  if (isForSale(o)) return isSold(o) ? soldPriceOf(o) ?? 0 : 0
  if (statusKey(o) === 'cancel') return 0
  const cost = num(o.cost)
  const pay = paymentKey(o)
  if (pay === 'paid') return cost ?? 0
  if (pay === 'prepaid') {
    const pre = num(o.prepaid_amount) ?? 0
    return cost === null ? pre : Math.min(pre, cost)
  }
  return 0
}

/** Сколько клиент ещё должен (отменённые и вещи на продажу — 0). */
export function owedOf(o: Order): number {
  if (isForSale(o) || statusKey(o) === 'cancel') return 0
  const cost = num(o.cost)
  if (cost === null) return 0
  return round2(Math.max(0, cost - receivedOf(o)))
}

// ── Статистика (только заказы клиентов, без вещей на продажу) ──────────────────
export type Stats = {
  count: number
  sum: number
  doneCount: number
  doneSum: number
  byStatus: Record<StatusKey, { count: number; sum: number }>
  /** Заказы без цены — в суммы не попали */
  noPrice: number
  /** Сколько вещей на продажу не учтено */
  forSale: number
  /** Уже получено денег (без отменённых) */
  received: number
  /** Ещё должны получить (без отменённых) */
  owed: number
  /** Готовые, но оплаченные не полностью */
  doneDebt: { count: number; sum: number }
  /** Предоплата отмечена, но сумма не записана */
  prepaidNoAmount: number
}

export function orderStats(orders: Order[]): Stats {
  const byStatus = Object.fromEntries(STATUS_KEYS.map((k) => [k, { count: 0, sum: 0 }])) as Stats['byStatus']
  let noPrice = 0
  let forSale = 0
  let received = 0
  let owed = 0
  let prepaidNoAmount = 0
  const doneDebt = { count: 0, sum: 0 }
  for (const o of orders) {
    if (isForSale(o)) { forSale++; continue }
    received += receivedOf(o)
    const debt = owedOf(o)
    owed += debt
    if (debt > 0 && statusKey(o) === 'done') { doneDebt.count++; doneDebt.sum = round2(doneDebt.sum + debt) }
    if (paymentKey(o) === 'prepaid' && statusKey(o) !== 'cancel' && num(o.prepaid_amount) === null) prepaidNoAmount++
    const cost = Number(o.cost)
    const has = o.cost !== null && o.cost !== undefined && Number.isFinite(cost)
    if (!has) noPrice++
    const b = byStatus[statusKey(o)]
    b.count++
    if (has) b.sum = Math.round((b.sum + cost) * 100) / 100
  }
  const count = STATUS_KEYS.reduce((n, k) => n + byStatus[k].count, 0)
  const sum = Math.round(STATUS_KEYS.reduce((n, k) => n + byStatus[k].sum, 0) * 100) / 100
  return {
    count, sum, doneCount: byStatus.done.count, doneSum: byStatus.done.sum, byStatus, noPrice, forSale,
    received: round2(received), owed: round2(owed), doneDebt, prepaidNoAmount,
  }
}

/** Вещи на продажу: что лежит в продаже (сейчас) и что продано (с фильтром по дню продажи). */
export function saleStats(orders: Order[], soldIn: (day: string) => boolean = () => true) {
  const inStock = { count: 0, sum: 0 }
  const sold = { count: 0, sum: 0 }
  for (const o of orders) {
    if (!isForSale(o)) continue
    const day = soldDayOf(o)
    if (day) {
      if (!soldIn(day)) continue
      sold.count++
      sold.sum = round2(sold.sum + (soldPriceOf(o) ?? 0))
    } else if (statusKey(o) !== 'cancel') {
      inStock.count++
      inStock.sum = round2(inStock.sum + (num(o.cost) ?? 0))
    }
  }
  return { inStock, sold }
}

// ── Периоды и месяцы ───────────────────────────────────────────────────────────
/** 'all' | 'year' | 'month' | 'prev' | конкретный месяц 'YYYY-MM' */
export type Period = string
export const PERIODS: { key: Period; label: string }[] = [
  { key: 'all', label: 'Всё время' },
  { key: 'year', label: 'Этот год' },
  { key: 'month', label: 'Этот месяц' },
  { key: 'prev', label: 'Прошлый месяц' },
]

/** 'YYYY-MM' для даты; shift — сдвиг в месяцах. */
export function monthOf(d: Date, shift = 0) {
  const x = new Date(d.getFullYear(), d.getMonth() + shift, 1)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
}

/** Проверка «день YYYY-MM-DD входит в период». Пока нет «сегодня» (сервер) — только «всё время». */
export function periodTest(period: Period, today: Date | null): (day: string) => boolean {
  if (period === 'all') return () => true
  if (/^\d{4}-\d{2}$/.test(period)) return (day) => day.startsWith(period)
  if (!today) return () => true
  if (period === 'year') { const y = String(today.getFullYear()); return (day) => day.startsWith(y) }
  const m = monthOf(today, period === 'prev' ? -1 : 0)
  return (day) => day.startsWith(m)
}

/** «март 2026» / «мар» для 'YYYY-MM'. */
export function monthLabel(month: string, short = false) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  if (short) return d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(/\s*г\.?$/, '')
}

// ── Клиенты ─────────────────────────────────────────────────────────────────────
export const nickKey = (nick: string | null | undefined) => nick?.trim().toLowerCase() || null

export type ClientSummary = {
  key: string
  nick: string
  /** Все записи клиента: заказы и покупки, свежие сверху */
  orders: Order[]
  /** Заказы (без отменённых) + покупки */
  count: number
  /** Из них покупок готовых вещей */
  purchases: number
  total: number
  received: number
  owed: number
}

/** День, по которому запись попадает в период: заказ — дата заказа, покупка — дата продажи. */
export function clientDayOf(o: Order): string | null {
  return isForSale(o) ? soldDayOf(o) : orderDayOf(o)
}

/** Сводка по клиентам. inPeriod — какие записи считать в суммах (список заказов — всегда полный). */
export function clientSummaries(orders: Order[], inPeriod: (day: string) => boolean = () => true): ClientSummary[] {
  const map = new Map<string, ClientSummary>()
  const sorted = [...orders].sort((a, b) => byOrderDay(b, a))
  for (const o of sorted) {
    const key = nickKey(o.client_nick)
    if (!key) continue
    let c = map.get(key)
    if (!c) { c = { key, nick: o.client_nick!.trim(), orders: [], count: 0, purchases: 0, total: 0, received: 0, owed: 0 }; map.set(key, c) }
    c.orders.push(o)
    const day = clientDayOf(o)
    if (!day || !inPeriod(day)) continue
    if (isForSale(o)) {
      c.count++
      c.purchases++
      c.total = round2(c.total + (soldPriceOf(o) ?? 0))
    } else if (statusKey(o) !== 'cancel') {
      c.count++
      c.total = round2(c.total + (num(o.cost) ?? 0))
    }
    c.received = round2(c.received + receivedOf(o))
    c.owed = round2(c.owed + owedOf(o))
  }
  return [...map.values()]
}

/** Ники для подсказки в форме: сначала те, у кого больше заказов. */
export function knownNicks(orders: Order[]): string[] {
  return clientSummaries(orders)
    .sort((a, b) => b.orders.length - a.orders.length || a.nick.localeCompare(b.nick))
    .map((c) => c.nick)
}

// ── Лимит бриков ────────────────────────────────────────────────────────────────
export const MAX_BRICKS = 10_000_000

/** «2 300», «2300», «2.300» → 2300. Пусто → null, мусор → NaN. */
export function parseBricks(input: string): number | null {
  const s = input.replace(/[\s\u00a0\u202f'.,]/g, '').replace(/(бриков|брик|шт\.?)$/i, '')
  if (s === '') return null
  return /^\d+$/.test(s) ? Number(s) : NaN
}

export function bricks(n: number | null | undefined) {
  const v = num(n)
  return v === null ? null : new Intl.NumberFormat('ru-RU').format(v)
}

// ── Фото, названия, номера ──────────────────────────────────────────────────────
export function imagesOf(o: Order): string[] {
  if (Array.isArray(o.images) && o.images.length) return o.images.filter(Boolean)
  return [o.image_url, o.image_url_2].filter((u): u is string => !!u)
}

export function titleOf(o: Order) {
  return o.title?.trim() || 'Без названия'
}

/** Сравнение по дате заказа: старые раньше. */
export function byOrderDay(a: Order, b: Order) {
  return orderDayOf(a).localeCompare(orderDayOf(b)) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
}

/** Порядковый номер заказа по дате заказа: самый старый — №1. */
export function numberMap(orders: Order[]) {
  const sorted = [...orders].sort(byOrderDay)
  return new Map(sorted.map((o, i) => [o.id, i + 1]))
}

export const pad = (n: number, len = 3) => String(n).padStart(len, '0')

const REQUEST_DATE = /\*?\s*от:?\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})/i

/** Сегодняшняя дата в формате YYYY-MM-DD (по местному времени). */
export function todayDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Старый способ: дата заказа, записанная в описании («*От: 05.11.26»). */
function dayFromDescription(o: Order): string | null {
  const m = o.description?.match(REQUEST_DATE)
  if (!m) return null
  const year = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** Дата заказа (YYYY-MM-DD): поле ordered_at → дата из описания → день, когда внесли в блокнот. */
export function orderDayOf(o: Order): string {
  if (o.ordered_at && parseDay(o.ordered_at)) return o.ordered_at.slice(0, 10)
  const fromText = dayFromDescription(o)
  if (fromText && parseDay(fromText)) return fromText
  return createdDay(o.created_at)
}

/**
 * Время внесения в блокнот показываем по Москве — одинаково на сервере и в браузере,
 * иначе около полуночи дата «прыгала» бы между часовыми поясами.
 */
const TZ = 'Europe/Moscow'
const isoDayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

function createdDay(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '0000-00-00' : isoDayFormat.format(d)
}

/** Описание без служебной строки «*От: 05.11.26» — дата теперь хранится отдельно. */
export function cleanDescription(text: string | null | undefined): string {
  return (text ?? '')
    .split('\n')
    .filter((l) => !/^\s*\*?\s*от:?\s*\d{1,2}\.\d{1,2}\.\d{2,4}\s*$/i.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Короткий текст для списка: без служебных строк, ссылок, маркеров и пустых заголовков. */
export function preview(o: Order): string {
  return (o.description ?? '')
    .split('\n')
    .map((l) => l.trim().replace(/^(?:✓\s*)?(?:[•\-–—]|\*(?!\s*от))?\s*/i, ''))
    .filter((l) => l && !REQUEST_DATE.test(l) && !/^https?:\/\//.test(l) && !/^(тз|пожелание)[^:]*:$/i.test(l))
    .join(' · ')
}

// ── Форматирование ──────────────────────────────────────────────────────────────
const moneyFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

export function money(cost: number | null | undefined) {
  if (cost === null || cost === undefined || !Number.isFinite(Number(cost))) return null
  return `${moneyFormat.format(Number(cost))} ₽`
}

export function shortDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function longDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
}

/** «05.11.26» для даты YYYY-MM-DD. */
export function shortDay(value: string | null | undefined) {
  const d = parseDay(value)
  return d ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
}

// ── Дедлайн ─────────────────────────────────────────────────────────────────────
/** «14 ноября 2026» для даты YYYY-MM-DD. */
export function dayLabel(value: string | null | undefined, withYear = true) {
  const d = parseDay(value)
  if (!d) return '—'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) })
}

export type DeadlineInfo = { label: string; date: string; tone: 'late' | 'today' | 'soon' | 'ok' }

/** Разбирает «YYYY-MM-DD» как дату в местном времени (без сдвига часового пояса). */
export function parseDay(value: string | null | undefined): Date | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function deadlineInfo(value: string | null | undefined, now = new Date()): DeadlineInfo | null {
  const d = parseDay(value)
  if (!d) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  const date = d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
  if (days < 0) return { label: `просрочен на ${-days} дн.`, date, tone: 'late' }
  if (days === 0) return { label: 'сегодня', date, tone: 'today' }
  if (days === 1) return { label: 'завтра', date, tone: 'soon' }
  return { label: `через ${days} дн.`, date, tone: days <= 3 ? 'soon' : 'ok' }
}

const THOUSANDS_GROUPS = /^\d{1,3}$/

/** Проверяет, что части похожи на группы разрядов: «1», «500», «000»… */
function isThousandsGroups(parts: string[]) {
  return (
    parts.length > 1 &&
    THOUSANDS_GROUPS.test(parts[0]) &&
    parts[0] !== '0' &&
    parts.slice(1).every((p) => /^\d{3}$/.test(p))
  )
}

/**
 * Разбирает цену из поля ввода. Пусто → null, мусор → NaN.
 *
 * '1500', '1 500', '1.500', '1,500', '1 500 ₽' → 1500
 * '1,5', '1.5', '99,90'                       → 1.5 / 1.5 / 99.9
 * '1.500,50', '1,500.50'                      → 1500.5
 *
 * Одиночный разделитель, после которого ровно три цифры, считается разделителем
 * тысяч (цены в копейках с тремя знаками не бывают). Результат округляется до копеек.
 */
export function parseCost(input: string): number | null {
  const s = input
    .replace(/[\s\u00a0\u202f']/g, '')
    .replace(/(₽|руб\.?|р\.?)$/i, '')
  if (s === '') return null
  if (!/^\d[\d.,]*$/.test(s)) return NaN

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  let integer: string
  let fraction = ''

  if (lastDot !== -1 && lastComma !== -1) {
    // Есть оба знака: последний — дробная часть, другой — разделитель тысяч
    const decimalAt = Math.max(lastDot, lastComma)
    const groupSep = decimalAt === lastDot ? ',' : '.'
    const head = s.slice(0, decimalAt)
    fraction = s.slice(decimalAt + 1)
    if (head.includes(s[decimalAt]) || !isThousandsGroups(head.split(groupSep))) return NaN
    integer = head.split(groupSep).join('')
  } else if (lastDot !== -1 || lastComma !== -1) {
    const parts = s.split(lastDot !== -1 ? '.' : ',')
    if (isThousandsGroups(parts)) {
      integer = parts.join('')
    } else if (parts.length === 2 && parts[0] !== '' && parts[1] !== '') {
      integer = parts[0]
      fraction = parts[1]
    } else {
      return NaN
    }
  } else {
    integer = s
  }

  if (!/^\d+$/.test(integer) || !/^\d*$/.test(fraction)) return NaN
  const n = Number(fraction ? `${integer}.${fraction}` : integer)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

