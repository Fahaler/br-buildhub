import { Suspense } from 'react'
import { getOrders } from '@/lib/ordersData'
import Notebook from '@/components/notebook/Notebook'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

async function Data({ searchParams }: { searchParams: SearchParams }) {
  const [params, { orders, failed }] = await Promise.all([searchParams, getOrders()])
  const id = typeof params.id === 'string' ? params.id : null
  return <Notebook initialOrders={orders} loadFailed={failed} initialId={id} initialNew={params.new === '1'} initialView={params.view === 'stats' ? 'stats' : 'orders'} />
}

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <span aria-hidden className="cs-hazard h-9 w-9 rounded-sm ring-1 ring-(--amber)" />
      <p className="cs-label cs-blink">Включаем пульт…</p>
    </div>
  )
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Splash />}>
      <Data searchParams={searchParams} />
    </Suspense>
  )
}
