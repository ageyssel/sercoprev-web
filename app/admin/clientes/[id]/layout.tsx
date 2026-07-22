import type { ReactNode } from 'react'
import { ClientWorkspaceNav } from '@/components/admin/ClientWorkspaceNav'

export default async function ClientWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <ClientWorkspaceNav companyId={id} />
      {children}
    </div>
  )
}
