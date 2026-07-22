import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('empresas')
    .select('razon_social, es_admin')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.es_admin) redirect('/dashboard')

  return <AdminShell adminName={profile.razon_social}>{children}</AdminShell>
}
