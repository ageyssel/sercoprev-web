import type { SupabaseClient, User } from '@supabase/supabase-js'
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

export async function resolveUserContext(existingClient?: SupabaseClient): Promise<UserContext | null> {
  const supabase = existingClient ?? await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  const { data: directProfile } = await supabase
    .from('empresas')
    .select('id, razon_social, nombre_fantasia, es_admin, must_change_password')
    .eq('user_id', user.id)
    .maybeSingle()

  if (directProfile?.es_admin) {
    return {
      kind: 'staff',
      user,
      displayName: directProfile.razon_social || user.email || 'Administrador SERCOPREV',
      role: 'Superadministrador',
      canWrite: true,
    }
  }

  const { data: staffProfile } = await supabase
    .from('usuarios_organizacion')
    .select('nombre, rol, activo')
    .eq('user_id', user.id)
    .eq('activo', true)
    .maybeSingle()

  if (staffProfile) {
    const role = staffProfile.rol as StaffRole
    return {
      kind: 'staff',
      user,
      displayName: staffProfile.nombre,
      role,
      canWrite: role !== 'Lectura',
    }
  }

  if (directProfile && !directProfile.es_admin) {
    return {
      kind: 'client',
      user,
      displayName: directProfile.nombre_fantasia || directProfile.razon_social,
      role: 'Administrador cliente',
      companyId: directProfile.id,
      companyName: directProfile.nombre_fantasia || directProfile.razon_social,
      mustChangePassword: directProfile.must_change_password,
    }
  }

  const { data: membership } = await supabase
    .from('empresa_usuarios')
    .select('empresa_id, nombre, rol, must_change_password, empresa:empresas(razon_social, nombre_fantasia)')
    .eq('user_id', user.id)
    .eq('activo', true)
    .maybeSingle()

  if (!membership) return null
  const relation = membership.empresa as unknown as { razon_social: string; nombre_fantasia: string | null } | Array<{ razon_social: string; nombre_fantasia: string | null }> | null
  const company = Array.isArray(relation) ? relation[0] : relation
  if (!company) return null

  return {
    kind: 'client',
    user,
    displayName: membership.nombre,
    role: membership.rol as ClientRole,
    companyId: membership.empresa_id,
    companyName: company.nombre_fantasia || company.razon_social,
    mustChangePassword: membership.must_change_password,
  }
}
