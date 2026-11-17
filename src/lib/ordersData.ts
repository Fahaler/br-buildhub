import { createClient } from '@/lib/supabaseServerClient'
import type { Order } from '@/lib/orders'

/**
 * Заказы для главной — загружаются на сервере, поэтому страница приходит уже с данными.
 * Сессия берётся из cookies: если чтение когда-нибудь закроем от гостей, всё продолжит работать.
 */
export async function getOrders(): Promise<{ orders: Order[]; failed: boolean }> {
  // cookies() — вне try: при сборке Next.js прерывает его, чтобы отложить эту часть страницы до запроса
  const supabase = await createClient()
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return { orders: (data ?? []) as Order[], failed: false }
  } catch (error) {
    console.error('Не удалось загрузить заказы', error)
    return { orders: [], failed: true }
  }
}
