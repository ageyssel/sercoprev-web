'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppIcon, type AppIconName } from '@/components/AppIcon'

const items: Array<{ href: string; label: string; icon: AppIconName; exact?: boolean }> = [
  { href: '/admin', label: 'Resumen', icon: 'dashboard', exact: true },
  { href: '/admin/clientes', label: 'Clientes', icon: 'users' },
  { href: '/admin/contabilidad', label: 'Contabilidad', icon: 'document' },
  { href: '/admin/remuneraciones', label: 'Remuneraciones', icon: 'briefcase' },
  { href: '/admin/operaciones', label: 'Obligaciones y tareas', icon: 'tasks' },
  { href: '/admin/documentos-masivos', label: 'Documentos', icon: 'folder' },
  { href: '/admin/cobranza', label: 'Honorarios y cobranza', icon: 'money' },
  { href: '/admin/tickets', label: 'Consultas', icon: 'message' },
  { href: '/admin/notificaciones', label: 'Notificaciones', icon: 'inbox' },
  { href: '/admin/usuarios', label: 'Usuarios y accesos', icon: 'shield' },
  { href: '/admin/leads', label: 'Prospectos', icon: 'lead' },
]

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Navegación de administración" className={mobile ? 'grid gap-1' : 'space-y-1'}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6ad4d] ${
              active
                ? 'bg-white text-[#0f2438] shadow-sm'
                : mobile
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <AppIcon name={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
