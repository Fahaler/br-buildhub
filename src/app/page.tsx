"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseBrowserClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('все')
  const [searchQuery, setSearchQuery] = useState('') // Состояние для поиска

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    router.refresh()
  }

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'готов': return 'bg-green-600 text-white'
      case 'в процессе': return 'bg-yellow-600 text-white'
      case 'в очереди': return 'bg-blue-600 text-white'
      case 'отмена': return 'bg-red-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  function getPriorityBadge(priority: string) {
    if (priority?.toLowerCase() === 'высокий') {
      return (
        <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-red-600 text-white animate-pulse">
          🔥 Высокий
        </span>
      )
    }
    return null
  }

  // Фильтрация: сначала по статусу, потом по поиску
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'все' || order.status?.toLowerCase() === filterStatus
    const matchesSearch = searchQuery === '' || 
      order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.description && order.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesStatus && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 text-lg animate-pulse">Загрузка BR BuildHub...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Верхняя панель управления (поиск + авторизация) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-gray-800">
        
        {/* Поиск */}
        <div className="relative w-full md:w-96">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Кнопки авторизации */}
        <div className="flex gap-3 items-center">
          {isLoggedIn ? (
            <>
              <Link href="/new-order" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition whitespace-nowrap">
                + Новый заказ
              </Link>
              <button 
                onClick={handleLogout}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg font-medium transition border border-gray-700 whitespace-nowrap"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link href="/login" className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition border border-gray-700 whitespace-nowrap">
              Войти (Админ)
            </Link>
          )}
        </div>
      </div>

      {/* Фильтры по статусу */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['все', 'в очереди', 'в процессе', 'готов', 'отмена'].map((status) => {
          const count = status === 'все' ? orders.length : orders.filter(o => o.status?.toLowerCase() === status).length
          const isActive = filterStatus === status
          
          let activeClass = 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          if (isActive) {
            if (status === 'все') activeClass = 'bg-blue-600 text-white'
            else if (status === 'в очереди') activeClass = 'bg-blue-600 text-white'
            else if (status === 'в процессе') activeClass = 'bg-yellow-600 text-white'
            else if (status === 'готов') activeClass = 'bg-green-600 text-white'
            else if (status === 'отмена') activeClass = 'bg-red-600 text-white'
          }

          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition capitalize ${activeClass}`}
            >
              {status} ({count})
            </button>
          )
        })}
      </div>

      {/* Сетка заказов */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800 border-dashed">
          <p className="text-gray-400 text-lg">
            {searchQuery ? 'Ничего не найдено по запросу.' : `Нет заказов со статусом "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition flex flex-col cursor-pointer group">
              {/* Фото сверху */}
              {(order.image_url || order.image_url_2) ? (
                <div className="w-full bg-gray-800 flex" style={{ minHeight: '200px', maxHeight: '280px' }}>
                  {order.image_url ? (
                    <img 
                      src={order.image_url} 
                      alt={order.title} 
                      className={`h-full w-full object-cover group-hover:scale-105 transition duration-300 ${order.image_url_2 ? 'w-1/2 border-r border-gray-900' : ''}`}
                    />
                  ) : null}
                  {order.image_url_2 ? (
                    <img 
                      src={order.image_url_2} 
                      alt={order.title + ' (вид 2)'} 
                      className={`h-full w-full object-cover group-hover:scale-105 transition duration-300 ${order.image_url ? 'w-1/2' : 'w-full'}`}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Нет фото</span>
                </div>
              )}

              {/* Информация снизу */}
              <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold text-white flex-grow group-hover:text-blue-400 transition">{order.title}</h2>
                  <span className={`px-2 py-1 rounded text-xs font-bold ml-2 ${getStatusColor(order.status)}`}>
                    {order.status || 'Неизвестно'}
                  </span>
                </div>
                
                {order.priority && (
                  <div className="mb-2">
                    {getPriorityBadge(order.priority)}
                  </div>
                )}
                
                <p className="text-gray-400 text-sm mb-3 flex-grow line-clamp-2">{order.description || 'Без описания'}</p>
                
                <div className="flex items-center justify-between text-sm border-t border-gray-800 pt-3">
                  <span className="text-blue-300 font-medium">
                    💰 {order.cost ? `${order.cost} руб.` : 'Цена не указана'}
                  </span>
                  <span className="text-gray-500 text-xs">
                    📅 {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}