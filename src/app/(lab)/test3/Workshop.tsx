"use client"

import { useCallback, useMemo, useState } from 'react'
import type { Order } from '@/lib/orders'
import {
  countByStatus, imagesOf, isUrgent, longDate, money, numberMap, pad, preview, requestDate,
  statusKey, titleOf, useModal, type StatusKey,
} from '@/lib/lab'
import RichText from '@/components/lab/RichText'
import LabSwitcher from '@/components/lab/LabSwitcher'

const TG = 'https://t.me/FaHaLeR'

function StatusChip({ status }: { status: StatusKey }) {
  if (status === 'work')
    return (
      <span className="ws-kicker inline-flex items-center gap-2 bg-(--sig) px-2.5 py-1 !text-black">
        <span className="ws-blink h-2 w-2 rounded-full bg-black" /> В работе
      </span>
    )
  if (status === 'done') return <span className="ws-kicker border border-(--sig) px-2.5 py-1 !text-(--sig)">Сдано</span>
  if (status === 'cancel') return <span className="ws-kicker border border-(--hot) px-2.5 py-1 !text-(--hot)">Отменён</span>
  return <span className="ws-kicker border border-(--line) px-2.5 py-1">В очереди</span>
}

function SectionHead({ index, kicker, title, extra }: { index: string; kicker: string; title: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-(--line) pb-4">
      <div>
        <p className="ws-kicker">{index} / {kicker}</p>
        <h2 className="ws-display mt-2 text-[clamp(2.4rem,6vw,4.5rem)] font-semibold">{title}</h2>
      </div>
      {extra}
    </div>
  )
}

