'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'

export function ClientWorkspaceNav({ companyId }: { companyId: string }) {
  const pathname = usePathname()
  const items = [
    { href: `/admin/clientes/${companyId}`, label: 'Ficha operativa', icon: 'building' as const, exact: true },
    { href: `/admin/clientes/${companyId}/gestion`, label: 'Contactos, honorarios y consultas', icon: 'briefcase' as const, exact: false },
  ]

  return (
    <nav aria-label="Secciones de la ficha del cliente" className="mx-auto mb-5 flex max-w-[1500px] flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return <Link key={item.href} href={item.href} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${active ? 'bg-[#0f2438] text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-[#17324a]'}`}><AppIcon name={item.icon} className="h-4 w-4" />{item.label}</Link>
      })}
    </nav>
  )
}
