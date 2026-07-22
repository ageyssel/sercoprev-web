import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { BrandLogo } from '@/components/BrandLogo'
import { SubmitButton } from '@/app/admin/components/SubmitButton'
import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-[#edf2f5] px-4 py-8 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-[#0f2438]/10 lg:grid-cols-[.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#0f2438] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-[#d6ad4d]/10 blur-3xl" />
          <div className="relative"><BrandLogo inverse /><p className="mt-14 text-xs font-black uppercase tracking-[0.2em] text-[#e3bf63]">Portal privado SERCOPREV</p><h1 className="mt-5 text-4xl font-black leading-tight tracking-tight">Toda la información de su empresa, organizada en un solo lugar.</h1><p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Revise obligaciones, solicitudes documentales, antecedentes financieros y archivos publicados por su equipo contable.</p></div>
          <ul className="relative grid gap-3 text-sm text-slate-300">
            {['Acceso individual y protegido', 'Documentos con enlaces temporales', 'Información aislada por empresa'].map((item) => <li key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><AppIcon name="check" className="h-4 w-4" /></span>{item}</li>)}
          </ul>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="lg:hidden"><BrandLogo /></div>
            <Link href="/" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline lg:mt-0"><AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />Volver al sitio</Link>
            <div className="mt-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Acceso seguro</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#0f2438]">Ingrese a su portal</h2><p className="mt-2 text-sm leading-6 text-slate-500">Utilice el correo registrado por SERCOPREV y su contraseña personal.</p></div>

            <form action={login} className="mt-8 grid gap-5">
              <label className="grid gap-2 text-sm font-bold text-slate-700">Correo electrónico<div className="relative"><AppIcon name="inbox" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="email" type="email" required autoComplete="email" placeholder="cliente@empresa.cl" className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium text-[#17324a] outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10" /></div></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Contraseña<div className="relative"><AppIcon name="shield" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••••••" className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium text-[#17324a] outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10" /></div></label>

              {params.message && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{params.message}</div>}

              <SubmitButton text="Ingresar a mi cuenta" loadingText="Verificando acceso…" className="min-h-12 w-full rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#0f2438]/10 transition hover:bg-[#173d5c]" />
            </form>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-[#f8fafb] p-4 text-sm leading-6 text-slate-600"><p className="font-black text-[#17324a]">¿Tiene problemas para ingresar?</p><p className="mt-1">Solicite apoyo a <a href="mailto:contabilidad@sercoprev.cl" className="font-bold text-[#134b78] hover:underline">contabilidad@sercoprev.cl</a> o llame al <a href="tel:+56993316939" className="font-bold text-[#134b78] hover:underline">+56 9 9331 6939</a>.</p></div>
          </div>
        </section>
      </div>
    </main>
  )
}
