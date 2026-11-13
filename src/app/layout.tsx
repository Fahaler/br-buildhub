import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Exo_2, Inter_Tight, IBM_Plex_Mono } from 'next/font/google'
import Providers from '@/components/Providers'

const display = Exo_2({ subsets: ['latin', 'cyrillic'], weight: ['500', '600', '700'], variable: '--font-display' })
const body = Inter_Tight({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'], variable: '--font-body' })
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400', '500'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'BR BuildHub · пульт заказов',
  description: 'Блокнот заказов на постройки в Brick Rigs',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0f0e0c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="h-dvh overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
