import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicConfig } from './utils/supabase/config'

const PROTECTED_PREFIXES = ['/admin', '/dashboard', '/cuenta']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, publishableKey } = getSupabasePublicConfig()

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({ request })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  )

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('message', 'Debe iniciar sesión para continuar')
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/cuenta/:path*'],
}
