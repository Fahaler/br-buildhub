import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Russo_One, Manrope, JetBrains_Mono } from 'next/font/google'
import { getLabOrders } from '@/lib/labData'
import Tags from './Tags'

const display = Russo_One({ subsets: ['latin', 'cyrillic'], weight: '400', variable: '--font-tg-display' })
const body = Manrope({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'], variable: '--font-tg-body' })
const mono = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'], variable: '--font-tg-mono' })

export const metadata: Metadata = {
  title: 'Вариант 4 · Бирки — BR BuildHub',
  robots: { index: false, follow: false },
}

async function Data() {
  const { orders, failed } = await getLabOrders()
  return <Tags orders={orders} failed={failed} />
}

export default function Test4Page() {
  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable} lab-tg`}>
      <Suspense fallback={<p className="tg-mono px-6 py-24 text-center text-(--muted)">Развешиваем бирки…</p>}>
        <Data />
      </Suspense>
    </div>
  )
}
