import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import {
  calcularPeriodoConNovedades,
  cerrarPeriodoRemuneraciones,
  crearConceptosBase,
} from '@/app/admin/payroll-operations-actions'
import {
  MedicalLeaveForm,
  MonthlyInputForm,
  TerminationDraftForm,
  VacationForm,
  type PayrollOption,
} from '@/app/admin/components/PayrollOperationsForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type Worker = { id: string; rut: string; nombres: string; apellido_paterno: string; estado: string }
type Period = { id: string; periodo: string; estado: string; calculado_at: string | null; cerrado_at: string | null }
type Novelty = { id: string; periodo_id: string; trabajador_id: string; dias_trabajados: number; horas_extra_50: number; horas_extra_100: number; bonos_imponibles: number; bonos_no_imponibles: number; descuentos_adicionales: number; trabajador: { nombres: string; apellido_paterno: string } | Array<{ nombres: string; apellido_paterno: string }> | null; periodo: { periodo: string } | Array<{ periodo: string }> | null }
type Vacation = { id: string; tipo: string; fecha_inicio: string; fecha_fin: string; dias_habiles: number; estado: string; trabajador: { nombres: string; apellido_paterno: string } | Array<{ nombres: string; apellido_paterno: string }> | null }
type Leave = { id: string; folio: string | null; tipo: string | null; fecha_inicio: string; fecha_fin: string; dias: number; estado: string; trabajador: { nombres: string; apellido_paterno: string } | Array<{ nombres: string; apellido_paterno: string }> | null }
type Termination = { id: string; causal_codigo: string; fecha_termino: string; total_pagar: number; estado: string; trabajador: { nombres: string; apellido_paterno: string } | Array<{ nombres: string; apellido_paterno: string }> | null }

