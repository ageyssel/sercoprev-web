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
    { href: '/admin/contabilidad/reportes', label: 'Reportes', icon: 'tasks' },
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

  return (
    <div className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <nav aria-label={module === 'accounting' ? 'Secciones de contabilidad' : 'Secciones de remuneraciones'} className="flex gap-1 overflow-x-auto p-2">
        {moduleItems[module].map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const href = company ? `${item.href}?empresa=${encodeURIComponent(company)}` : item.href
          return (
            <Link
              key={item.href}
              href={href}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6ad4d] ${active ? 'bg-[#0f2438] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0f2438]'}`}
            >
              <AppIcon name={item.icon} className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
