import type { ReactNode } from 'react'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/AdminNav'
import { BrandLogo } from '@/components/BrandLogo'
import { AppIcon } from '@/components/AppIcon'
import { signOut } from '@/app/dashboard/actions'

export function AdminShell({ children, adminName }: { children: ReactNode; adminName: string }) {
  return (
    <div className="admin-shell min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col overflow-hidden border-r border-white/5 bg-[linear-gradient(180deg,#10283d_0%,#0b1f31_100%)] px-4 py-5 shadow-2xl shadow-[#0f2438]/10 lg:flex">
        <div className="px-2">
          <BrandLogo href="/admin" inverse />
        </div>

        <div className="mx-1 mt-6 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#cfa84b]/15 text-[#e5c979] ring-1 ring-[#cfa84b]/20">
              <AppIcon name="shield" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d8bc70]">Administración</p>
              <p className="mt-1 truncate text-xs font-bold text-white">{adminName}</p>
            </div>
          </div>
        </div>

        <div className="admin-scrollbar -mr-2 mt-5 flex-1 overflow-y-auto pr-2">
          <AdminNav />
        </div>

        <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/[0.07] hover:text-white">
            <AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />
            Ver sitio público
          </Link>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-red-200">
              <AppIcon name="x" className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <BrandLogo href="/admin" compact />
            <details className="group relative">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-[#10283d] shadow-sm hover:border-[#174f7a]/30 [&::-webkit-details-marker]:hidden">
                <AppIcon name="menu" className="h-5 w-5" />
                <span className="sr-only">Abrir navegación</span>
              </summary>
              <div className="absolute right-0 top-12 max-h-[calc(100vh-5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-[#10283d]/15">
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#f4f7fa] p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#174f7a] shadow-sm"><AppIcon name="shield" className="h-4 w-4" /></span>
                  <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Sesión</p><p className="mt-1 truncate text-xs font-bold text-[#10283d]">{adminName}</p></div>
                </div>
                <AdminNav mobile />
                <form action={signOut} className="mt-2 border-t border-slate-100 pt-2">
                  <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50">
                    <AppIcon name="x" className="h-4 w-4" /> Cerrar sesión
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-9 2xl:px-10">{children}</main>
      </div>
    </div>
  )
}
