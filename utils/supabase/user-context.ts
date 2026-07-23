import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export type StaffRole = 'Superadministrador' | 'Administrador' | 'Contador' | 'Remuneraciones' | 'Cobranza' | 'Lectura'
export type ClientRole = 'Administrador cliente' | 'Operador' | 'Solo lectura'

export type UserContext =
  | {
      kind: 'staff'
      user: User
      displayName: string
      role: StaffRole
      canWrite: boolean
      mustChangePassword: boolean
    }
  | {
      kind: 'client'
      user: User
      displayName: string
      role: ClientRole
      companyId: string
      companyName: string
      mustChangePassword: boolean
    }

function directoryClient(fallback: SupabaseClient) {
  try {
    // La sesión se valida primero con auth.getUser(). Después consultamos el
    // directorio por el user_id validado, evitando ciclos de RLS al resolver
    // perfiles internos y membresías multiempresa.
    return createAdminClient()
  } catch (error) {
    console.error('USER_CONTEXT_ADMIN_CLIENT_UNAVAILABLE', error)
    return fallback
  }
}

function logQueryError(scope: string, error: { code?: string; message?: string } | null) {
  if (!error) return
  console.error(`USER_CONTEXT_${scope}_QUERY_FAILED`, {
    code: error.code ?? 'unknown',
    message: error.message ?? 'unknown',
  })
}

export async function resolveUserContext(existingClient?: SupabaseClient): Promise<UserContext | null> {
  const supabase = existingClient ?? await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  const directory = directoryClient(supabase)
  const { data: directProfile, error: directProfileError } = await directory
    .from('empresas')
    .select('id, razon_social, es_admin, must_change_password')
    .eq('user_id', user.id)
    .maybeSingle()
  logQueryError('DIRECT_PROFILE', directProfileError)

  if (directProfile?.es_admin) {
    return {
      kind: 'staff',
      user,
      displayName: directProfile.razon_social || user.email || 'Administrador SERCOPREV',
      role: 'Superadministrador',
      canWrite: true,
      mustChangePassword: Boolean(directProfile.must_change_password),
    }
  }

  const { data: staffProfile, error: staffProfileError } = await directory
    .from('usuarios_organizacion')
    .select('nombre, rol, activo, must_change_password')
    .eq('user_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()
  logQueryError('STAFF_PROFILE', staffProfileError)

  if (staffProfile) {
    const role = staffProfile.rol as StaffRole
    return {
      kind: 'staff',
      user,
      displayName: staffProfile.nombre,
      role,
      canWrite: role !== 'Lectura',
      mustChangePassword: Boolean(staffProfile.must_change_password),
    }
  }

  if (directProfile && !directProfile.es_admin) {
    return {
      kind: 'client',
      user,
      displayName: directProfile.razon_social,
      role: 'Administrador cliente',
      companyId: directProfile.id,
      companyName: directProfile.razon_social,
      mustChangePassword: Boolean(directProfile.must_change_password),
    }
  }

  const { data: membership, error: membershipError } = await directory
    .from('empresa_usuarios')
    .select('empresa_id, nombre, rol, must_change_password, empresa:empresas(razon_social)')
    .eq('user_id', user.id)
    .eq('activo', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  logQueryError('CLIENT_MEMBERSHIP', membershipError)

  if (!membership) return null
  const relation = membership.empresa as unknown as { razon_social: string } | Array<{ razon_social: string }> | null
  const company = Array.isArray(relation) ? relation[0] : relation
  if (!company) return null

  return {
    kind: 'client',
    user,
    displayName: membership.nombre,
    role: membership.rol as ClientRole,
    companyId: membership.empresa_id,
    companyName: company.razon_social,
    mustChangePassword: Boolean(membership.must_change_password),
  }
}
