import type { StaffRole } from '@/utils/supabase/user-context'

export const PRIVILEGED_ADMIN_ROLES: readonly StaffRole[] = [
  'Superadministrador',
  'Administrador',
]

export function isPrivilegedAdminRole(role: string | null | undefined): role is 'Superadministrador' | 'Administrador' {
  return role === 'Superadministrador' || role === 'Administrador'
}
