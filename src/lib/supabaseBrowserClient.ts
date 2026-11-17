import { createBrowserClient } from '@supabase/ssr'

// Клиент для браузера. Сессия хранится в cookies, поэтому сервер (proxy.ts)
// тоже видит, кто вошёл.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