export default function Workshop({ orders, failed }: { orders: Order[]; failed: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const numbers = useMemo(() => numberMap(orders), [orders])
  const counts = useMemo(() => countByStatus(orders), [orders])

  const done = orders.filter((o) => statusKey(o) === 'done')
  const work = orders.filter((o) => statusKey(o) === 'work')
  const queue = [...orders.filter((o) => statusKey(o) === 'queue')].reverse() // первым — кто раньше пришёл
  const featured = done.find((o) => imagesOf(o).length) ?? work.find((o) => imagesOf(o).length) ?? null
  const gallery = done.filter((o) => o !== featured)
  const prices = orders.map((o) => Number(o.cost)).filter((n) => Number.isFinite(n) && n > 0)
  const minPrice = prices.length ? Math.min(...prices) : null

  const selected = orders.find((o) => o.id === openId) ?? null
  const close = useCallback(() => setOpenId(null), [])
  const num = (o: Order) => pad(numbers.get(o.id) ?? 0)

  const copyDiscord = async () => {
    try {
      await navigator.clipboard.writeText('FaHaLeR')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* буфер обмена недоступен — ник и так виден на кнопке */
    }
  }

  return (
    <div className="pb-24">
      {/* ── Верхняя панель */}
      <header className="sticky top-0 z-40 border-b border-(--line) bg-(--bg)/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-8">
          <a href="#top" className="flex items-center gap-3">
            <span className="ws-display grid h-10 w-10 place-items-center bg-(--sig) text-xl font-bold text-black">BR</span>
            <span className="leading-tight">
              <span className="ws-display block text-lg font-semibold">BuildHub</span>
              <span className="ws-kicker block !text-[10px] !tracking-[0.3em]">мастерская</span>
            </span>
          </a>
          <nav className="ws-kicker ml-auto hidden gap-7 md:flex">
            <a href="#shop" className="transition hover:text-(--text)">В цеху</a>
            <a href="#works" className="transition hover:text-(--text)">Работы</a>
            <a href="#queue" className="transition hover:text-(--text)">Очередь</a>
          </nav>
          <a href={TG} target="_blank" rel="noopener noreferrer" className="ws-display ml-auto bg-(--sig) px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-(--text) md:ml-0">
            Заказать постройку
          </a>
        </div>
      </header>

      {/* ── Главный кадр */}
      <section id="top" className="relative isolate flex min-h-[min(86dvh,780px)] items-end overflow-hidden">
        {featured && (
          <img src={imagesOf(featured)[0]} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,var(--bg)_6%,rgba(19,17,14,.7)_45%,rgba(19,17,14,.25))]" />
        <div className="ws-grain absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-8 sm:pb-16">
          <p className="ws-kicker !text-(--sig)">
            {featured ? `${statusKey(featured) === 'done' ? 'Последняя сданная работа' : 'Сейчас в цеху'} · наряд №${num(featured)}` : 'Мастерская построек Brick Rigs'}
          </p>
          <h1 className="ws-display mt-4 max-w-5xl text-[clamp(3.2rem,11vw,9.5rem)] font-bold">
            {featured ? titleOf(featured) : 'Строим на заказ'}
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {featured && (
              <button onClick={() => setOpenId(featured.id)} className="ws-display border border-(--text) px-5 py-3 text-base font-medium transition hover:bg-(--text) hover:text-black">
                Смотреть наряд →
              </button>
            )}
            <p className="max-w-md text-[15px] leading-snug text-(--muted)">
              Копии реальной техники в Brick Rigs: автобусы, грузовики, легковые. Работаем по ТЗ, с рабочими дверями, салоном и мелочами.
            </p>
          </div>
        </div>
      </section>

      {/* ── Цифры */}
      <div className="border-y border-(--line) bg-(--panel)">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-8 md:grid-cols-4">
          {[
            ['Сдано работ', pad(counts.done, 2)],
            ['В цеху', pad(counts.work, 2)],
            ['В очереди', pad(counts.queue, 2)],
            ['Цены от', minPrice ? money(minPrice) : '—'],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`border-(--line) py-6 ${i === 0 ? 'pr-4' : 'px-4 sm:px-8'} ${i === 2 ? 'pl-0 sm:pl-0 md:pl-8' : ''} ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}
            >
              <dt className="ws-kicker">{k}</dt>
              <dd className="ws-display mt-2 text-4xl font-semibold sm:text-5xl">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {failed && <p className="ws-kicker px-4 py-20 text-center">Цех временно закрыт — не удалось загрузить заказы.</p>}

      {/* ── В цеху */}
      {work.length > 0 && (
        <section id="shop" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-20 sm:px-8">
          <SectionHead
            index="01"
            kicker="Сейчас"
            title="В цеху"
            extra={<span className="ws-kicker inline-flex items-center gap-2 !text-(--sig)"><span className="ws-blink h-2 w-2 rounded-full bg-(--sig)" />Идёт сборка</span>}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {work.map((o) => (
              <button
                key={o.id}
                onClick={() => setOpenId(o.id)}
                className="ws-card group grid overflow-hidden border border-(--line) bg-(--panel) text-left transition hover:border-(--sig) sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:min-h-[260px]">
                  {imagesOf(o)[0] && <img src={imagesOf(o)[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                  <div className="ws-hazard absolute inset-x-0 bottom-0 h-2" />
                </div>
                <div className="flex flex-col p-6">
                  <p className="ws-kicker">Наряд №{num(o)}</p>
                  <h3 className="ws-display mt-2 text-3xl font-semibold">{titleOf(o)}</h3>
                  {preview(o) && <p className="mt-3 line-clamp-3 text-[15px] text-(--muted)">{preview(o)}</p>}
                  <div className="mt-auto flex items-end justify-between pt-6">
                    <span className="ws-display text-2xl font-medium text-(--sig)">{money(o.cost) ?? 'Цена по запросу'}</span>
                    <span className="ws-kicker transition group-hover:text-(--text)">Открыть →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Готовые работы */}
      {gallery.length > 0 && (
        <section id="works" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-8">
          <SectionHead index="02" kicker="Портфолио" title="Готовые работы" />
          <div className="gap-5 sm:columns-2 lg:columns-3">
            {gallery.map((o) => {
              const img = imagesOf(o)[0]
              return (
                <button
                  key={o.id}
                  onClick={() => setOpenId(o.id)}
                  className="ws-card group relative mb-5 block w-full break-inside-avoid overflow-hidden border border-(--line) bg-(--panel) text-left"
                >
                  {img ? <img src={img} alt="" loading="lazy" className="block w-full" /> : <div className="aspect-[4/3]" />}
                  <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,.88),transparent)] p-5 pt-16">
                    <p className="ws-kicker !text-(--sig)">№{num(o)}</p>
                    <h3 className="ws-display mt-1 text-2xl font-semibold">{titleOf(o)}</h3>
                  </div>
                  <span className="absolute right-0 top-0 bg-(--sig) px-3 py-1.5 font-semibold text-black opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    {money(o.cost) ?? 'Смотреть'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Очередь */}
      {queue.length > 0 && (
        <section id="queue" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24 sm:px-8">
          <SectionHead index="03" kicker="Ждут сборки" title="Очередь" extra={<p className="ws-kicker">{queue.length} в листе ожидания</p>} />
          <ol className="border-t border-(--line)">
            {queue.map((o, i) => (
              <li key={o.id}>
                <button
                  onClick={() => setOpenId(o.id)}
                  className="ws-card group grid w-full grid-cols-[48px_72px_minmax(0,1fr)] items-center gap-4 border-b border-(--line) py-4 text-left transition hover:bg-(--panel) sm:grid-cols-[72px_96px_minmax(0,1fr)_auto] sm:gap-6 sm:pr-4"
                >
                  <span className="ws-display text-4xl font-semibold text-(--line) transition group-hover:text-(--sig) sm:text-5xl">{pad(i + 1, 2)}</span>
                  <span className="block aspect-[4/3] overflow-hidden bg-(--panel-2)">
                    {imagesOf(o)[0] && <img src={imagesOf(o)[0]} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="ws-display block truncate text-2xl font-medium">{titleOf(o)}</span>
                    <span className="block truncate text-sm text-(--muted)">{preview(o) || '—'}</span>
                    <span className="ws-display mt-1 block text-lg text-(--sig) sm:hidden">{money(o.cost) ?? 'Цена по запросу'}</span>
                  </span>
                  <span className="ws-display hidden text-2xl text-(--sig) sm:block">{money(o.cost) ?? '—'}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Призыв */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
        <div className="ws-hazard p-2">
          <div className="grid gap-8 bg-(--bg) p-8 sm:p-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="ws-kicker !text-(--sig)">Приём заказов открыт</p>
              <h2 className="ws-display mt-3 text-[clamp(2.4rem,6vw,5rem)] font-bold">Есть машина, которую хочешь в Brick Rigs?</h2>
              <p className="mt-4 max-w-xl text-(--muted)">Пришли фото и пожелания — оценим сроки и цену. Чем подробнее ТЗ, тем точнее копия.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={TG} target="_blank" rel="noopener noreferrer" className="ws-display bg-(--sig) px-6 py-4 text-center text-lg font-semibold text-black transition hover:bg-(--text)">
                Написать в Telegram
              </a>
              <button onClick={copyDiscord} className="ws-display border border-(--line) px-6 py-4 text-lg transition hover:border-(--text)">
                {copied ? 'Ник скопирован ✓' : 'Discord: FaHaLeR'}
              </button>
            </div>
          </div>
        </div>
        <p className="ws-kicker mt-10 text-center">BR BuildHub · мастерская построек Brick Rigs</p>
      </section>

      {selected && <Ticket order={selected} number={num(selected)} onClose={close} />}
      <LabSwitcher current={3} />
    </div>
  )
}

function Ticket({ order, number, onClose }: { order: Order; number: string; onClose: () => void }) {
  const imgs = imagesOf(order)
  const [active, setActive] = useState(0)
  const step = useCallback((d: number) => setActive((i) => (i + d + imgs.length) % Math.max(imgs.length, 1)), [imgs.length])
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') step(1)
    if (e.key === 'ArrowLeft') step(-1)
  }, [step])
  useModal(true, onClose, onKey)
  const st = statusKey(order)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ws-ticket-title"
      className="ws-fade fixed inset-0 z-50 overflow-y-auto bg-black/95 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:overflow-hidden"
    >
      <div className="relative flex h-[52dvh] items-center justify-center p-4 lg:h-full lg:p-10" onClick={onClose}>
        {imgs.length ? (
          <img src={imgs[active]} alt={`${titleOf(order)} — фото ${active + 1}`} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="ws-kicker">Фото не приложены</p>
        )}
        {imgs.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="Предыдущее фото" className="ws-display absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border border-(--line) bg-black/60 text-2xl transition hover:border-(--sig) hover:text-(--sig)">←</button>
            <button onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="Следующее фото" className="ws-display absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border border-(--line) bg-black/60 text-2xl transition hover:border-(--sig) hover:text-(--sig)">→</button>
            <span className="ws-kicker absolute bottom-4 left-1/2 -translate-x-1/2">{active + 1} / {imgs.length}</span>
          </>
        )}
      </div>

      <aside className="relative border-t border-(--line) bg-(--panel) lg:overflow-y-auto lg:border-l lg:border-t-0">
        {st === 'work' && <div className="ws-hazard h-2" />}
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="ws-kicker">Наряд №{number}</p>
            <button autoFocus onClick={onClose} className="ws-kicker -mr-2 -mt-2 px-2 py-2 transition hover:text-(--text)">Закрыть ✕</button>
          </div>
          <h2 id="ws-ticket-title" className="ws-display mt-4 text-5xl font-bold">{titleOf(order)}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <StatusChip status={st} />
            {isUrgent(order) && <span className="ws-kicker bg-(--hot) px-2.5 py-1 !text-black">Срочно</span>}
          </div>
          <p className="ws-display mt-8 text-4xl font-medium text-(--sig)">{money(order.cost) ?? 'Цена по запросу'}</p>
          {order.description && (
            <div className="mt-8 border-t border-(--line) pt-6">
              <p className="ws-kicker mb-3">Техзадание</p>
              <RichText text={order.description} className="text-[15px] leading-relaxed text-(--text)/85" linkClassName="text-(--sig) underline underline-offset-4" />
            </div>
          )}
          <dl className="mt-8 grid grid-cols-2 border-t border-(--line) pt-6 text-sm">
            <div>
              <dt className="ws-kicker">Заявка</dt>
              <dd className="mt-1">{requestDate(order) ?? '—'}</dd>
            </div>
            <div>
              <dt className="ws-kicker">Внесён</dt>
              <dd className="mt-1">{longDate(order.created_at)}</dd>
            </div>
          </dl>
          <a href={TG} target="_blank" rel="noopener noreferrer" className="ws-display mt-10 block bg-(--sig) px-5 py-4 text-center text-lg font-semibold text-black transition hover:bg-(--text)">
            Хочу похожую постройку
          </a>
        </div>
      </aside>
    </div>
  )
}
