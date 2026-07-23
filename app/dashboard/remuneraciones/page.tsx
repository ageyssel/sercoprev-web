import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'
import { BrandLogo } from '@/components/BrandLogo'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { requireClientCompany } from '@/utils/supabase/require-client'
import { signOut } from '@/app/dashboard/actions'

export const dynamic = 'force-dynamic'

type Relation<T> = T | T[] | null
const one = <T,>(value: Relation<T>) => Array.isArray(value) ? value[0] : value

type Detail = { id: string; codigo: string; descripcion: string; naturaleza: string; monto: number; orden: number }
type Payslip = {
  id: string
  sueldo_base: number
  total_imponible: number
  total_tributable: number
  total_no_imponible: number
  descuentos_legales: number
  otros_descuentos: number
  aportes_empleador: number
  liquido_pagar: number
  estado: string
  trabajador: Relation<{ rut: string; nombres: string; apellido_paterno: string; apellido_materno: string | null }>
  periodo: Relation<{ periodo: string; estado: string; cerrado_at: string | null }>
  detalles: Detail[]
}

export default async function ClientPayrollPage() {
  let access: Awaited<ReturnType<typeof requireClientCompany>>
  try { access = await requireClientCompany() } catch { redirect('/login?message=Cuenta sin empresa asociada') }
  if (access.mustChangePassword) redirect('/cuenta/cambiar-clave')

  const { data, error } = await access.sessionClient
    .from('liquidaciones')
    .select('id, sueldo_base, total_imponible, total_tributable, total_no_imponible, descuentos_legales, otros_descuentos, aportes_empleador, liquido_pagar, estado, trabajador:trabajadores(rut, nombres, apellido_paterno, apellido_materno), periodo:periodos_remuneraciones!inner(periodo, estado, cerrado_at, empresa_id), detalles:liquidacion_detalles(id, codigo, descripcion, naturaleza, monto, orden)')
    .eq('periodo.empresa_id', access.company.id)
    .eq('periodo.estado', 'Cerrado')
    .in('estado', ['Revisada', 'Enviada', 'Pagada'])
    .order('created_at', { ascending: false })
    .limit(300)

  const payslips = ((data ?? []) as Payslip[]).map((item) => ({ ...item, detalles: [...(item.detalles ?? [])].sort((a, b) => a.orden - b.orden) }))
  const periods = Array.from(new Set(payslips.map((item) => one(item.periodo)?.periodo?.slice(0, 7)).filter(Boolean)))
  const totalNet = payslips.reduce((sum, item) => sum + Number(item.liquido_pagar || 0), 0)
  const totalEmployer = payslips.reduce((sum, item) => sum + Number(item.aportes_empleador || 0), 0)

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#17324a]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-4"><BrandLogo href="/dashboard" compact /><span className="hidden h-7 w-px bg-slate-200 sm:block" /><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a47b24]">Portal clientes</p><p className="text-sm font-bold text-slate-500">{access.displayName} · {access.role}</p></div></div><div className="flex items-center gap-3"><span className="max-w-[230px] truncate text-sm font-bold text-slate-600">{access.user.email}</span><form action={signOut}><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-red-50 hover:text-red-700">Cerrar sesión</button></form></div></div></header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />Volver al resumen</Link>
        <header className="mt-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Información laboral de la empresa</p><h1 className="mt-2 text-3xl font-black text-[#0f2438] sm:text-4xl">Remuneraciones</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Liquidaciones de periodos cerrados y revisados por SERCOPREV. Esta vista está aislada para su empresa.</p></header>
        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar las remuneraciones.</div>}

        <section className="mt-7 grid gap-4 sm:grid-cols-3"><Metric icon="calendar" label="Periodos publicados" value={String(periods.length)} /><Metric icon="users" label="Liquidaciones" value={String(payslips.length)} /><Metric icon="money" label="Líquido acumulado" value={formatCurrency(totalNet)} /></section>
        <section className="mt-7 rounded-3xl border border-[#134b78]/20 bg-[#eaf3f9] p-5 text-sm leading-6 text-[#17324a]"><p className="font-black">Privacidad de la información</p><p className="mt-1">Los datos corresponden exclusivamente a {access.company.name}. Restrinja estos accesos a personas autorizadas, porque contienen información laboral y previsional sensible.</p></section>

        <section className="mt-7 grid gap-5">{payslips.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center"><AppIcon name="briefcase" className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-4 font-bold text-slate-500">No hay periodos cerrados publicados.</p></div> : payslips.map((item) => { const worker = one(item.trabajador); const period = one(item.periodo); return <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-[#0f2438]">{worker ? `${worker.nombres} ${worker.apellido_paterno} ${worker.apellido_materno ?? ''}`.trim() : 'Trabajador'}</h2><StatusBadge status={item.estado} /></div><p className="mt-1 text-sm text-slate-500">RUT {worker?.rut || '—'} · periodo {period?.periodo?.slice(0, 7) || '—'}{period?.cerrado_at ? ` · publicado ${formatDate(period.cerrado_at)}` : ''}</p></div><p className="text-2xl font-black text-[#134b78]">{formatCurrency(item.liquido_pagar)}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Amount label="Sueldo base" value={item.sueldo_base} /><Amount label="Imponible" value={item.total_imponible} /><Amount label="No imponible" value={item.total_no_imponible} /><Amount label="Descuentos" value={Number(item.descuentos_legales) + Number(item.otros_descuentos)} /><Amount label="Aportes empleador" value={item.aportes_empleador} /></div><details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-black text-[#134b78]">Ver detalle de conceptos</summary><div className="mt-4 overflow-x-auto"><table className="min-w-[650px] w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500"><th className="px-3 py-3">Código</th><th className="px-3 py-3">Concepto</th><th className="px-3 py-3">Naturaleza</th><th className="px-3 py-3 text-right">Monto</th></tr></thead><tbody>{item.detalles.map((detail) => <tr key={detail.id} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{detail.codigo}</td><td className="px-3 py-3">{detail.descripcion}</td><td className="px-3 py-3"><StatusBadge status={detail.naturaleza} /></td><td className="px-3 py-3 text-right font-black">{formatCurrency(detail.monto)}</td></tr>)}</tbody></table></div></details></article> })}</section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><AppIcon name="briefcase" className="h-6 w-6 text-[#134b78]" /><div><h2 className="text-xl font-black text-[#0f2438]">Costo empleador informado</h2><p className="mt-1 text-sm text-slate-500">Suma de aportes registrados en las liquidaciones publicadas.</p></div></div><p className="mt-5 text-3xl font-black text-[#134b78]">{formatCurrency(totalEmployer)}</p></section>
      </main>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: 'calendar' | 'users' | 'money'; label: string; value: string }) { return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase text-slate-500">{label}</p></div></article> }
function Amount({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-400">{label}</p><p className="mt-1 font-black text-[#17324a]">{formatCurrency(value)}</p></div> }
