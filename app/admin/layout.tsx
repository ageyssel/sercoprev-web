import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const context = await resolveUserContext(supabase)

  if (!context) redirect('/login')
  if (context.kind !== 'staff') redirect('/dashboard')

  return <AdminShell adminName={`${context.displayName} · ${context.role}`}>{children}</AdminShell>
}
