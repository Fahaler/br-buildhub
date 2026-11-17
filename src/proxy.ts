import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Обновляет сессию входа в cookies на каждом запросе.
// Отдельных админских страниц сейчас нет: редактор живёт на главной и показывается только админам.
// Если такие страницы появятся — впишите их сюда, гостей будет перекидывать на /login.
// Настоящая защита данных — правила RLS в базе.
const ADMIN_PATHS: string[] = []

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )

  // Обновляет сессию (при необходимости) и проверяет токен.
  const { data } = await supabase.auth.getClaims()
  const userId = (data?.claims?.sub as string | undefined) ?? null

  const { pathname } = request.nextUrl
  if (!isAdminPath(pathname)) return response

  let isAdmin = false
  if (userId) {
    const { data: row } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    isAdmin = !!row
  }

  if (isAdmin) return response

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  loginUrl.searchParams.set('next', pathname)
  if (userId) loginUrl.searchParams.set('error', 'not_admin')

  const redirect = NextResponse.redirect(loginUrl)
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
