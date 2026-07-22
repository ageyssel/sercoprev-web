import type { ReactNode } from 'react'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/AdminNav'
import { BrandLogo } from '@/components/BrandLogo'
import { AppIcon } from '@/components/AppIcon'
import { signOut } from '@/app/dashboard/actions'

export function AdminShell({ children, adminName }: { children: ReactNode; adminName: string }) {
  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#17324a]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-[#0f2438] px-5 py-6 lg:flex">
        <BrandLogo href="/admin" inverse />
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d6ad4d]">Administración</p>
          <p className="mt-2 truncate text-sm font-semibold text-white">{adminName}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Gestión contable, documental y operativa.</p>
        </div>
        <div className="mt-7 flex-1">
          <AdminNav />
        </div>
        <div className="space-y-2 border-t border-white/10 pt-5">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white">
            <AppIcon name="arrow-right" className="h-5 w-5 rotate-180" />
            Ver sitio público
          </Link>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-300 transition hover:bg-red-500/15 hover:text-red-200">
              <AppIcon name="x" className="h-5 w-5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <BrandLogo href="/admin" compact />
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 text-[#0f2438] [&::-webkit-details-marker]:hidden">
                <AppIcon name="menu" className="h-5 w-5" />
                <span className="sr-only">Abrir navegación</span>
              </summary>
              <div className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                <div className="mb-3 rounded-xl bg-[#f4f7f9] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Sesión</p>
                  <p className="mt-1 truncate text-sm font-bold text-[#0f2438]">{adminName}</p>
                </div>
                <AdminNav mobile />
                <form action={signOut} className="mt-2 border-t border-slate-100 pt-2">
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50">
                    <AppIcon name="x" className="h-5 w-5" /> Cerrar sesión
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
