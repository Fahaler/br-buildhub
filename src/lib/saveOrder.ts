"use client"

import { supabase } from '@/lib/supabaseBrowserClient'
import { imagesOf, type Order } from '@/lib/orders'
import { removeOrderImages, uploadOrderImage } from '@/lib/images'

/** Фото в редакторе: уже загруженное (url) или новое (file). preview — что показывать. */
export type PhotoItem = { key: string; url: string | null; file: File | null; preview: string }

export type OrderValues = {
  title: string
  client_nick: string | null
  description: string | null
  cost: number | null
  status: string
  priority: string
  payment: string
  kind: string
  deadline: string | null
  ordered_at: string
  prepaid_amount: number | null
  sold_at: string | null
  sold_price: number | null
  brick_limit: number | null
}

/** Понятный текст ошибки Supabase. */
export function errorText(error: unknown): string {
  const e = error as { code?: string; message?: string } | null
  if (e?.code === 'PGRST204' || /column .* does not exist|schema cache/i.test(e?.message ?? '')) {
    const m = e?.message ?? ''
    if (/prepaid_amount|sold_at|sold_price|brick_limit/.test(m)) return 'В базе нет новых полей — запустите supabase/005-money-sales.sql'
    if (/kind/.test(m)) return 'В базе нет поля «тип» — запустите supabase/004-for-sale.sql'
    return 'В базе нет новых полей — запустите по порядку supabase/003…005 (*.sql)'
  }
  if (e?.code === '42501') return 'Нет прав на изменение (войдите как админ)'
  if (e?.code === '23514') return 'База не приняла значение (проверьте суммы и лимит бриков)'
  return e?.message || 'Неизвестная ошибка'
}

/**
 * Создаёт или обновляет заказ вместе с фото.
 * Новые фото загружаются до сохранения; если сохранить не вышло — они удаляются.
 * Убранные фото удаляются из хранилища только после успешного сохранения.
 */
export async function saveOrder(original: Order | null, values: OrderValues, photos: PhotoItem[]): Promise<Order> {
  const uploaded: string[] = []
  try {
    const results = await Promise.allSettled(
      photos.map((p) => (p.file ? uploadOrderImage(p.file) : Promise.resolve(p.url as string))),
    )
    results.forEach((r, i) => { if (r.status === 'fulfilled' && photos[i].file) uploaded.push(r.value) })
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) throw failed.reason

    const images = results.map((r) => (r as PromiseFulfilledResult<string>).value)
    const row = { ...values, images, image_url: null, image_url_2: null }
    const query = original
      ? supabase.from('orders').update(row).eq('id', original.id)
      : supabase.from('orders').insert(row)
    const { data, error } = await query.select('*').maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Нет прав на изменение или заказ уже удалён')

    if (original) await removeOrderImages(imagesOf(original).filter((u) => !images.includes(u)))
    return data as Order
  } catch (error) {
    await removeOrderImages(uploaded)
    throw error
  }
}

/** Быстрая правка одного-двух полей (статус, оплата, предоплата, продажа, чек-лист). */
export async function patchOrder(id: string, values: Partial<OrderValues>): Promise<Order> {
  const { data, error } = await supabase.from('orders').update(values).eq('id', id).select('*').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Нет прав на изменение или заказ уже удалён')
  return data as Order
}

export async function deleteOrder(order: Order): Promise<void> {
  const { data, error } = await supabase.from('orders').delete().eq('id', order.id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Нет прав на удаление или заказ уже удалён')
  await removeOrderImages(imagesOf(order))
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Order[]
}
