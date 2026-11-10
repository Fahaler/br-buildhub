"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseBrowserClient'
import Link from 'next/link'

export default function Home() {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      // 1. Проверяем, вошел ли пользователь
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)

      // 2. Загружаем заказы (RLS сам разрешит гостям читать, а авторизованным читать+писать)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOrders(data)
      }
      
      setLoading(false)
    }

    loadData()
  }, [])

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'готов': return 'bg-green-900 text-green-300 border-green-700'
      case 'в процессе': return 'bg-yellow-900 text-yellow-300 border-yellow-700'
      case 'отмена': return 'bg-red-900 text-red-300 border-red-700'
      default: return 'bg-gray-700 text-gray-300 border-gray-600'
    }
  }

  // Показываем загрузку, пока данные не пришли
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-400 text-lg animate-pulse">Загрузка BR BuildHub...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Шапка */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">🧱 BR BuildHub</h1>
          <div className="flex gap-3 items-center">
            {isLoggedIn ? (
              <>
                <Link href="/new-order" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition">
                  + Новый заказ
                </Link>
                <span className="text-sm text-green-400">Вы вошли 👤</span>
              </>
            ) : (
              <Link href="/login" className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition border border-gray-700">
                Войти
              </Link>
            )}
          </div>
        </div>

        {/* Список заказов */}
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-gray-400 text-lg">Заказов пока нет.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-semibold text-white">{order.title}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                    {order.status || 'Неизвестно'}
                  </span>
                </div>
                
                <p className="text-gray-400 mb-4 text-sm">{order.description || 'Без описания'}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-300 font-medium">
                    💰 {order.cost ? `${order.cost} руб.` : 'Цена не указана'}
                  </span>
                  <span className="text-gray-500">
                    📅 {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {order.image_url && (
                  <div className="mt-4 rounded-lg overflow-hidden border border-gray-800">
                    <img src={order.image_url} alt={order.title} className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}