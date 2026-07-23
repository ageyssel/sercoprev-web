import Link from 'next/link'
import { AppIcon, type AppIconName } from '@/components/AppIcon'
import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { MetricCard } from '@/components/ui/MetricCard'
import { formatCurrency } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type ModuleCard = { href: string; title: string; description: string; icon: AppIconName; badge?: string }

export default async function PayrollOverview({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const empty = { count: 0, data: [], error: null }

  const [workers, periods, payslips, openInputs] = selected ? await Promise.all([
    supabase.from('trabajadores').select('id', { count: 'exact', head: true }).eq('empresa_id', selected.id).eq('estado', 'Activo'),
    supabase.from('periodos_remuneraciones').select('id, estado', { count: 'exact' }).eq('empresa_id', selected.id),
    supabase.from('liquidaciones').select('liquido_pagar, periodo:periodos_remuneraciones!inner(empresa_id)').eq('periodo.empresa_id', selected.id).limit(1000),
    supabase.from('novedades_remuneraciones').select('id, periodo:periodos_remuneraciones!inner(empresa_id, estado)', { count: 'exact' }).eq('periodo.empresa_id', selected.id).neq('periodo.estado', 'Cerrado'),
  ]) : [empty, empty, empty, empty]

  const net = (payslips.data ?? []).reduce((sum, item) => sum + Number(item.liquido_pagar || 0), 0)
  const openPeriods = (periods.data ?? []).filter((item) => item.estado !== 'Cerrado').length
  const companyQuery = selected ? `?empresa=${selected.id}` : ''
  const cards: ModuleCard[] = [
    { href: `/admin/remuneraciones/trabajadores${companyQuery}`, title: 'Trabajadores', description: 'Ficha personal, previsional, salud, AFC, asignación familiar y centro de costo.', icon: 'users', badge: `${workers.count ?? 0} activos` },
    { href: `/admin/remuneraciones/contratos${companyQuery}`, title: 'Contratos', description: 'Condiciones, jornada, sueldo base, gratificación, asignaciones e historial contractual.', icon: 'document' },
    { href: `/admin/remuneraciones/parametros${companyQuery}`, title: 'Parámetros legales', description: 'UF y UTM oficiales por fecha, topes, tasas previsionales e Impuesto Único.', icon: 'shield' },
    { href: `/admin/remuneraciones/periodos${companyQuery}`, title: 'Periodos y cálculo', description: 'Apertura, cálculo, revisión, cierre y rectificaciones con parámetros versionados.', icon: 'calendar', badge: `${openPeriods} abiertos` },
    { href: `/admin/remuneraciones/gestion${companyQuery}`, title: 'Novedades laborales', description: 'Ausencias, licencias, vacaciones, horas extra, bonos, descuentos y finiquitos.', icon: 'plus', badge: `${openInputs.count ?? 0} registros` },
    { href: `/admin/remuneraciones/liquidaciones${companyQuery}`, title: 'Liquidaciones', description: 'Resultados por trabajador, detalle de haberes, descuentos, aportes y líquido.', icon: 'money' },
    { href: `/admin/remuneraciones/exportaciones${companyQuery}`, title: 'Cumplimiento y exportaciones', description: 'Preparación controlada de PREVIRED, LRE, DJ 1887 y archivos internos.', icon: 'download' },
  ]

  return (
    <div className="mx-auto max-w-[1450px]">
      <ModulePageHeader eyebrow="Macromódulo laboral" title="Remuneraciones" description="Flujo guiado para configurar, registrar novedades, calcular, revisar, cerrar y exportar con el contexto correcto de cada empresa." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />

      {!selected ? <Empty /> : <>
        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="users" label="Trabajadores activos" value={String(workers.count ?? 0)} detail="Fichas laborales habilitadas" tone="blue" />
          <MetricCard icon="calendar" label="Periodos abiertos" value={String(openPeriods)} detail="Disponibles para gestionar" tone="navy" />
          <MetricCard icon="tasks" label="Novedades pendientes" value={String(openInputs.count ?? 0)} detail="Registros en periodos abiertos" tone="gold" />
          <MetricCard icon="money" label="Líquido calculado" value={formatCurrency(net)} detail="Liquidaciones consultadas" tone="green" />
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => <ModuleLink key={card.href} {...card} />)}
        </section>

        <section className="mt-6 rounded-2xl border border-[#174f7a]/15 bg-[#edf4f9] p-5 shadow-none">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#174f7a] shadow-sm"><AppIcon name="shield" className="h-4 w-4" /></span><div><h2 className="inline-flex items-center text-base font-extrabold text-[#10283d]">Flujo recomendado <InfoTip title="Por qué seguir este orden">El cálculo depende de contratos vigentes, parámetros legales verificables y novedades completas. Saltarse una etapa puede producir una liquidación incorrecta.</InfoTip></h2><p className="mt-1.5 text-xs font-medium leading-5 text-slate-600">1. Trabajadores y contratos · 2. Parámetros legales · 3. Abrir periodo · 4. Registrar novedades · 5. Calcular y revisar · 6. Cerrar y exportar.</p></div></div>
        </section>
      </>}
    </div>
  )
}

function ModuleLink({ href, title, description, icon, badge }: ModuleCard) {
  return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:border-[#174f7a]/25 hover:shadow-md sm:p-5"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4f9] text-[#174f7a] group-hover:bg-[#174f7a] group-hover:text-white"><AppIcon name={icon} className="h-4 w-4" /></span>{badge && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-500">{badge}</span>}</div><h2 className="mt-3.5 text-base font-extrabold text-[#10283d]">{title}</h2><p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">{description}</p><span className="mt-3.5 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#174f7a]">Abrir sección <AppIcon name="arrow-right" className="h-3.5 w-3.5" /></span></Link>
}

function Empty() { return <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500">Cree al menos un cliente para utilizar remuneraciones.</div> }
