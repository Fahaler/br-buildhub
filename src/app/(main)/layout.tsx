import ClientLayout from '@/components/ClientLayout'

// Оболочка с боковым меню для всех страниц, кроме /login
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>
}
