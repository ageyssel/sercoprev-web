'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppIcon, type AppIconName } from '@/components/AppIcon'

type Item = { href: string; label: string; icon: AppIconName; exact?: boolean; badge?: string }
type Group = { label: string; items: Item[] }

const groups: Group[] = [
  {
    label: 'Cartera y comercial',
    items: [
      { href: '/admin', label: 'Resumen', icon: 'dashboard', exact: true },
      { href: '/admin/clientes', label: 'Clientes', icon: 'users' },
      { href: '/admin/leads', label: 'Prospectos', icon: 'lead', badge: 'Landing' },
    ],
  },
  {
    label: 'Gestión operativa',
    items: [
      { href: '/admin/operaciones', label: 'Obligaciones y tareas', icon: 'tasks' },
      { href: '/admin/documentos-masivos', label: 'Documentos', icon: 'folder' },
      { href: '/admin/cobranza', label: 'Honorarios y cobranza', icon: 'money' },
      { href: '/admin/tickets', label: 'Consultas', icon: 'message' },
      { href: '/admin/notificaciones', label: 'Notificaciones', icon: 'inbox' },
    ],
  },
  {
    label: 'Especialidades',
    items: [
      { href: '/admin/indicadores', label: 'Indicadores oficiales', icon: 'money', badge: 'Auto' },
      { href: '/admin/contabilidad', label: 'Contabilidad y rentabilidad', icon: 'document' },
      { href: '/admin/remuneraciones', label: 'Remuneraciones', icon: 'briefcase' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/admin/usuarios', label: 'Usuarios y accesos', icon: 'shield' },
    ],
  },
]

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Navegación de administración" className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className={`mb-1.5 px-3 text-[9px] font-extrabold uppercase tracking-[0.19em] ${mobile ? 'text-slate-400' : 'text-slate-500'}`}>{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cfa84b] ${
                    active
                      ? mobile
                        ? 'bg-[#10283d] text-white shadow-sm'
                        : 'bg-white text-[#10283d] shadow-[0_8px_24px_rgba(0,0,0,0.16)]'
                      : mobile
                        ? 'text-slate-700 hover:bg-slate-100 hover:text-[#10283d]'
                        : 'text-slate-300 hover:bg-white/[0.065] hover:text-white'
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${active ? (mobile ? 'bg-white/10 text-[#e5c979]' : 'bg-[#edf4f9] text-[#174f7a]') : mobile ? 'bg-slate-100 text-slate-500 group-hover:bg-white' : 'bg-white/[0.055] text-slate-400 group-hover:text-white'}`}>
                    <AppIcon name={item.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 leading-4">{item.label}</span>
                  {item.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${active ? (mobile ? 'bg-[#cfa84b]/20 text-[#f0d88f]' : 'bg-[#fbf6e8] text-[#8a681d]') : mobile ? 'bg-amber-50 text-amber-700' : 'bg-[#cfa84b]/15 text-[#e5c979]'}`}>{item.badge}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
