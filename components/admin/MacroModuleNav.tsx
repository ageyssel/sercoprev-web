'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { AppIcon, type AppIconName } from '@/components/AppIcon'

type ModuleKind = 'accounting' | 'payroll'
type Item = { href: string; label: string; icon: AppIconName; exact?: boolean }

const moduleItems: Record<ModuleKind, Item[]> = {
  accounting: [
    { href: '/admin/contabilidad', label: 'Inicio', icon: 'dashboard', exact: true },
    { href: '/admin/contabilidad/configuracion', label: 'Configuración', icon: 'settings' },
    { href: '/admin/contabilidad/diario', label: 'Libro diario', icon: 'document' },
    { href: '/admin/contabilidad/documentos', label: 'Compras y ventas', icon: 'money' },
    { href: '/admin/contabilidad/importaciones', label: 'RCV y cartolas', icon: 'upload' },
    { href: '/admin/contabilidad/reportes', label: 'Reportes y rentabilidad', icon: 'tasks' },
  ],
  payroll: [
    { href: '/admin/remuneraciones', label: 'Inicio', icon: 'dashboard', exact: true },
    { href: '/admin/remuneraciones/trabajadores', label: 'Trabajadores', icon: 'users' },
    { href: '/admin/remuneraciones/contratos', label: 'Contratos', icon: 'document' },
    { href: '/admin/remuneraciones/parametros', label: 'Parámetros legales', icon: 'shield' },
    { href: '/admin/remuneraciones/periodos', label: 'Periodos', icon: 'calendar' },
    { href: '/admin/remuneraciones/gestion', label: 'Novedades', icon: 'plus' },
    { href: '/admin/remuneraciones/liquidaciones', label: 'Liquidaciones', icon: 'money' },
    { href: '/admin/remuneraciones/exportaciones', label: 'Exportaciones', icon: 'download' },
  ],
}

export function MacroModuleNav({ module }: { module: ModuleKind }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const company = searchParams.get('empresa')
  const label = module === 'accounting' ? 'Contabilidad y rentabilidad' : 'Remuneraciones'

  return (
    <div className="mb-8 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_10px_30px_rgba(15,36,56,0.055)] backdrop-blur">
      <div className="flex items-center gap-2 border-b border-slate-100 px-2 pb-2 pt-1 md:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf4f9] text-[#174f7a]"><AppIcon name={module === 'accounting' ? 'document' : 'briefcase'} className="h-3.5 w-3.5" /></span>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      </div>
      <nav aria-label={module === 'accounting' ? 'Secciones de contabilidad' : 'Secciones de remuneraciones'} className="admin-scrollbar flex gap-1 overflow-x-auto pt-2 md:pt-0">
        {moduleItems[module].map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const href = company ? `${item.href}?empresa=${encodeURIComponent(company)}` : item.href
          return (
            <Link
              key={item.href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cfa84b] ${active ? 'bg-[#10283d] text-white shadow-sm' : 'text-slate-600 hover:bg-[#f3f7fa] hover:text-[#10283d]'}`}
            >
              <AppIcon name={item.icon} className={`h-3.5 w-3.5 ${active ? 'text-[#e6ce89]' : 'text-slate-400 group-hover:text-[#174f7a]'}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
