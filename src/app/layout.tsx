import './globals.css'
import ClientLayout from '@/components/ClientLayout'

export const metadata = {
  title: 'BR BuildHub',
  description: 'Студия построек в Brick Rigs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="bg-gray-950 text-gray-100 flex h-screen overflow-hidden">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}