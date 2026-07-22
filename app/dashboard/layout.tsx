import type { ReactNode } from 'react'
import { ClientPortalDock } from '@/components/client/ClientPortalDock'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pb-24 lg:pb-28">
      {children}
      <ClientPortalDock />
    </div>
  )
}
