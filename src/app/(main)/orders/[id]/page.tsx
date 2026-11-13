"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseBrowserClient'
import {
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  formatCost,
  formatDate,
  getPriority,
  getStatus,
  type Order,
} from '@/lib/orders'
import { removeOrderImages, uploadOrderImage } from '@/lib/images'
import { useImageSlots } from '@/lib/useImageSlots'
import { UNSAVED_MESSAGE, useUnsavedChanges } from '@/lib/useUnsavedChanges'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toaster'
import OrderFields, { validateOrderForm, type OrderFormData } from '@/components/OrderFields'
import ImageSlot from '@/components/ImageSlot'
import ConfirmDialog from '@/components/ConfirmDialog'

const toForm = (o: Order): OrderFormData => ({
  title: o.title ?? '',
  description: o.description ?? '',
  cost: o.cost === null || o.cost === undefined ? '' : String(o.cost),
  status: getStatus(o.status)?.value ?? DEFAULT_STATUS,
  priority: getPriority(o.priority)?.value ?? DEFAULT_PRIORITY,
})

function OrderContent() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const { isAdmin } = useAuth()
  const toast = useToast()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [form, setForm] = useState<OrderFormData | null>(null)
  const [editing, setEditing] = useState(false)

  const { slots, setFile, clear, reset } = useImageSlots({
    enabled: isAdmin && editing && !saving && !deleting,
    onPasteRejected: () => toast('Оба места для фото заняты — сначала уберите одно', 'info'),
  })

  const applyOrder = useCallback((o: Order) => {
    setOrder(o)
    setForm(toForm(o))
    reset([o.image_url ?? '', o.image_url_2 ?? ''])
  }, [reset])

  // Есть ли изменения относительно сохранённого заказа
  const dirty = useMemo(() => {
    if (!editing || !order || !form) return false
    const saved = toForm(order)
    const fieldsChanged = (Object.keys(saved) as (keyof OrderFormData)[]).some((k) => saved[k] !== form[k])
    const imagesChanged =
      !!slots[0].file || !!slots[1].file ||
      slots[0].preview !== (order.image_url ?? '') ||
      slots[1].preview !== (order.image_url_2 ?? '')
    return fieldsChanged || imagesChanged
  }, [editing, order, form, slots])

  useUnsavedChanges(dirty)

  /** Выход из режима правки: несохранённое откатываем к версии из базы. */
  const cancelEdit = () => {
    if (!order) return
    if (dirty && !window.confirm(UNSAVED_MESSAGE)) return
    applyOrder(order)
    setEditing(false)
  }

  useEffect(() => {
    if (!orderId) return
    let active = true
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error('Ошибка загрузки заказа:', error)
        if (!data) setNotFound(true)
        else applyOrder(data as Order)
        setLoading(false)
      })
    return () => { active = false }
  }, [orderId, applyOrder])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !form) return
    const checked = validateOrderForm(form)
    if ('error' in checked) {
      toast(checked.error ?? 'Проверьте форму', 'error')
      return
    }

    setSaving(true)
    const uploaded: string[] = [] // новые файлы — удалим, если сохранение не удастся
    const toDelete: string[] = [] // старые файлы — удалим только после успешного сохранения
    try {
      let imageUrl1 = order.image_url || null
      let imageUrl2 = order.image_url_2 || null

      if (slots[0].file) {
        imageUrl1 = await uploadOrderImage(slots[0].file, 1)
        uploaded.push(imageUrl1)
        if (order.image_url) toDelete.push(order.image_url)
      } else if (!slots[0].preview && order.image_url) {
        toDelete.push(order.image_url)
        imageUrl1 = null
      }

      if (slots[1].file) {
        imageUrl2 = await uploadOrderImage(slots[1].file, 2)
        uploaded.push(imageUrl2)
        if (order.image_url_2) toDelete.push(order.image_url_2)
      } else if (!slots[1].preview && order.image_url_2) {
        toDelete.push(order.image_url_2)
        imageUrl2 = null
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ ...checked.values, image_url: imageUrl1, image_url_2: imageUrl2 })
        .eq('id', order.id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Нет прав на изменение или заказ удалён')

      applyOrder(data as Order) // обновляем данные на странице — повторное сохранение работает корректно
      setEditing(false)
      await removeOrderImages(toDelete)
      toast('Изменения сохранены', 'success')
    } catch (error) {
      console.error('Ошибка при сохранении:', error)
      await removeOrderImages(uploaded)
      toast('Не удалось сохранить изменения. Проверьте подключение и права доступа.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!order) return
    setDeleting(true)
    try {
      // Сначала запись, потом файлы: если файлы не удалятся, заказ всё равно не «сломается»
      const { data, error } = await supabase.from('orders').delete().eq('id', order.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Нет прав на удаление')
      await removeOrderImages([order.image_url, order.image_url_2])
      toast('Заказ удалён', 'success')
      router.push('/')
    } catch (error) {
      console.error('Ошибка при удалении:', error)
      toast('Не удалось удалить заказ', 'error')
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-lg text-gray-400 animate-pulse">Загрузка заказа…</p>
  }

  if (notFound || !order || !form) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-lg text-gray-400">Заказ не найден</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300">← К списку заказов</Link>
      </div>
    )
  }

  const status = getStatus(order.status)
  const priority = getPriority(order.priority)
  const title = order.title?.trim() || 'Без названия'
  const busy = saving || deleting

  return (
    <div className="mx-auto max-w-6xl pb-24 md:pb-0">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white">← К списку заказов</Link>

      {isAdmin && editing ? (
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <div className="space-y-4">
            <ImageSlot label="Фото 1" preview={slots[0].preview} onSelect={(f) => setFile(0, f)} onRemove={() => clear(0)} disabled={busy} />
            <ImageSlot label="Фото 2" preview={slots[1].preview} onSelect={(f) => setFile(1, f)} onRemove={() => clear(1)} disabled={busy} />
          </div>

          <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6 md:self-start">
            <h1 className="text-xl font-bold text-blue-400">Редактирование</h1>
            <p className="text-sm text-gray-500">
              💡 Фото можно перетащить или вставить через Ctrl+V. Создан: {formatDate(order.created_at)}
            </p>

            <OrderFields value={form} onChange={setForm} disabled={busy} />

            <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-gray-800 bg-gray-950/95 p-3 md:static md:flex-col md:border-0 md:bg-transparent md:p-0">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:bg-gray-600"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={busy}
                className="rounded-lg border border-gray-700 px-4 py-3 font-medium text-gray-300 transition hover:bg-gray-800 disabled:opacity-50 md:w-full"
              >
                Отмена
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <div className="space-y-4">
            {[order.image_url, order.image_url_2].filter(Boolean).length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-500">Нет фото</div>
            ) : (
              [order.image_url, order.image_url_2].filter((u): u is string => !!u).map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
                  <img src={src} alt={i === 0 ? title : `${title} (вид 2)`} className="max-h-[32rem] w-full object-contain" />
                </a>
              ))
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6 md:self-start">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${status?.badge ?? 'bg-gray-600 text-white'}`}>
                {status?.label ?? order.status ?? 'Неизвестно'}
              </span>
              {priority?.badge && (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${priority.badge}`}>
                  {priority.value === 'высокий' ? '🔥 ' : '⬇️ '}
                  {priority.label} приоритет
                </span>
              )}
            </div>
            <p className="whitespace-pre-line text-gray-400">{order.description || 'Без описания'}</p>
            <div className="border-t border-gray-800 pt-4">
              <p className="text-lg font-medium text-blue-300">💰 {formatCost(order.cost)}</p>
              <p className="mt-2 text-sm text-gray-500">📅 Создан: {formatDate(order.created_at)}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-3 border-t border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-500"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy}
                  className="rounded-lg border border-red-800 px-4 py-2.5 font-medium text-red-400 transition hover:bg-red-950 disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Удалить заказ?"
        text={`«${title}» и его фото будут удалены. Это действие нельзя отменить.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-lg text-gray-400 animate-pulse">Загрузка заказа…</p>}>
      <OrderContent />
    </Suspense>
  )
}