const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default async function PayrollOperationsPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows, error: companiesError } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selectedCompany = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const empty = { data: [], error: null }

  const [workersResult, periodsResult, noveltyResult, vacationsResult, leavesResult, terminationsResult, conceptsResult] = selectedCompany ? await Promise.all([
    supabase.from('trabajadores').select('id, rut, nombres, apellido_paterno, estado').eq('empresa_id', selectedCompany.id).order('apellido_paterno'),
    supabase.from('periodos_remuneraciones').select('id, periodo, estado, calculado_at, cerrado_at').eq('empresa_id', selectedCompany.id).order('periodo', { ascending: false }).limit(24),
    supabase.from('novedades_remuneraciones').select('id, periodo_id, trabajador_id, dias_trabajados, horas_extra_50, horas_extra_100, bonos_imponibles, bonos_no_imponibles, descuentos_adicionales, trabajador:trabajadores(nombres, apellido_paterno), periodo:periodos_remuneraciones(periodo)').in('periodo_id', (await supabase.from('periodos_remuneraciones').select('id').eq('empresa_id', selectedCompany.id)).data?.map((item) => item.id) ?? []).order('updated_at', { ascending: false }).limit(100),
    supabase.from('vacaciones').select('id, tipo, fecha_inicio, fecha_fin, dias_habiles, estado, trabajador:trabajadores!inner(nombres, apellido_paterno, empresa_id)').eq('trabajador.empresa_id', selectedCompany.id).order('fecha_inicio', { ascending: false }).limit(100),
    supabase.from('licencias_medicas').select('id, folio, tipo, fecha_inicio, fecha_fin, dias, estado, trabajador:trabajadores!inner(nombres, apellido_paterno, empresa_id)').eq('trabajador.empresa_id', selectedCompany.id).order('fecha_inicio', { ascending: false }).limit(100),
    supabase.from('finiquitos').select('id, causal_codigo, fecha_termino, total_pagar, estado, trabajador:trabajadores!inner(nombres, apellido_paterno, empresa_id)').eq('trabajador.empresa_id', selectedCompany.id).order('fecha_termino', { ascending: false }).limit(100),
    supabase.from('conceptos_remuneracion').select('id').eq('empresa_id', selectedCompany.id).limit(1),
  ]) : [empty, empty, empty, empty, empty, empty, empty]

  const workers = (workersResult.data ?? []) as Worker[]
  const periods = (periodsResult.data ?? []) as Period[]
  const novelties = (noveltyResult.data ?? []) as Novelty[]
  const vacations = (vacationsResult.data ?? []) as Vacation[]
  const leaves = (leavesResult.data ?? []) as Leave[]
  const terminations = (terminationsResult.data ?? []) as Termination[]
  const errors = [companiesError, workersResult.error, periodsResult.error, noveltyResult.error, vacationsResult.error, leavesResult.error, terminationsResult.error, conceptsResult.error].filter(Boolean)
  const workerOptions: PayrollOption[] = workers.filter((item) => item.estado === 'Activo').map((item) => ({ id: item.id, label: `${item.apellido_paterno}, ${item.nombres} · ${item.rut}` }))
  const periodOptions: PayrollOption[] = periods.filter((item) => item.estado !== 'Cerrado').map((item) => ({ id: item.id, label: `${item.periodo.slice(0, 7)} · ${item.estado}` }))

  return (
    <div className="mx-auto max-w-[1450px]">
      <div className="flex flex-wrap gap-3"><Link href={selectedCompany ? `/admin/remuneraciones?empresa=${selectedCompany.id}` : '/admin/remuneraciones'} className="inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />Volver a remuneraciones</Link>{selectedCompany && <Link href={`/admin/remuneraciones/exportaciones?empresa=${selectedCompany.id}`} className="inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline"><AppIcon name="download" className="h-4 w-4" />Exportaciones internas</Link>}</div>
      <header className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Operación mensual y laboral</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Novedades y gestión laboral</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Días trabajados, horas extra, bonos, vacaciones, licencias, finiquitos y cierre controlado de cada periodo.</p></div><form method="get" className="flex gap-2"><select name="empresa" defaultValue={selectedCompany?.id ?? ''} className="h-11 min-w-[290px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">{companies.map((company) => <option key={company.id} value={company.id}>{company.nombre_fantasia || company.razon_social}</option>)}</select><button className="h-11 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white">Abrir</button></form></header>

      {errors.length > 0 && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Parte de la gestión laboral no pudo cargarse. Confirme las migraciones.</div>}
      {!selectedCompany ? <Empty text="No hay empresas disponibles." /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon="users" label="Trabajadores activos" value={workerOptions.length} /><Metric icon="calendar" label="Periodos abiertos" value={periodOptions.length} /><Metric icon="tasks" label="Novedades cargadas" value={novelties.length} /><Metric icon="document" label="Finiquitos" value={terminations.length} /></section>

        {(conceptsResult.data ?? []).length === 0 && <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-amber-950">Conceptos base pendientes</p><p className="mt-1 text-sm text-amber-800">Cree el catálogo inicial antes de registrar movimientos variables.</p></div><form action={crearConceptosBase}><input type="hidden" name="empresa_id" value={selectedCompany.id} /><button className="h-10 rounded-xl bg-amber-900 px-4 text-xs font-black text-white">Crear conceptos base</button></form></section>}

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="tasks" title="Novedad mensual por trabajador" description="Una novedad guardada reabre el periodo para exigir un nuevo cálculo." />{periodOptions.length === 0 || workerOptions.length === 0 ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Se necesita un periodo abierto y al menos un trabajador activo.</p> : <div className="mt-6"><MonthlyInputForm periods={periodOptions} workers={workerOptions} /></div>}</section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="calendar" title="Calcular y cerrar periodos" description="Calcule con las novedades registradas; cierre sólo después de revisar resultados y parámetros." /><div className="mt-5 grid gap-3">{periods.length === 0 ? <Empty text="No hay periodos de remuneraciones." /> : periods.map((period) => <article key={period.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-[#17324a]">{period.periodo.slice(0, 7)}</p><p className="mt-1 text-xs text-slate-500">{period.calculado_at ? `Calculado ${formatDate(period.calculado_at, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Sin cálculo vigente'}{period.cerrado_at ? ` · cerrado ${formatDate(period.cerrado_at)}` : ''}</p></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={period.estado} />{period.estado !== 'Cerrado' && <form action={calcularPeriodoConNovedades}><input type="hidden" name="periodo_id" value={period.id} /><button className="h-9 rounded-lg bg-[#134b78] px-3 text-xs font-black text-white">Calcular con novedades</button></form>}{['Calculado', 'Revisión', 'Rectificado'].includes(period.estado) && <form action={cerrarPeriodoRemuneraciones}><input type="hidden" name="periodo_id" value={period.id} /><button className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white">Cerrar y publicar</button></form>}</div></article>)}</div></section>

        <div className="mt-7 grid gap-6 xl:grid-cols-2"><Panel icon="calendar" title="Vacaciones"><VacationForm workers={workerOptions} /><History>{vacations.map((item) => { const worker = one(item.trabajador); return <HistoryRow key={item.id} title={worker ? `${worker.nombres} ${worker.apellido_paterno}` : 'Sin trabajador'} detail={`${item.tipo} · ${formatDate(item.fecha_inicio)} al ${formatDate(item.fecha_fin)} · ${item.dias_habiles} días`} status={item.estado} /> })}</History></Panel><Panel icon="document" title="Licencias médicas"><MedicalLeaveForm workers={workerOptions} /><History>{leaves.map((item) => { const worker = one(item.trabajador); return <HistoryRow key={item.id} title={worker ? `${worker.nombres} ${worker.apellido_paterno}` : 'Sin trabajador'} detail={`${item.tipo || 'Licencia'} · ${formatDate(item.fecha_inicio)} al ${formatDate(item.fecha_fin)} · ${item.dias} días${item.folio ? ` · folio ${item.folio}` : ''}`} status={item.estado} /> })}</History></Panel></div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="money" title="Borradores de finiquito" description="Cálculo preliminar con advertencia legal obligatoria." /><details className="mt-5 rounded-2xl border border-red-200 bg-red-50/40 p-4"><summary className="cursor-pointer font-black text-red-800">Calcular nuevo borrador</summary><div className="mt-5"><TerminationDraftForm workers={workerOptions} /></div></details><History>{terminations.map((item) => { const worker = one(item.trabajador); return <HistoryRow key={item.id} title={worker ? `${worker.nombres} ${worker.apellido_paterno}` : 'Sin trabajador'} detail={`${item.causal_codigo} · término ${formatDate(item.fecha_termino)} · ${formatCurrency(item.total_pagar)}`} status={item.estado} /> })}</History></section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="tasks" title="Novedades recientes" description="Control de datos considerados en el cálculo." /><div className="mt-5 overflow-x-auto"><table className="min-w-[950px] w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500"><th className="px-4 py-3">Periodo</th><th className="px-4 py-3">Trabajador</th><th className="px-4 py-3">Días</th><th className="px-4 py-3">Horas extra</th><th className="px-4 py-3 text-right">Bonos</th><th className="px-4 py-3 text-right">Descuentos</th></tr></thead><tbody>{novelties.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">No hay novedades registradas.</td></tr> : novelties.map((item) => { const worker = one(item.trabajador); const period = one(item.periodo); return <tr key={item.id} className="border-b border-slate-100"><td className="px-4 py-3 font-bold">{period?.periodo?.slice(0, 7) || '—'}</td><td className="px-4 py-3 font-black text-[#17324a]">{worker ? `${worker.nombres} ${worker.apellido_paterno}` : '—'}</td><td className="px-4 py-3">{item.dias_trabajados}</td><td className="px-4 py-3">50%: {item.horas_extra_50} · 100%: {item.horas_extra_100}</td><td className="px-4 py-3 text-right">{formatCurrency(Number(item.bonos_imponibles) + Number(item.bonos_no_imponibles))}</td><td className="px-4 py-3 text-right">{formatCurrency(item.descuentos_adicionales)}</td></tr> })}</tbody></table></div></section>
      </>}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: 'users' | 'calendar' | 'tasks' | 'document'; label: string; value: number }) { return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase text-slate-500">{label}</p></div></article> }
function SectionTitle({ icon, title, description }: { icon: 'tasks' | 'calendar' | 'money'; title: string; description: string }) { return <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div> }
function Panel({ icon, title, children }: { icon: 'calendar' | 'document'; title: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><AppIcon name={icon} className="h-6 w-6 text-[#134b78]" /><h2 className="text-xl font-black text-[#0f2438]">{title}</h2></div>{children}</section> }
function History({ children }: { children: React.ReactNode }) { return <div className="mt-6 grid gap-2 border-t border-slate-200 pt-5">{children}</div> }
function HistoryRow({ title, detail, status }: { title: string; detail: string; status: string }) { return <article className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="font-bold text-[#17324a]">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div><StatusBadge status={status} /></article> }
function Empty({ text }: { text: string }) { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500">{text}</div> }
