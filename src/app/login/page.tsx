"use client"

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseBrowserClient'
import { useAuth } from '@/components/AuthProvider'

// Разрешаем переход только на страницы этого сайта
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const { loading: authLoading, userId, isAdmin, email: currentEmail, signOut } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    searchParams.get('error') === 'not_admin' ? 'У этого аккаунта нет прав администратора.' : ''
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error || !data.user) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }

    const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle()
    if (!admin) {
      await supabase.auth.signOut()
      setError('Вход выполнен, но у этого аккаунта нет прав администратора.')
      setLoading(false)
      return
    }

    router.replace(next)
    router.refresh()
  }

  return (
    <main className="cs-scroll flex h-full items-center justify-center overflow-y-auto p-4">
      <div className="cs-up w-full max-w-sm overflow-hidden rounded-lg border border-(--line) bg-(--panel)">
        <span aria-hidden className="cs-hazard block h-2 opacity-80" />
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span aria-hidden className="cs-hazard h-9 w-9 shrink-0 rounded-sm ring-1 ring-(--amber)" />
            <div className="leading-none">
              <h1 className="font-display text-[20px] font-semibold tracking-wide">BR BuildHub</h1>
              <p className="cs-label mt-1.5">вход для своих</p>
            </div>
          </div>

          {!authLoading && userId && isAdmin ? (
            <div className="mt-7 space-y-4">
              <p className="text-[15px] text-(--muted)">
                Вы уже вошли как <span className="font-mono-ui text-(--text)">{currentEmail}</span>.
              </p>
              <Link href={next} className="cs-btn block w-full bg-(--amber) py-3 text-center text-black hover:bg-(--text)">
                К пульту
              </Link>
              <button onClick={signOut} className="w-full text-[14px] text-(--muted) hover:text-(--text)">Выйти из аккаунта</button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="mt-7 space-y-4">
              {error && (
                <p role="alert" className="rounded-md border border-(--red)/50 bg-(--red)/10 px-3 py-2 text-[14px] text-(--red)">{error}</p>
              )}
              <label className="block">
                <span className="cs-label">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cs-field mt-2 text-[15px]"
                />
              </label>
              <label className="block">
                <span className="cs-label">Пароль</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cs-field mt-2 text-[15px]"
                />
              </label>
              <button type="submit" disabled={loading} className="cs-btn mt-2 w-full bg-(--amber) py-3 text-black hover:bg-(--text)">
                {loading ? 'Входим…' : 'Войти'}
              </button>
              <p className="text-[12.5px] leading-snug text-(--muted)">Смотреть заказы можно и без входа. Вход нужен, чтобы добавлять и менять их.</p>
            </form>
          )}

          <Link href="/" className="mt-6 block text-center text-[14px] text-(--muted) hover:text-(--amber)">← К заказам</Link>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
