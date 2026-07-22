import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'
import { BrandLogo } from '@/components/BrandLogo'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate, dueDateLabel } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/dashboard/actions'

export const dynamic = 'force-dynamic'

type Fee = {
  id: string
  periodo: string
  concepto: string
  monto: number
  fecha_emision: string | null
  fecha_vencimiento: string
  estado: string
  fecha_pago: string | null
  notas: string | null
}

export default async function ClientFeesPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  const { data: company, error: companyError } = await supabase.from('empresas').select('id, razon_social, es_admin, must_change_password').eq('user_id', user.id).single()
  if (companyError || !company) redirect('/login?message=Cuenta sin empresa asociada')
  if (company.es_admin) redirect('/admin')
  if (company.must_change_password) redirect('/cuenta/cambiar-clave')

  const { data, error } = await supabase.from('honorarios').select('id, periodo, concepto, monto, fecha_emision, fecha_vencimiento, estado, fecha_pago, notas').eq('empresa_id', company.id).order('fecha_vencimiento', { ascending: false }).limit(100)
  const fees = (data ?? []) as Fee[]
  const pending = fees.filter((item) => item.estado === 'Pendiente' || item.estado === 'Vencido')
  const paid = fees.filter((item) => item.estado === 'Pagado')
  const pendingAmount = pending.reduce((sum, item) => sum + Number(item.monto || 0), 0)
  const paidAmount = paid.reduce((sum, item) => sum + Number(item.monto || 0), 0)

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#17324a]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-4"><BrandLogo href="/dashboard" compact /><span className="hidden h-7 w-px bg-slate-200 sm:block" /><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a47b24]">Portal clientes</p></div><div className="flex items-center justify-between gap-3"><span className="max-w-[230px] truncate text-sm font-bold text-slate-600">{user.email}</span><form action={signOut}><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-red-50 hover:text-red-700">Cerrar sesión</button></form></div></div></header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />Volver al resumen</Link>
        <header className="mt-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Estado de cuenta</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Honorarios</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Cobros profesionales registrados por SERCOPREV y su estado de pago.</p></header>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar el estado de honorarios.</div>}

        <section className="mt-7 grid gap-4 sm:grid-cols-3"><MetricCard label="Pendientes" value={pending.length} detail={formatCurrency(pendingAmount)} icon="clock" tone={pending.length ? 'gold' : 'green'} /><MetricCard label="Pagados" value={paid.length} detail={formatCurrency(paidAmount)} icon="check" tone="green" /><MetricCard label="Historial" value={fees.length} detail="Registros disponibles" icon="money" tone="navy" /></section>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-5 sm:px-6"><h2 className="text-xl font-black text-[#0f2438]">Detalle de honorarios</h2><p className="mt-1 text-sm text-slate-500">Ante dudas sobre un cobro, utilice el módulo de consultas del portal.</p></div><div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead><tr className="bg-[#f8fafb] text-xs font-black uppercase tracking-[0.12em] text-slate-400"><th className="px-5 py-4">Periodo</th><th className="px-5 py-4">Concepto</th><th className="px-5 py-4">Vencimiento</th><th className="px-5 py-4 text-right">Monto</th><th className="px-5 py-4">Estado</th></tr></thead><tbody>{fees.length === 0 ? <tr><td colSpan={5} className="px-5 py-14 text-center text-slate-500">No hay honorarios publicados.</td></tr> : fees.map((fee) => <tr key={fee.id} className="border-t border-slate-100"><td className="px-5 py-4 font-black text-[#17324a]">{fee.periodo}</td><td className="px-5 py-4"><p className="font-bold text-slate-700">{fee.concepto}</p>{fee.notas && <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{fee.notas}</p>}</td><td className="px-5 py-4"><p className="font-bold text-[#17324a]">{formatDate(fee.fecha_vencimiento)}</p><p className="mt-1 text-xs text-slate-500">{fee.estado === 'Pagado' && fee.fecha_pago ? `Pagado ${formatDate(fee.fecha_pago)}` : dueDateLabel(fee.fecha_vencimiento)}</p></td><td className="px-5 py-4 text-right font-black text-[#134b78]">{formatCurrency(fee.monto)}</td><td className="px-5 py-4"><StatusBadge status={fee.estado} /></td></tr>)}</tbody></table></div></section>

        <div className="mt-6 flex justify-end"><Link href="/dashboard/consultas" className="inline-flex items-center gap-2 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white"><AppIcon name="message" className="h-4 w-4" />Consultar sobre honorarios</Link></div>
      </main>
    </div>
  )
}
