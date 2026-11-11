"use client"

import { useState } from 'react'

export default function TestDesignV3() {
  const [activeCategory, setActiveCategory] = useState('все')
  const [activeFilter, setActiveFilter] = useState('новые')
  const [activeMenu, setActiveMenu] = useState('заказы')

  const orders = [
    {
      id: '1',
      title: 'Танк Т-34',
      description: 'Средний танк с детализированной башней',
      status: 'в процессе',
      priority: 'высокий',
      cost: 1500,
      created_at: '2026-11-10',
      image_url: 'https://via.placeholder.com/400x300/2d1b4e/ff6b35?text=T-34',
      image_url_2: null
    },
    {
      id: '2',
      title: 'Грузовик MAN',
      description: 'Тяжелый грузовик для перевозки грузов',
      status: 'готов',
      priority: 'обычный',
      cost: 800,
      created_at: '2026-11-08',
      image_url: 'https://via.placeholder.com/400x300/1e3a5f/4facfe?text=MAN',
      image_url_2: 'https://via.placeholder.com/400x300/1e3a5f/00d4ff?text=MAN+2'
    },
    {
      id: '3',
      title: 'Вертолет Ми-8',
      description: 'Транспортный вертолет с детализированным салоном',
      status: 'в очереди',
      priority: 'обычный',
      cost: 2000,
      created_at: '2026-11-11',
      image_url: null,
      image_url_2: 'https://via.placeholder.com/400x300/1a4d2e/4ade80?text=Mi-8'
    },
    {
      id: '4',
      title: 'БТР-80',
      description: 'Бронетранспортер с колёсной формулой 8x8',
      status: 'готов',
      priority: 'обычный',
      cost: 1200,
      created_at: '2026-11-05',
      image_url: 'https://via.placeholder.com/400x300/3d2817/d4a574?text=BTR-80',
      image_url_2: null
    }
  ]

  const categories = [
    { id: 'все', label: 'Все', count: orders.length },
    { id: 'в очереди', label: 'В очереди', count: orders.filter(o => o.status === 'в очереди').length },
    { id: 'в процессе', label: 'В процессе', count: orders.filter(o => o.status === 'в процессе').length },
    { id: 'готов', label: 'Готов', count: orders.filter(o => o.status === 'готов').length },
    { id: 'отмена', label: 'Отмена', count: orders.filter(o => o.status === 'отмена').length }
  ]

  const filters = ['новые', 'по приоритету', 'по стоимости', 'по просмотрам']

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'готов': return 'bg-emerald-600 text-white'
      case 'в процессе': return 'bg-amber-600 text-white'
      case 'в очереди': return 'bg-blue-600 text-white'
      case 'отмена': return 'bg-rose-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const filteredOrders = activeCategory === 'все' 
    ? orders 
    : orders.filter(o => o.status === activeCategory)

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-100 flex">
      {/* === БОКОВОЕ МЕНЮ (как на скриншоте) === */}
      <aside className="w-64 bg-[#1a1f2e] border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Логотип */}
        <div className="p-4 border-b border-gray-800">
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2">
            <span>🧱</span>
            <span>BR BuildHub</span>
          </button>
        </div>

        {/* Разделы меню */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Заказы */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Заказы</h3>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveMenu('заказы')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  activeMenu === 'заказы' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>📋</span>
                <span>Все заказы</span>
              </button>
              <button 
                onClick={() => setActiveMenu('новые')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  activeMenu === 'новые' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>✨</span>
                <span>Новые</span>
              </button>
              <button 
                onClick={() => setActiveMenu('приоритет')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  activeMenu === 'приоритет' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>🔥</span>
                <span>Высокий приоритет</span>
              </button>
            </nav>
          </div>

          {/* Информация */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Информация</h3>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition">
                <span>📖</span>
                <span>О студии</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition">
                <span>💰</span>
                <span>Цены и условия</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition">
                <span>❓</span>
                <span>FAQ</span>
              </button>
            </nav>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Контакты</h3>
            <nav className="space-y-1">
              <a 
                href="https://t.me/FaHaLeR" 
                target="_blank"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
              >
                <span>✈️</span>
                <span>Telegram</span>
              </a>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('FaHaLeR')
                  alert('Никнейм скопирован!')
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
              >
                <span>🎮</span>
                <span>Discord (клик)</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Пользователь внизу */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
              F
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">FaHaLeR</p>
              <p className="text-xs text-gray-500">Администратор</p>
            </div>
          </div>
        </div>
      </aside>

      {/* === ОСНОВНОЙ КОНТЕНТ === */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Заголовок страницы */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Заказы</h3>
              <h1 className="text-4xl font-bold text-white mb-2">Портфолио</h1>
              <p className="text-gray-400">Все постройки студии BR BuildHub</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition">
              Создать заказ
            </button>
          </div>

          {/* Панель категорий и фильтров */}
          <div className="bg-[#1a1f2e] border border-gray-800 rounded-xl p-6 mb-8">
            {/* Категории */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Категории</h3>
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                      activeCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      activeCategory === cat.id ? 'bg-blue-700' : 'bg-gray-700'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Фильтры */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                      activeFilter === filter
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <button className="text-sm text-gray-400 hover:text-white transition">
                Мои материалы
              </button>
            </div>
          </div>

          {/* Сетка заказов */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#1a1f2e] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition group"
              >
                {/* Фото */}
                <div className="relative h-64 overflow-hidden">
                  {(order.image_url || order.image_url_2) ? (
                    <div className="w-full h-full flex">
                      {order.image_url && (
                        <img 
                          src={order.image_url} 
                          alt={order.title}
                          className={`h-full object-cover group-hover:scale-105 transition duration-500 ${order.image_url_2 ? 'w-1/2' : 'w-full'}`}
                        />
                      )}
                      {order.image_url_2 && (
                        <img 
                          src={order.image_url_2} 
                          alt={order.title + ' (вид 2)'}
                          className={`h-full object-cover group-hover:scale-105 transition duration-500 ${order.image_url ? 'w-1/2' : 'w-full'}`}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="text-gray-500">Нет фото</span>
                    </div>
                  )}
                  
                  {/* Категория (статус) */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Информация */}
                <div className="p-5">
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition">
                    {order.title}
                  </h2>
                  
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {order.description}
                  </p>

                  {/* Нижняя панель */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        F
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">FaHaLeR</p>
                        <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        💰 {order.cost} ₽
                      </span>
                      {order.priority === 'высокий' && (
                        <span className="text-rose-400 animate-pulse">🔥</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}