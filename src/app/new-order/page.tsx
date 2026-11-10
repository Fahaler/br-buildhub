"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabaseBrowserClient'
import { useRouter } from 'next/navigation'

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cost: '',
    status: 'в процессе'
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let imageUrl = ''

      // Если есть картинка — загружаем её в Storage
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('order-images')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        // Получаем публичную ссылку на картинку
        const { data: { publicUrl } } = supabase.storage
          .from('order-images')
          .getPublicUrl(filePath)

        imageUrl = publicUrl
      }

      // Создаем заказ в базе данных
      const { error: insertError } = await supabase
        .from('orders')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            cost: parseFloat(formData.cost) || 0,
            status: formData.status,
            image_url: imageUrl
          }
        ])

      if (insertError) throw insertError

      // Возвращаемся на главную
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Ошибка при создании заказа:', error)
      alert('Произошла ошибка при создании заказа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Назад
          </button>
          <h1 className="text-3xl font-bold text-blue-400">🆕 Новый заказ</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Название постройки *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Например: Танк Т-34"
            />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Детали заказа, пожелания клиента..."
            />
          </div>

          {/* Стоимость и Статус */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Стоимость (руб)
              </label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Статус
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="в процессе">В процессе</option>
                <option value="готов">Готов</option>
                <option value="отмена">Отмена</option>
              </select>
            </div>
          </div>

          {/* Загрузка фото */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Фото постройки
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500"
            />
          </div>

          {/* Кнопка отправки */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition"
          >
            {loading ? 'Создание...' : 'Создать заказ'}
          </button>
        </form>
      </div>
    </main>
  )
}