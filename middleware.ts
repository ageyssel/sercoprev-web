import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicConfig } from './utils/supabase/config'
import {
  STAFF_MFA_CHALLENGE_COOKIE,
  STAFF_MFA_COOKIE,
  verifySignedStaffMfaToken,
} from './lib/staff-mfa-token'
import { isPrivilegedAdminRole } from './utils/supabase/role-access'

const PROTECTED_PREFIXES = ['/admin', '/dashboard', '/cuenta']
const PRIVILEGED_PREFIXES = ['/admin/usuarios', '/admin/auditoria', '/admin/configuracion']
const VERIFY_PATH = '/login/verificar-codigo'

function redirectWithSessionCookies(url: URL, source: NextResponse) {
  const target = NextResponse.redirect(url)
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie)
  })
  return target
}

export async function middleware(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isStaffRoute = pathname.startsWith('/admin')
  const isPrivilegedRoute = PRIVILEGED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isVerificationRoute = pathname === VERIFY_PATH

  if ((isProtectedRoute || isVerificationRoute) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('message', 'Debe iniciar sesión para continuar')
    return redirectWithSessionCookies(loginUrl, response)
  }

  if (user && (isStaffRoute || isVerificationRoute)) {
    const trusted = await verifySignedStaffMfaToken(
      request.cookies.get(STAFF_MFA_COOKIE)?.value,
      user.id,
      request.headers.get('user-agent'),
    )

    if (isVerificationRoute) {
      if (trusted) {
        const adminUrl = request.nextUrl.clone()
        adminUrl.pathname = '/admin'
        adminUrl.search = ''
        return redirectWithSessionCookies(adminUrl, response)
      }
      if (!request.cookies.get(STAFF_MFA_CHALLENGE_COOKIE)?.value) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search = ''
        loginUrl.searchParams.set('message', 'La verificación venció. Ingrese nuevamente')
        const redirectResponse = redirectWithSessionCookies(loginUrl, response)
        redirectResponse.cookies.delete(STAFF_MFA_COOKIE)
        redirectResponse.cookies.delete(STAFF_MFA_CHALLENGE_COOKIE)
        return redirectResponse
      }
    }

    if (isStaffRoute && !trusted) {
      const verifyUrl = request.nextUrl.clone()
      verifyUrl.pathname = VERIFY_PATH
      verifyUrl.search = ''
      verifyUrl.searchParams.set(
        'message',
        request.cookies.get(STAFF_MFA_CHALLENGE_COOKIE)?.value
          ? 'Complete la verificación enviada a su correo'
          : 'La autorización de seguridad venció. Ingrese nuevamente',
      )
      return redirectWithSessionCookies(verifyUrl, response)
    }

    if (isStaffRoute && isPrivilegedRoute && trusted) {
      const [{ data: directAdmin }, { data: staffProfile }] = await Promise.all([
        supabase.from('empresas').select('es_admin').eq('user_id', user.id).maybeSingle(),
        supabase.from('usuarios_organizacion').select('rol, activo').eq('user_id', user.id).maybeSingle(),
      ])

      const privileged = Boolean(directAdmin?.es_admin)
        || Boolean(staffProfile?.activo && isPrivilegedAdminRole(staffProfile.rol))

      if (!privileged) {
        const adminUrl = request.nextUrl.clone()
        adminUrl.pathname = '/admin'
        adminUrl.search = ''
        adminUrl.searchParams.set('message', 'Su rol no tiene acceso a configuración, usuarios ni auditoría')
        return redirectWithSessionCookies(adminUrl, response)
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/cuenta/:path*', '/login/verificar-codigo'],
}
