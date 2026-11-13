"use client"

import { MAX_COST, PRIORITIES, STATUSES, parseCost } from '@/lib/orders'

export type OrderFormData = {
  title: string
  description: string
  cost: string
  status: string
  priority: string
}

const inputClass =
  'w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none disabled:opacity-60'

/** Общие поля формы заказа (создание и редактирование). */
export default function OrderFields({
  value,
  onChange,
  disabled,
}: {
  value: OrderFormData
  onChange: (next: OrderFormData) => void
  disabled?: boolean
}) {
  const set = (patch: Partial<OrderFormData>) => onChange({ ...value, ...patch })

  return (
    <>
      <div>
        <label htmlFor="order-title" className="mb-2 block text-sm font-medium text-gray-300">Название постройки *</label>
        <input
          id="order-title"
          type="text"
          required
          maxLength={200}
          disabled={disabled}
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          className={inputClass}
          placeholder="Например: Танк Т-34"
        />
      </div>

      <div>
        <label htmlFor="order-description" className="mb-2 block text-sm font-medium text-gray-300">Описание</label>
        <textarea
          id="order-description"
          rows={4}
          disabled={disabled}
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
          className={inputClass}
          placeholder="Детали заказа, пожелания клиента..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="order-cost" className="mb-2 block text-sm font-medium text-gray-300">Стоимость, ₽</label>
          <input
            id="order-cost"
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={value.cost}
            onChange={(e) => set({ cost: e.target.value })}
            className={inputClass}
            placeholder="Например: 1 500"
          />
        </div>

        <div>
          <label htmlFor="order-status" className="mb-2 block text-sm font-medium text-gray-300">Статус</label>
          <select
            id="order-status"
            disabled={disabled}
            value={value.status}
            onChange={(e) => set({ status: e.target.value })}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="order-priority" className="mb-2 block text-sm font-medium text-gray-300">Приоритет</label>
          <select
            id="order-priority"
            disabled={disabled}
            value={value.priority}
            onChange={(e) => set({ priority: e.target.value })}
            className={inputClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}

/** Проверяет форму. Возвращает текст ошибки или данные для записи в базу. */
export function validateOrderForm(form: OrderFormData) {
  const title = form.title.trim()
  if (!title) return { error: 'Укажите название постройки' } as const
  const cost = parseCost(form.cost)
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
    return { error: 'Не получилось разобрать цену. Пример: 1500, 1 500 или 99,90 (или оставьте поле пустым)' } as const
  }
  if (cost !== null && cost > MAX_COST) {
    return { error: 'Слишком большая цена — проверьте, нет ли лишних нулей' } as const
  }
  return {
    values: {
      title,
      description: form.description.trim() || null,
      cost,
      status: form.status,
      priority: form.priority,
    },
  } as const
}
