import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { calcularPeriodoRemuneraciones } from '@/app/admin/payroll-actions'
import {
  ContractForm,
  PayrollMovementForm,
  PayrollParametersForm,
  PayrollPeriodForm,
  WorkerForm,
  type SelectOption,
} from '@/app/admin/components/PayrollForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type Worker = { id: string; rut: string; nombres: string; apellido_paterno: string; apellido_materno: string | null; estado: string; afp: string | null; salud_tipo: string; fecha_ingreso: string }
type Period = { id: string; periodo: string; estado: string; calculado_at: string | null }
type Concept = { id: string; codigo: string; nombre: string; naturaleza: string; imponible: boolean; tributable: boolean }
type Payslip = { id: string; periodo_id: string; trabajador_id: string; total_imponible: number; total_no_imponible: number; descuentos_legales: number; aportes_empleador: number; liquido_pagar: number; estado: string; trabajador: { nombres: string; apellido_paterno: string } | Array<{ nombres: string; apellido_paterno: string }> | null; periodo: { periodo: string } | Array<{ periodo: string }> | null }

function relationOne<T>(value: T | T[] | null) { return Array.isArray(value) ? value[0] : value }

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows, error: companiesError } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selectedCompany = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null

  const empty = { data: [], error: null }
  const [workersResult, periodsResult, conceptsResult, costCentersResult, payslipsResult, parametersResult] = selectedCompany ? await Promise.all([
    supabase.from('trabajadores').select('id, rut, nombres, apellido_paterno, apellido_materno, estado, afp, salud_tipo, fecha_ingreso').eq('empresa_id', selectedCompany.id).order('apellido_paterno'),
    supabase.from('periodos_remuneraciones').select('id, periodo, estado, calculado_at').eq('empresa_id', selectedCompany.id).order('periodo', { ascending: false }).limit(24),
    supabase.from('conceptos_remuneracion').select('id, codigo, nombre, naturaleza, imponible, tributable').eq('empresa_id', selectedCompany.id).eq('activo', true).order('codigo'),
    supabase.from('centros_costo').select('id, codigo, nombre').eq('empresa_id', selectedCompany.id).eq('activo', true).order('codigo'),
    supabase.from('liquidaciones').select('id, periodo_id, trabajador_id, total_imponible, total_no_imponible, descuentos_legales, aportes_empleador, liquido_pagar, estado, trabajador:trabajadores(nombres, apellido_paterno), periodo:periodos_remuneraciones(periodo)').in('periodo_id', (await supabase.from('periodos_remuneraciones').select('id').eq('empresa_id', selectedCompany.id)).data?.map((item) => item.id) ?? []).order('created_at', { ascending: false }).limit(200),
    supabase.from('parametros_remuneraciones').select('periodo, fuente, empresa_id').or(`empresa_id.eq.${selectedCompany.id},empresa_id.is.null`).order('periodo', { ascending: false }).limit(12),
  ]) : [empty, empty, empty, empty, empty, empty]

  const workers = (workersResult.data ?? []) as Worker[]
  const periods = (periodsResult.data ?? []) as Period[]
  const concepts = (conceptsResult.data ?? []) as Concept[]
  const payslips = (payslipsResult.data ?? []) as Payslip[]
  const costCenters = (costCentersResult.data ?? []) as Array<{ id: string; codigo: string; nombre: string }>
  const errors = [companiesError, workersResult.error, periodsResult.error, conceptsResult.error, costCentersResult.error, payslipsResult.error, parametersResult.error].filter(Boolean)

  const workerOptions: SelectOption[] = workers.map((item) => ({ id: item.id, label: `${item.apellido_paterno}, ${item.nombres} · ${item.rut}` }))
  const periodOptions: SelectOption[] = periods.map((item) => ({ id: item.id, label: `${item.periodo.slice(0, 7)} · ${item.estado}` }))
  const conceptOptions: SelectOption[] = concepts.map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))
  const costCenterOptions: SelectOption[] = costCenters.map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))
  const totalNet = payslips.reduce((sum, item) => sum + Number(item.liquido_pagar || 0), 0)
  const totalEmployer = payslips.reduce((sum, item) => sum + Number(item.aportes_empleador || 0), 0)

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Gestión laboral multiempresa</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Remuneraciones</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Trabajadores, contratos, parámetros por periodo, movimientos, liquidaciones y preparación de procesos LRE, PREVIRED y DJ 1887.</p></div>
        <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="text-xs font-black uppercase tracking-wide text-slate-500">Empresa</label><select name="empresa" defaultValue={selectedCompany?.id ?? ''} className="h-11 min-w-[280px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">{companies.map((company) => <option key={company.id} value={company.id}>{company.nombre_fantasia || company.razon_social}</option>)}</select><button className="h-11 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white">Abrir</button></form>
      </header>

      {errors.length > 0 && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Parte del módulo no pudo cargarse. Confirme que la migración de remuneraciones esté aplicada.</div>}
      {!selectedCompany ? <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center font-bold text-slate-500">Cree al menos un cliente para utilizar remuneraciones.</div> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon="users" label="Trabajadores activos" value={workers.filter((item) => item.estado === 'Activo').length.toString()} />
          <Metric icon="calendar" label="Periodos" value={periods.length.toString()} />
          <Metric icon="money" label="Líquido calculado" value={formatCurrency(totalNet)} />
          <Metric icon="briefcase" label="Aportes empleador" value={formatCurrency(totalEmployer)} />
        </section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle icon="settings" title="Parámetros legales por periodo" description="UF, UTM, topes, tasas AFP/AFC/SIS y tramos del Impuesto Único. Deben cargarse desde una fuente oficial antes de calcular." />
          <details className="group mt-5 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4"><summary className="cursor-pointer font-black text-[#134b78]">Configurar parámetros</summary><div className="mt-5 border-t border-[#134b78]/15 pt-5"><PayrollParametersForm companyId={selectedCompany.id} /></div></details>
          <div className="mt-4 flex flex-wrap gap-2">{(parametersResult.data ?? []).map((item) => <span key={`${item.empresa_id ?? 'global'}-${item.periodo}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">{String(item.periodo).slice(0, 7)} · {item.empresa_id ? 'Empresa' : 'Global'}{item.fuente ? ' · fuente registrada' : ' · sin fuente'}</span>)}</div>
        </section>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle icon="users" title="Trabajadores" description="Ficha previsional y contractual por empresa." /><details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-black text-[#134b78]">Nuevo trabajador</summary><div className="mt-5"><WorkerForm companyId={selectedCompany.id} costCenters={costCenterOptions} /></div></details><div className="mt-5 grid gap-3">{workers.slice(0, 30).map((worker) => <article key={worker.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#17324a]">{worker.nombres} {worker.apellido_paterno} {worker.apellido_materno}</p><p className="mt-1 text-xs text-slate-500">{worker.rut} · ingreso {formatDate(worker.fecha_ingreso)} · {worker.afp || 'AFP sin informar'} · {worker.salud_tipo}</p></div><StatusBadge status={worker.estado} /></div></article>)}</div></section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle icon="document" title="Contratos" description="Tipo de contrato, jornada, sueldo, gratificación y asignaciones diarias." /><details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-black text-[#134b78]">Registrar contrato</summary><div className="mt-5"><ContractForm workers={workerOptions} /></div></details><p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">Al registrar un nuevo contrato vigente, el contrato vigente anterior se finaliza. La emisión documental y firma electrónica requieren plantillas legales revisadas.</p></section>
        </div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="calendar" title="Periodos y cálculo" description="Abra el mes sólo después de guardar parámetros verificados." /><div className="mt-5 grid gap-6 xl:grid-cols-2"><div className="rounded-2xl border border-slate-200 p-4"><PayrollPeriodForm companyId={selectedCompany.id} /></div><div className="grid gap-3">{periods.map((period) => <article key={period.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-[#17324a]">{period.periodo.slice(0, 7)}</p><p className="mt-1 text-xs text-slate-500">{period.calculado_at ? `Calculado ${formatDate(period.calculado_at, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Aún no calculado'}</p></div><div className="flex items-center gap-3"><StatusBadge status={period.estado} />{period.estado !== 'Cerrado' && <form action={calcularPeriodoRemuneraciones}><input type="hidden" name="periodo_id" value={period.id} /><button className="h-10 rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Calcular nómina</button></form>}</div></article>)}</div></div></section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="plus" title="Movimientos variables" description="Bonos, horas extra, descuentos y aportes vinculados a conceptos configurados." />{concepts.length === 0 ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Aún no hay conceptos de remuneración configurados. Deben crearse antes de ingresar movimientos variables.</p> : <div className="mt-5"><PayrollMovementForm periods={periodOptions} workers={workerOptions} concepts={conceptOptions} /></div>}</section>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="text-xl font-black text-[#0f2438]">Liquidaciones calculadas</h2><p className="mt-1 text-sm text-slate-500">Resultados parametrizados sujetos a revisión antes de cerrar, pagar o exportar.</p></div><Link href={`/admin/remuneraciones/exportaciones?empresa=${selectedCompany.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-[#134b78] px-4 text-xs font-black text-[#134b78]">Preparar exportaciones</Link></div><div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500"><th className="px-5 py-4">Periodo</th><th className="px-5 py-4">Trabajador</th><th className="px-5 py-4 text-right">Imponible</th><th className="px-5 py-4 text-right">No imponible</th><th className="px-5 py-4 text-right">Descuentos</th><th className="px-5 py-4 text-right">Líquido</th><th className="px-5 py-4">Estado</th></tr></thead><tbody>{payslips.length === 0 ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">No hay liquidaciones calculadas.</td></tr> : payslips.map((item) => { const worker = relationOne(item.trabajador); const period = relationOne(item.periodo); return <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-4 font-bold">{period?.periodo?.slice(0, 7) || '—'}</td><td className="px-5 py-4 font-black text-[#17324a]">{worker ? `${worker.nombres} ${worker.apellido_paterno}` : 'Sin trabajador'}</td><td className="px-5 py-4 text-right">{formatCurrency(item.total_imponible)}</td><td className="px-5 py-4 text-right">{formatCurrency(item.total_no_imponible)}</td><td className="px-5 py-4 text-right">{formatCurrency(item.descuentos_legales)}</td><td className="px-5 py-4 text-right font-black text-[#134b78]">{formatCurrency(item.liquido_pagar)}</td><td className="px-5 py-4"><StatusBadge status={item.estado} /></td></tr> })}</tbody></table></div></section>
      </>}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: 'users' | 'calendar' | 'money' | 'briefcase'; label: string; value: string }) { return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p></div></article> }
function SectionTitle({ icon, title, description }: { icon: 'settings' | 'users' | 'document' | 'calendar' | 'plus'; title: string; description: string }) { return <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div> }
