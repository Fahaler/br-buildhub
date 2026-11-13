"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseBrowserClient'
import { useAuth } from '@/components/AuthProvider'
import { STATUSES, formatCost, formatDate, getPriority, getStatus, type Order } from '@/lib/orders'

type Filter = 'все' | (typeof STATUSES)[number]['value']

export default function Home() {
  const { loading: authLoading, userId, isAdmin, signOut } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filterStatus, setFilterStatus] = useState<Filter>('все')
  const [searchQuery, setSearchQuery] = useState('')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Ошибка загрузки заказов:', error)
      setLoadError(true)
    } else {
      setOrders((data ?? []) as Order[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(loadOrders, 0)
    return () => clearTimeout(t)
  }, [loadOrders])

  const counts = useMemo(() => {
    const c: Record<string, number> = { все: orders.length }
    for (const s of STATUSES) c[s.value] = orders.filter((o) => getStatus(o.status)?.value === s.value).length
    return c
  }, [orders])

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesStatus = filterStatus === 'все' || getStatus(order.status)?.value === filterStatus
      const matchesSearch =
        q === '' ||
        (order.title ?? '').toLowerCase().includes(q) ||
        (order.description ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [orders, filterStatus, searchQuery])

  return (
    <div className="mx-auto max-w-7xl">
      {/* Поиск + кнопки */}
      <div className="mb-6 flex flex-col items-stretch gap-4 border-b border-gray-800 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-96">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden>🔍</span>
          <input
            type="search"
            aria-label="Поиск заказов"
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-white transition focus:border-blue-500 focus:outline-none"
          />
        </div>

        {!authLoading && (
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/new-order" className="flex-1 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white transition hover:bg-blue-500 md:flex-none">
                + Новый заказ
              </Link>
            )}
            {userId ? (
              <button
                onClick={signOut}
                className="whitespace-nowrap rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
              >
                Выйти
              </button>
            ) : (
              <Link href="/login" className="whitespace-nowrap rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-medium text-white transition hover:bg-gray-700">
                Войти (Админ)
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Фильтры по статусу */}
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {(['все', ...STATUSES.map((s) => s.value)] as Filter[]).map((value) => {
          const meta = getStatus(value)
          const isActive = filterStatus === value
          const activeClass = isActive
            ? meta?.active ?? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          return (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              aria-pressed={isActive}
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 font-medium transition ${activeClass}`}
            >
              {meta?.label ?? 'Все'} ({counts[value] ?? 0})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="animate-pulse text-lg text-gray-400">Загрузка заказов…</p>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 py-16 text-center">
          <p className="mb-4 text-red-200">Не удалось загрузить заказы.</p>
          <button onClick={loadOrders} className="rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-700">
            Повторить
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900 py-20 text-center">
          <p className="text-lg text-gray-400">
            {searchQuery.trim()
              ? 'Ничего не найдено по запросу.'
              : filterStatus === 'все'
                ? 'Заказов пока нет.'
                : `Нет заказов со статусом «${getStatus(filterStatus)?.label}».`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const status = getStatus(order.status)
  const priority = getPriority(order.priority)
  const images = [order.image_url, order.image_url_2].filter((u): u is string => !!u)
  const title = order.title?.trim() || 'Без названия'

  return (
    <Link
      href={`/orders/${order.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-gray-600"
    >
      {/* Фото: фиксированная пропорция, чтобы карточки были одной высоты */}
      <div className={`grid aspect-[16/10] overflow-hidden bg-gray-800 ${images.length === 2 ? 'grid-cols-2 gap-px' : 'grid-cols-1'}`}>
        {images.length === 0 ? (
          <div className="flex items-center justify-center text-sm text-gray-500">Нет фото</div>
        ) : (
          images.map((src, i) => (
            <div key={i} className="overflow-hidden">
              <img
                src={src}
                alt={i === 0 ? title : `${title} (вид 2)`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
          ))
        )}
      </div>

      <div className="flex flex-grow flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 className="flex-grow text-lg font-semibold text-white transition group-hover:text-blue-400">{title}</h2>
          <span className={`shrink-0 rounded px-2 py-1 text-xs font-bold ${status?.badge ?? 'bg-gray-600 text-white'}`}>
            {status?.label ?? order.status ?? 'Неизвестно'}
          </span>
        </div>

        {priority?.badge && (
          <div className="mb-2">
            <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${priority.badge}`}>
              {priority.value === 'высокий' ? '🔥 ' : '⬇️ '}
              {priority.label}
            </span>
          </div>
        )}

        <p className="mb-3 line-clamp-2 flex-grow text-sm text-gray-400">{order.description || 'Без описания'}</p>

        <div className="flex items-center justify-between border-t border-gray-800 pt-3 text-sm">
          <span className="font-medium text-blue-300">💰 {formatCost(order.cost)}</span>
          <span className="text-xs text-gray-500">📅 {formatDate(order.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}
