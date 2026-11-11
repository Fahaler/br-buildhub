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
  status: 'в очереди',
  priority: 'обычный'
})
  const [imageFile1, setImageFile1] = useState<File | null>(null)
  const [imageFile2, setImageFile2] = useState<File | null>(null)
  const [preview1, setPreview1] = useState('')
  const [preview2, setPreview2] = useState('')

  const handleImage1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile1(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreview1(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleImage2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile2(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreview2(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let imageUrl1 = ''
      let imageUrl2 = ''

      // Загружаем первое фото
      if (imageFile1) {
        const fileExt = imageFile1.name.split('.').pop()
        const fileName = `${Date.now()}_1.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('order-images')
          .upload(fileName, imageFile1)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('order-images')
          .getPublicUrl(fileName)
        imageUrl1 = publicUrl
      }

      // Загружаем второе фото
      if (imageFile2) {
        const fileExt = imageFile2.name.split('.').pop()
        const fileName = `${Date.now()}_2.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('order-images')
          .upload(fileName, imageFile2)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('order-images')
          .getPublicUrl(fileName)
        imageUrl2 = publicUrl
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
      priority: formData.priority,
      image_url: imageUrl1,
      image_url_2: imageUrl2
    }
  ])

      if (insertError) throw insertError

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
      <option value="в очереди">В очереди</option>
      <option value="в процессе">В процессе</option>
      <option value="готов">Готов</option>
      <option value="отмена">Отмена</option>
    </select>
  </div>
</div>

{/* Приоритет */}
<div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Приоритет
  </label>
  <select
    value={formData.priority}
    onChange={(e) => setFormData({...formData, priority: e.target.value})}
    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
  >
    <option value="обычный">Обычный</option>
    <option value="высокий">Высокий 🔥</option>
  </select>
</div>

          {/* Загрузка фото 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Фото 1
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImage1Change}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500"
            />
            {preview1 && (
              <img src={preview1} alt="Preview 1" className="mt-2 max-h-48 rounded-lg border border-gray-700" />
            )}
          </div>

          {/* Загрузка фото 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Фото 2 (необязательно)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImage2Change}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500"
            />
            {preview2 && (
              <img src={preview2} alt="Preview 2" className="mt-2 max-h-48 rounded-lg border border-gray-700" />
            )}
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