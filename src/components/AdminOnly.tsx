"use client"

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

/** Показывает содержимое только админам (дополнительно к проверке в proxy.ts). */
export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, userId } = useAuth()

  if (loading) {
    return <p className="py-20 text-center text-gray-400 animate-pulse">Проверка доступа…</p>
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="mb-4 text-gray-300">
          {userId ? 'У этого аккаунта нет прав администратора.' : 'Эта страница доступна только администраторам.'}
        </p>
        <Link href="/login" className="inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
          Войти
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
