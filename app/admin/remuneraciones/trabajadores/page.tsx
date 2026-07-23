import { AppIcon } from '@/components/AppIcon'
import { ModulePageHeader, CompanySelector } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { WorkerForm, type SelectOption } from '@/app/admin/components/PayrollForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null }
type Worker = { id: string; rut: string; nombres: string; apellido_paterno: string; apellido_materno: string | null; email: string | null; telefono: string | null; estado: string; afp: string | null; salud_tipo: string; salud_institucion: string | null; afc_aplica: boolean; fecha_ingreso: string }

export default async function WorkersPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const [{ data: workerRows, error }, { data: centerRows }] = selected ? await Promise.all([
    supabase.from('trabajadores').select('id, rut, nombres, apellido_paterno, apellido_materno, email, telefono, estado, afp, salud_tipo, salud_institucion, afc_aplica, fecha_ingreso').eq('empresa_id', selected.id).order('apellido_paterno'),
    supabase.from('centros_costo').select('id, codigo, nombre').eq('empresa_id', selected.id).eq('activo', true).order('codigo'),
  ]) : [{ data: [], error: null }, { data: [], error: null }]
  const workers = (workerRows ?? []) as Worker[]
  const centers: SelectOption[] = (centerRows ?? []).map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))

  return (
    <div className="mx-auto max-w-[1350px]">
      <ModulePageHeader eyebrow="Remuneraciones · Personas" title="Trabajadores" description="Ficha laboral y previsional. Mantenga aquí sólo los antecedentes permanentes del trabajador; las novedades mensuales se registran en su sección propia." help="La exactitud de AFP, salud, AFC, fecha de ingreso y centro de costo condiciona todos los cálculos posteriores." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />
      {error && <ErrorBox />}
      {!selected ? <Empty text="No hay empresas disponibles." /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Activos" value={workers.filter((item) => item.estado === 'Activo').length} /><Metric label="Sin AFP informada" value={workers.filter((item) => !item.afp).length} /><Metric label="Sin contacto" value={workers.filter((item) => !item.email && !item.telefono).length} /></section>

        <details className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm open:ring-2 open:ring-[#134b78]/10">
          <summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden"><span className="inline-flex items-center gap-2"><AppIcon name="plus" className="h-4 w-4" />Crear trabajador</span><span className="text-xs text-slate-400">Abrir formulario</span></summary>
          <div className="mt-5 border-t border-slate-200 pt-5"><WorkerForm companyId={selected.id} costCenters={centers} /></div>
        </details>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Directorio laboral <InfoTip>Incluye únicamente trabajadores pertenecientes a la empresa seleccionada, protegidos por aislamiento multiempresa.</InfoTip></h2><p className="mt-1 text-sm text-slate-500">Revise alertas de información incompleta antes de abrir un periodo.</p></div>
          <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase text-slate-500"><th className="px-5 py-4">Trabajador</th><th className="px-5 py-4">Ingreso</th><th className="px-5 py-4">Previsión</th><th className="px-5 py-4">Contacto</th><th className="px-5 py-4">Estado</th></tr></thead><tbody>{workers.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-slate-500">No hay trabajadores registrados.</td></tr> : workers.map((worker) => <tr key={worker.id} className="border-t border-slate-100 align-top"><td className="px-5 py-4"><p className="font-black text-[#17324a]">{worker.nombres} {worker.apellido_paterno} {worker.apellido_materno}</p><p className="mt-1 text-xs text-slate-500">{worker.rut}</p></td><td className="px-5 py-4">{formatDate(worker.fecha_ingreso)}</td><td className="px-5 py-4"><p className="font-bold">{worker.afp || 'AFP pendiente'}</p><p className="mt-1 text-xs text-slate-500">{worker.salud_tipo}{worker.salud_institucion ? ` · ${worker.salud_institucion}` : ''} · AFC {worker.afc_aplica ? 'sí' : 'no'}</p></td><td className="px-5 py-4"><p>{worker.email || 'Sin correo'}</p><p className="mt-1 text-xs text-slate-500">{worker.telefono || 'Sin teléfono'}</p></td><td className="px-5 py-4"><StatusBadge status={worker.estado} /></td></tr>)}</tbody></table></div>
        </section>
      </>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</p></article> }
function ErrorBox() { return <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar el directorio laboral.</div> }
function Empty({ text }: { text: string }) { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">{text}</div> }
