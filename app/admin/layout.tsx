import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  let context = null

  try {
    context = await resolveUserContext(supabase)
  } catch (error) {
    console.error('ADMIN_LAYOUT_CONTEXT_RESOLUTION_FAILED', error)
    redirect('/login?message=No fue posible cargar su sesión. Ingrese nuevamente')
  }

  if (!context) redirect('/login?message=La sesión no está habilitada para este portal')
  if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')
  if (context.kind !== 'staff') redirect('/dashboard')

  return <AdminShell adminName={`${context.displayName} · ${context.role}`}>{children}</AdminShell>
}
