import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type Period = { id: string; periodo: string; estado: string }

export default async function PayrollExportsPage({ searchParams }: { searchParams: Promise<{ empresa?: string; periodo?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selectedCompany = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const { data: periodRows, error } = selectedCompany
    ? await supabase.from('periodos_remuneraciones').select('id, periodo, estado').eq('empresa_id', selectedCompany.id).order('periodo', { ascending: false }).limit(36)
    : { data: [], error: null }
  const periods = (periodRows ?? []) as Period[]
  const selectedPeriod = periods.find((item) => item.periodo.slice(0, 7) === params.periodo) ?? periods[0] ?? null
  const query = selectedCompany ? `empresa=${selectedCompany.id}${selectedPeriod ? `&periodo=${selectedPeriod.periodo.slice(0, 7)}` : ''}` : ''

  return (
    <div className="mx-auto max-w-[1250px]">
      <Link href={selectedCompany ? `/admin/remuneraciones?empresa=${selectedCompany.id}` : '/admin/remuneraciones'} className="inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />Volver a remuneraciones</Link>
      <header className="mt-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Control y preparación de archivos</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Exportaciones de remuneraciones</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Descargue archivos internos de control. Los formatos regulatorios permanecen bloqueados hasta homologar estructura, versión y reglas vigentes del organismo receptor.</p></header>

      <form method="get" className="mt-7 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1.3fr_1fr_auto] sm:items-end sm:p-6">
        <label className="grid gap-2 text-sm font-bold text-slate-700">Empresa<select name="empresa" defaultValue={selectedCompany?.id ?? ''} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">{companies.map((company) => <option key={company.id} value={company.id}>{company.nombre_fantasia || company.razon_social} · {company.rut}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Periodo<select name="periodo" defaultValue={selectedPeriod?.periodo.slice(0, 7) ?? ''} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"><option value="">Todos</option>{periods.map((period) => <option key={period.id} value={period.periodo.slice(0, 7)}>{period.periodo.slice(0, 7)} · {period.estado}</option>)}</select></label>
        <button className="h-11 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white">Aplicar</button>
      </form>

      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar los periodos.</div>}

      <section className="mt-7 grid gap-5 md:grid-cols-3">
        <ExportCard icon="users" title="Maestro de trabajadores" description="Datos de identificación y afiliación registrados para la empresa." href={selectedCompany ? `/admin/remuneraciones/exportaciones/descargar?tipo=trabajadores&empresa=${selectedCompany.id}` : null} />
        <ExportCard icon="money" title="Resumen de liquidaciones" description="Totales imponibles, descuentos, aportes y líquido por trabajador." href={selectedCompany ? `/admin/remuneraciones/exportaciones/descargar?tipo=resumen&${query}` : null} />
        <ExportCard icon="document" title="Detalle de conceptos" description="Líneas de haberes, descuentos y aportes de las liquidaciones calculadas." href={selectedCompany ? `/admin/remuneraciones/exportaciones/descargar?tipo=detalle&${query}` : null} />
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fbf4df] text-[#8a6418]"><AppIcon name="shield" className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">Exportaciones regulatorias</h2><p className="mt-1 text-sm leading-6 text-slate-500">No se habilitan como archivo oficial sólo porque existan datos calculados. Cada formato requiere homologación y pruebas de aceptación.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><RegulatoryCard title="Libro de Remuneraciones Electrónico" /><RegulatoryCard title="PREVIRED" /><RegulatoryCard title="Declaración Jurada 1887" /></div></section>

      <section className="mt-6 rounded-3xl border border-[#134b78]/20 bg-[#eaf3f9] p-5 text-sm leading-6 text-[#17324a] sm:p-6"><p className="font-black">Qué validan estos CSV internos</p><p className="mt-1">Permiten revisar trabajadores, periodos y resultados antes de generar archivos regulatorios. Se entregan en UTF-8 y no deben cargarse directamente en portales externos como si fueran formatos oficiales.</p></section>
    </div>
  )
}

function ExportCard({ icon, title, description, href }: { icon: 'users' | 'money' | 'document'; title: string; description: string; href: string | null }) {
  return <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-black text-[#0f2438]">{title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{description}</p>{href ? <a href={href} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white"><AppIcon name="download" className="h-4 w-4" />Descargar CSV</a> : <span className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-center text-xs font-black text-slate-400">Seleccione una empresa</span>}</article>
}

function RegulatoryCard({ title }: { title: string }) {
  return <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-black text-amber-950">{title}</h3><StatusBadge status="Pendiente de homologación" /></div><p className="mt-3 text-xs leading-5 text-amber-800">Requiere definición de versión, mapeo, validaciones y prueba de recepción sin observaciones.</p></article>
}
