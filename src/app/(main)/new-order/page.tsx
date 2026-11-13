"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseBrowserClient'
import { DEFAULT_PRIORITY, DEFAULT_STATUS } from '@/lib/orders'
import { removeOrderImages, uploadOrderImage } from '@/lib/images'
import { useImageSlots } from '@/lib/useImageSlots'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import OrderFields, { validateOrderForm, type OrderFormData } from '@/components/OrderFields'
import ImageSlot from '@/components/ImageSlot'
import AdminOnly from '@/components/AdminOnly'
import { useToast } from '@/components/Toaster'

export default function NewOrderPage() {
  return (
    <AdminOnly>
      <NewOrderForm />
    </AdminOnly>
  )
}

function NewOrderForm() {
  const router = useRouter()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)
  const [form, setForm] = useState<OrderFormData>({
    title: '',
    description: '',
    cost: '',
    status: DEFAULT_STATUS,
    priority: DEFAULT_PRIORITY,
  })
  const { slots, setFile, clear } = useImageSlots({
    enabled: !saving,
    onPasteRejected: () => toast('Оба места для фото заняты — сначала уберите одно', 'info'),
  })

  const dirty =
    !created &&
    (form.title.trim() !== '' || form.description.trim() !== '' || form.cost.trim() !== '' ||
      !!slots[0].file || !!slots[1].file)
  useUnsavedChanges(dirty)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const checked = validateOrderForm(form)
    if ('error' in checked) {
      toast(checked.error ?? 'Проверьте форму', 'error')
      return
    }

    setSaving(true)
    const uploaded: string[] = []
    try {
      let imageUrl1: string | null = null
      let imageUrl2: string | null = null
      if (slots[0].file) { imageUrl1 = await uploadOrderImage(slots[0].file, 1); uploaded.push(imageUrl1) }
      if (slots[1].file) { imageUrl2 = await uploadOrderImage(slots[1].file, 2); uploaded.push(imageUrl2) }

      const { data, error } = await supabase
        .from('orders')
        .insert({ ...checked.values, image_url: imageUrl1, image_url_2: imageUrl2 })
        .select('id')
        .single()
      if (error) throw error

      setCreated(true) // больше не предупреждаем о несохранённом
      toast('Заказ создан', 'success')
      router.push(data?.id ? `/orders/${data.id}` : '/')
    } catch (error) {
      console.error('Ошибка при создании заказа:', error)
      await removeOrderImages(uploaded) // не оставляем «осиротевшие» файлы
      toast('Не удалось создать заказ. Проверьте подключение и права доступа.', 'error')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-24 sm:pb-0">
      <div className="mb-6">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-gray-400 hover:text-white">← К списку заказов</Link>
        <h1 className="text-2xl font-bold text-blue-400 sm:text-3xl">🆕 Новый заказ</h1>
        <p className="mt-2 text-sm text-gray-500">💡 Фото можно перетащить или вставить через Ctrl+V. Они сжимаются автоматически.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
        <OrderFields value={form} onChange={setForm} disabled={saving} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageSlot label="Фото 1" preview={slots[0].preview} onSelect={(f) => setFile(0, f)} onRemove={() => clear(0)} disabled={saving} />
          <ImageSlot label="Фото 2 (необязательно)" preview={slots[1].preview} onSelect={(f) => setFile(1, f)} onRemove={() => clear(1)} disabled={saving} />
        </div>

        {/* На телефоне кнопка закреплена внизу экрана */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-800 bg-gray-950/95 p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:bg-gray-600"
          >
            {saving ? 'Создание…' : 'Создать заказ'}
          </button>
        </div>
      </form>
    </div>
  )
}
