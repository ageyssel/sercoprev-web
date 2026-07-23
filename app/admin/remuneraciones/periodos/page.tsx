import { AppIcon } from '@/components/AppIcon'
import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { PayrollPeriodForm } from '@/app/admin/components/PayrollForms'
import { calcularPeriodoConNovedades } from '@/app/admin/payroll-operations-actions'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null }
type Period = { id: string; periodo: string; estado: string; calculado_at: string | null; cerrado_at: string | null; parametros: { uf: number; utm: number; fuente: string | null; indicadores_verificados_at: string | null } | Array<{ uf: number; utm: number; fuente: string | null; indicadores_verificados_at: string | null }> | null }
const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default async function PayrollPeriodsPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const { data: periodRows, error } = selected ? await supabase.from('periodos_remuneraciones').select('id, periodo, estado, calculado_at, cerrado_at, parametros:parametros_remuneraciones(uf, utm, fuente, indicadores_verificados_at)').eq('empresa_id', selected.id).order('periodo', { ascending: false }).limit(36) : { data: [], error: null }
  const periods = (periodRows ?? []) as Period[]

  return (
    <div className="mx-auto max-w-[1250px]">
      <ModulePageHeader eyebrow="Remuneraciones · Ciclo mensual" title="Periodos y cálculo" description="Abra un mes sólo cuando sus parámetros legales estén guardados. El cálculo utiliza contrato vigente, novedades mensuales y parámetros versionados." help="Recalcular reemplaza la liquidación preliminar del periodo. Un periodo cerrado no debe modificarse sin rectificación y trazabilidad." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />
      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar los periodos.</div>}
      {!selected ? <Empty /> : <>
        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Abrir nuevo periodo <InfoTip>La apertura vincula el mes con una versión específica de parámetros. Por eso primero debe guardar UF, UTM, topes, tasas y tramos del mismo periodo.</InfoTip></h2><div className="mt-5"><PayrollPeriodForm companyId={selected.id} /></div></section>

        <section className="mt-7 grid gap-4">
          {periods.length === 0 ? <Empty text="No hay periodos abiertos o históricos." /> : periods.map((period) => { const legal = one(period.parametros); return <article key={period.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-[#0f2438]">{period.periodo.slice(0, 7)}</h2><StatusBadge status={period.estado} />{legal?.indicadores_verificados_at ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">UF/UTM trazadas</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">Revisar fuentes</span>}</div><p className="mt-2 text-sm text-slate-500">UF {legal?.uf ?? '—'} · UTM {legal?.utm ?? '—'}{period.calculado_at ? ` · calculado ${formatDate(period.calculado_at, { dateStyle: 'medium', timeStyle: 'short' })}` : ''}{period.cerrado_at ? ` · cerrado ${formatDate(period.cerrado_at)}` : ''}</p><p className="mt-1 text-xs text-slate-400">{legal?.fuente || 'Fuente general no registrada'}</p></div><div className="flex flex-wrap items-center gap-3">{period.estado !== 'Cerrado' && <form action={calcularPeriodoConNovedades}><input type="hidden" name="periodo_id" value={period.id} /><button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white"><AppIcon name="settings" className="h-4 w-4" />Calcular nómina</button></form>}<InfoTip title="Motor de cálculo">Por trabajador: sueldo proporcional y gratificación + haberes variables y asignaciones − AFP, salud, AFC, Impuesto Único y otros descuentos. Los aportes del empleador se informan aparte y no reducen el líquido.</InfoTip></div></div></article> })}
        </section>
      </>}
    </div>
  )
}

function Empty({ text = 'No hay empresas disponibles.' }: { text?: string }) { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">{text}</div> }
