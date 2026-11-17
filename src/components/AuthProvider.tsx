"use client"

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseBrowserClient'

type AuthState = {
  loading: boolean
  userId: string | null
  email: string | null
  /** Вошёл и есть в таблице admins */
  isAdmin: boolean
}

type AuthContextValue = AuthState & { signOut: () => Promise<void> }

const initial: AuthState = { loading: true, userId: null, email: null, isAdmin: false }
const AuthContext = createContext<AuthContextValue>({ ...initial, signOut: async () => {} })

async function resolve(session: Session | null): Promise<AuthState> {
  if (!session) return { loading: false, userId: null, email: null, isAdmin: false }
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (error) console.warn('Не удалось проверить права админа:', error)
  return {
    loading: false,
    userId: session.user.id,
    email: session.user.email ?? null,
    isAdmin: !!data,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initial)

  useEffect(() => {
    let active = true
    const apply = (session: Session | null) =>
      resolve(session).then((s) => { if (active) setState(s) })

    supabase.auth.getSession().then(({ data }) => apply(data.session))

    // Внутри колбэка нельзя ждать запросы к Supabase — откладываем через setTimeout
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(() => apply(session), 0)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setState({ loading: false, userId: null, email: null, isAdmin: false })
  }, [])

  return <AuthContext.Provider value={{ ...state, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
