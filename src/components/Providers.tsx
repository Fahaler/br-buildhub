"use client"

import { AuthProvider } from '@/components/AuthProvider'
import { ToastProvider } from '@/components/Toaster'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  )
}
