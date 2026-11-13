import { createClient } from '@supabase/supabase-js'
import { connection } from 'next/server'
import type { Order } from '@/lib/orders'

/**
 * Заказы для макетов — загружаются на сервере, поэтому страница приходит уже
 * с данными (без «Загрузка…» в браузере). Ключ — тот же публичный, только чтение.
 */
export async function getLabOrders(): Promise<{ orders: Order[]; failed: boolean }> {
  await connection() // данные нужны свежие, на каждый запрос
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return { orders: (data ?? []) as Order[], failed: false }
  } catch (error) {
    console.error('Макеты: не удалось загрузить заказы', error)
    return { orders: [], failed: true }
  }
}
