import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Oswald, Golos_Text } from 'next/font/google'
import { getLabOrders } from '@/lib/labData'
import Workshop from './Workshop'

const display = Oswald({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'], variable: '--font-ws-display' })
const body = Golos_Text({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'], variable: '--font-ws-body' })

export const metadata: Metadata = {
  title: 'Вариант 3 · Мастерская — BR BuildHub',
  robots: { index: false, follow: false },
}

async function Data() {
  const { orders, failed } = await getLabOrders()
  return <Workshop orders={orders} failed={failed} />
}

export default function Test3Page() {
  return (
    <div className={`${display.variable} ${body.variable} lab-ws`}>
      <Suspense
        fallback={<p className="ws-kicker px-6 py-24 text-center">Открываем ворота цеха…</p>}
      >
        <Data />
      </Suspense>
    </div>
  )
}
