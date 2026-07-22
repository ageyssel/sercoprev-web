'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppIcon, type AppIconName } from '@/components/AppIcon'

const items: Array<{ href: string; label: string; icon: AppIconName; exact?: boolean }> = [
  { href: '/dashboard', label: 'Resumen', icon: 'dashboard', exact: true },
  { href: '/dashboard/cobranza', label: 'Honorarios', icon: 'money' },
  { href: '/dashboard/consultas', label: 'Consultas', icon: 'message' },
]

export function ClientPortalDock() {
  const pathname = usePathname()
  return (
    <nav aria-label="Navegación del portal de clientes" className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-[#0f2438]/20 backdrop-blur lg:bottom-6">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return <Link key={item.href} href={item.href} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-black transition sm:flex-row sm:justify-center sm:text-xs ${active ? 'bg-[#0f2438] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-[#17324a]'}`}><AppIcon name={item.icon} className="h-4 w-4" /><span className="truncate">{item.label}</span></Link>
      })}
    </nav>
  )
}
