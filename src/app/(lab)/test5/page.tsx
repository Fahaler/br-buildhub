import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Exo_2, Inter_Tight, IBM_Plex_Mono } from 'next/font/google'
import { getLabOrders } from '@/lib/labData'
import Console from './Console'

const display = Exo_2({ subsets: ['latin', 'cyrillic'], weight: ['500', '600', '700'], variable: '--font-cs-display' })
const body = Inter_Tight({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'], variable: '--font-cs-body' })
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400', '500'], variable: '--font-cs-mono' })

export const metadata: Metadata = {
  title: 'Вариант 5 · Пульт — BR BuildHub',
  robots: { index: false, follow: false },
}

async function Data() {
  const { orders, failed } = await getLabOrders()
  return <Console orders={orders} failed={failed} />
}

export default function Test5Page() {
  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable} lab-cs`}>
      <Suspense fallback={<p className="cs-label px-6 py-24 text-center">Включаем пульт…</p>}>
        <Data />
      </Suspense>
    </div>
  )
}
