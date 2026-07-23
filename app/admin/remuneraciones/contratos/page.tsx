import { AppIcon } from '@/components/AppIcon'
import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { ContractForm, type SelectOption } from '@/app/admin/components/PayrollForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null }
type Worker = { id: string; rut: string; nombres: string; apellido_paterno: string }
type Contract = { id: string; tipo: string; cargo: string; jornada_horas: number | null; fecha_inicio: string; fecha_termino: string | null; sueldo_base: number; gratificacion_tipo: string; modalidad_pago: string; dias_semana: number; colacion_diaria: number; movilizacion_diaria: number; estado: string; trabajador: Worker | Worker[] | null }
const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const [{ data: workerRows }, { data: contractRows, error }] = selected ? await Promise.all([
    supabase.from('trabajadores').select('id, rut, nombres, apellido_paterno').eq('empresa_id', selected.id).order('apellido_paterno'),
    supabase.from('contratos_trabajo').select('id, tipo, cargo, jornada_horas, fecha_inicio, fecha_termino, sueldo_base, gratificacion_tipo, modalidad_pago, dias_semana, colacion_diaria, movilizacion_diaria, estado, trabajador:trabajadores!inner(id, rut, nombres, apellido_paterno, empresa_id)').eq('trabajador.empresa_id', selected.id).order('fecha_inicio', { ascending: false }),
  ]) : [{ data: [] }, { data: [], error: null }]
  const workers = (workerRows ?? []) as Worker[]
  const contracts = (contractRows ?? []) as Contract[]
  const workerOptions: SelectOption[] = workers.map((worker) => ({ id: worker.id, label: `${worker.apellido_paterno}, ${worker.nombres} · ${worker.rut}` }))

  return (
    <div className="mx-auto max-w-[1350px]">
      <ModulePageHeader eyebrow="Remuneraciones · Relación laboral" title="Contratos" description="Condiciones permanentes que alimentan sueldo base, jornada, gratificación y asignaciones. Cada nuevo contrato vigente finaliza el anterior." help="El cálculo mensual toma el contrato vigente del trabajador. Fechas, jornada y modalidad deben coincidir con la documentación laboral suscrita." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />
      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar los contratos.</div>}
      {!selected ? <Empty /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Contratos vigentes" value={contracts.filter((item) => item.estado === 'Vigente').length} /><Metric label="Plazo fijo" value={contracts.filter((item) => item.tipo === 'Plazo fijo' && item.estado === 'Vigente').length} /><Metric label="Sin jornada informada" value={contracts.filter((item) => item.estado === 'Vigente' && !item.jornada_horas).length} /></section>

        <details className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden"><span className="inline-flex items-center gap-2"><AppIcon name="plus" className="h-4 w-4" />Registrar contrato</span><span className="text-xs text-slate-400">Abrir formulario</span></summary><div className="mt-5 border-t border-slate-200 pt-5"><ContractForm workers={workerOptions} /></div></details>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Historial contractual <InfoTip>Se conserva el historial completo. Para cálculos ordinarios se utiliza el contrato con estado Vigente.</InfoTip></h2></div><div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase text-slate-500"><th className="px-5 py-4">Trabajador</th><th className="px-5 py-4">Contrato</th><th className="px-5 py-4">Vigencia</th><th className="px-5 py-4 text-right">Sueldo base</th><th className="px-5 py-4">Jornada</th><th className="px-5 py-4">Gratificación</th><th className="px-5 py-4">Estado</th></tr></thead><tbody>{contracts.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-slate-500">No hay contratos registrados.</td></tr> : contracts.map((contract) => { const worker = one(contract.trabajador); return <tr key={contract.id} className="border-t border-slate-100 align-top"><td className="px-5 py-4"><p className="font-black text-[#17324a]">{worker?.nombres} {worker?.apellido_paterno}</p><p className="mt-1 text-xs text-slate-500">{worker?.rut}</p></td><td className="px-5 py-4"><p className="font-bold">{contract.tipo}</p><p className="mt-1 text-xs text-slate-500">{contract.cargo} · {contract.modalidad_pago}</p></td><td className="px-5 py-4">{formatDate(contract.fecha_inicio)}{contract.fecha_termino ? ` a ${formatDate(contract.fecha_termino)}` : ''}</td><td className="px-5 py-4 text-right font-black">{formatCurrency(contract.sueldo_base)}</td><td className="px-5 py-4">{contract.jornada_horas ?? '—'} h · {contract.dias_semana} días</td><td className="px-5 py-4"><p>{contract.gratificacion_tipo}</p><p className="mt-1 text-xs text-slate-500">Colación {formatCurrency(contract.colacion_diaria)} · Mov. {formatCurrency(contract.movilizacion_diaria)}</p></td><td className="px-5 py-4"><StatusBadge status={contract.estado} /></td></tr> })}</tbody></table></div></section>
      </>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</p></article> }
function Empty() { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">No hay empresas disponibles.</div> }
