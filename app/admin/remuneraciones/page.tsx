import Link from 'next/link'
import { AppIcon, type AppIconName } from '@/components/AppIcon'
import { CalculationLabel, InfoTip } from '@/components/ui/InfoTip'
import { formatCurrency } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }

type ModuleCard = {
  href: string
  title: string
  description: string
  icon: AppIconName
  badge?: string
}

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
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Macromódulo laboral</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Remuneraciones</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Un flujo guiado para configurar, registrar novedades, calcular, revisar y cumplir. Cada pantalla muestra sólo las herramientas necesarias para esa etapa.</p>
        </div>
        <form method="get" className="flex gap-2">
          <select name="empresa" defaultValue={selected?.id ?? ''} className="h-11 min-w-[280px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nombre_fantasia || company.razon_social}</option>)}
          </select>
          <button className="h-11 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white">Abrir</button>
        </form>
      </header>

      {!selected ? <Empty /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon="users" label="Trabajadores activos" value={String(workers.count ?? 0)} help="Trabajadores con estado Activo en la empresa seleccionada." />
          <Metric icon="calendar" label="Periodos abiertos" value={String(openPeriods)} help="Periodos que aún no están cerrados y pueden recibir novedades o recálculos." />
          <Metric icon="tasks" label="Novedades pendientes" value={String(openInputs.count ?? 0)} help="Registros asociados a periodos no cerrados. Incluye días, ausencias, horas extra, bonos y descuentos." />
          <Metric icon="money" label="Líquido calculado" value={formatCurrency(net)} help="Suma del líquido de las liquidaciones consultadas: haberes totales menos descuentos legales y otros descuentos." />
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => <ModuleLink key={card.href} {...card} />)}
        </section>

        <section className="mt-7 rounded-3xl border border-[#134b78]/20 bg-[#eaf3f9] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#134b78]"><AppIcon name="shield" className="h-5 w-5" /></span>
            <div>
              <h2 className="inline-flex items-center text-lg font-black text-[#0f2438]">Flujo recomendado <InfoTip title="Por qué seguir este orden">El cálculo depende de contratos vigentes, parámetros legales verificables y novedades completas. Saltarse una etapa puede producir una liquidación incorrecta.</InfoTip></h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">1. Trabajadores y contratos · 2. Parámetros legales · 3. Abrir periodo · 4. Registrar novedades · 5. Calcular y revisar · 6. Cerrar y exportar.</p>
            </div>
          </div>
        </section>
      </>}
    </div>
  )
}

function Metric({ icon, label, value, help }: { icon: AppIconName; label: string; value: string; help: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><InfoTip>{help}</InfoTip></div><p className="mt-4 text-2xl font-black text-[#0f2438]">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500"><CalculationLabel label={label} help={help} /></p></article>
}

function ModuleLink({ href, title, description, icon, badge }: ModuleCard) {
  return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#134b78]/35 hover:shadow-md"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78] group-hover:bg-[#134b78] group-hover:text-white"><AppIcon name={icon} className="h-5 w-5" /></span>{badge && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{badge}</span>}</div><h2 className="mt-4 text-lg font-black text-[#0f2438]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#134b78]">Abrir sección <AppIcon name="arrow-right" className="h-4 w-4" /></span></Link>
}

function Empty() { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center font-bold text-slate-500">Cree al menos un cliente para utilizar remuneraciones.</div> }
