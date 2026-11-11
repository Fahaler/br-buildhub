"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseBrowserClient'
import { useRouter, useParams } from 'next/navigation'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<any>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cost: '',
    status: 'в очереди',
    priority: 'обычный'
  })
  const [newImageFile1, setNewImageFile1] = useState<File | null>(null)
  const [newImageFile2, setNewImageFile2] = useState<File | null>(null)
  const [preview1, setPreview1] = useState('')
  const [preview2, setPreview2] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Ошибка загрузки заказа:', error)
        router.push('/')
        return
      }

      setOrder(data)
      setFormData({
        title: data.title || '',
        description: data.description || '',
        cost: data.cost?.toString() || '',
        status: data.status || 'в очереди',
        priority: data.priority || 'обычный'
      })
      setPreview1(data.image_url || '')
      setPreview2(data.image_url_2 || '')
      setLoading(false)
    }

    if (orderId) {
      loadData()
    }
  }, [orderId])

  const handleImage1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewImageFile1(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreview1(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleImage2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewImageFile2(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreview2(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage1 = () => {
    setNewImageFile1(null)
    setPreview1('')
  }

  const handleRemoveImage2 = () => {
    setNewImageFile2(null)
    setPreview2('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      let imageUrl1 = order.image_url
      let imageUrl2 = order.image_url_2

      if (newImageFile1) {
        if (order.image_url) {
          const oldPath = order.image_url.split('/').pop()
          await supabase.storage.from('order-images').remove([oldPath])
        }
        const fileExt = newImageFile1.name.split('.').pop()
        const fileName = `${Date.now()}_1.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('order-images').upload(fileName, newImageFile1)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('order-images').getPublicUrl(fileName)
        imageUrl1 = publicUrl
      } else if (preview1 === '') {
        if (order.image_url) {
          const oldPath = order.image_url.split('/').pop()
          await supabase.storage.from('order-images').remove([oldPath])
        }
        imageUrl1 = null
      }

      if (newImageFile2) {
        if (order.image_url_2) {
          const oldPath = order.image_url_2.split('/').pop()
          await supabase.storage.from('order-images').remove([oldPath])
        }
        const fileExt = newImageFile2.name.split('.').pop()
        const fileName = `${Date.now()}_2.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('order-images').upload(fileName, newImageFile2)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('order-images').getPublicUrl(fileName)
        imageUrl2 = publicUrl
      } else if (preview2 === '') {
        if (order.image_url_2) {
          const oldPath = order.image_url_2.split('/').pop()
          await supabase.storage.from('order-images').remove([oldPath])
        }
        imageUrl2 = null
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          title: formData.title,
          description: formData.description,
          cost: parseFloat(formData.cost) || 0,
          status: formData.status,
          priority: formData.priority,
          image_url: imageUrl1,
          image_url_2: imageUrl2
        })
        .eq('id', orderId)

      if (updateError) throw updateError

      alert('Заказ обновлен!')
      router.refresh()
    } catch (error) {
      console.error('Ошибка при сохранении:', error)
      alert('Произошла ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Ты уверен, что хочешь удалить этот заказ? Это действие нельзя отменить.')) {
      return
    }

    setDeleting(true)

    try {
      if (order.image_url) {
        const oldPath = order.image_url.split('/').pop()
        await supabase.storage.from('order-images').remove([oldPath])
      }
      if (order.image_url_2) {
        const oldPath = order.image_url_2.split('/').pop()
        await supabase.storage.from('order-images').remove([oldPath])
      }

      const { error } = await supabase.from('orders').delete().eq('id', orderId)
      if (error) throw error

      alert('Заказ удален')
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Ошибка при удалении:', error)
      alert('Произошла ошибка при удалении')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-400 text-lg animate-pulse">Загрузка заказа...</p>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Заказ не найден</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Назад к списку
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Левая колонка — фото */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {preview1 ? (
                <img src={preview1} alt={order.title} className="w-full h-auto object-contain max-h-96" />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">Нет фото 1</div>
              )}
            </div>

            {preview2 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <img src={preview2} alt={order.title} className="w-full h-auto object-contain max-h-96" />
              </div>
            )}

            {isLoggedIn && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Заменить фото 1</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImage1Change}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                  />
                </div>
                {preview1 && (
                  <button
                    type="button"
                    onClick={handleRemoveImage1}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2 rounded-lg transition"
                  >
                    Удалить фото 1
                  </button>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Заменить фото 2</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImage2Change}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                  />
                </div>
                {preview2 && (
                  <button
                    type="button"
                    onClick={handleRemoveImage2}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2 rounded-lg transition"
                  >
                    Удалить фото 2
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Правая колонка — информация и редактирование */}
          <div>
            {isLoggedIn ? (
              <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-bold text-blue-400 mb-4">Редактировать заказ</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Название</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Описание</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Стоимость (руб)</label>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Статус</label>
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Приоритет</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="обычный">Обычный</option>
                    <option value="высокий">Высокий 🔥</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition"
                >
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition"
                >
                  {deleting ? 'Удаление...' : 'Удалить заказ'}
                </button>
              </form>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <h2 className="text-2xl font-bold text-white">{order.title}</h2>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === 'готов' ? 'bg-green-600 text-white' :
                    order.status === 'в процессе' ? 'bg-yellow-600 text-white' :
                    order.status === 'в очереди' ? 'bg-blue-600 text-white' :
                    order.status === 'отмена' ? 'bg-red-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {order.status}
                  </span>
                  
                  {order.priority === 'высокий' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                      🔥 Высокий приоритет
                    </span>
                  )}
                </div>

                <p className="text-gray-400">{order.description || 'Без описания'}</p>

                <div className="border-t border-gray-800 pt-4">
                  <p className="text-blue-300 font-medium text-lg">
                    💰 {order.cost ? `${order.cost} руб.` : 'Цена не указана'}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    📅 Создан: {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}