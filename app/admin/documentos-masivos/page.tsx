import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { confirmarArchivoIngesta } from '@/app/admin/document-intake-actions'
import { DocumentIntakeForm } from '@/app/admin/components/DocumentIntakeForm'

export const dynamic = 'force-dynamic'

type Batch = { id: string; nombre: string; total_archivos: number; clasificados: number; pendientes: number; errores: number; estado: string; created_at: string; completado_at: string | null }
type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type Intake = { id: string; lote_id: string; empresa_id: string | null; nombre_original: string; categoria_sugerida: string; periodo_sugerido: string | null; fecha_sugerida: string | null; rut_detectado: string | null; confianza: number; estado: string; razones: string[]; created_at: string; empresa: { razon_social: string; nombre_fantasia: string | null } | Array<{ razon_social: string; nombre_fantasia: string | null }> | null }

const categories = ['Impuestos', 'Remuneraciones', 'Legal', 'Contabilidad', 'Tributario', 'Laboral', 'Bancario', 'Contratos']
const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default async function DocumentIntakePage() {
  const supabase = await createClient()
  const [batchesResult, intakeResult, companiesResult] = await Promise.all([
    supabase.from('lotes_documentales').select('id, nombre, total_archivos, clasificados, pendientes, errores, estado, created_at, completado_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('archivos_ingesta').select('id, lote_id, empresa_id, nombre_original, categoria_sugerida, periodo_sugerido, fecha_sugerida, rut_detectado, confianza, estado, razones, created_at, empresa:empresas(razon_social, nombre_fantasia)').eq('estado', 'Revisión').order('created_at', { ascending: false }).limit(200),
    supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social'),
  ])

  const batches = (batchesResult.data ?? []) as Batch[]
  const intake = (intakeResult.data ?? []) as Intake[]
  const companies = (companiesResult.data ?? []) as Company[]
  const hasError = batchesResult.error || intakeResult.error || companiesResult.error
  const totalPublished = batches.reduce((sum, item) => sum + item.clasificados, 0)
  const totalPending = batches.reduce((sum, item) => sum + item.pendientes, 0)
  const totalErrors = batches.reduce((sum, item) => sum + item.errores, 0)

  return (
    <div className="mx-auto max-w-[1500px]">
      <header><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Ingesta documental multiempresa</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Carga masiva y clasificación</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Clasifica archivos por RUT, empresa, periodo y categoría; publica sólo coincidencias confiables y deriva lo ambiguo a revisión humana.</p></header>

      {hasError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar todo el módulo. Confirme las migraciones documentales.</div>}

      <section className="mt-7 grid gap-4 sm:grid-cols-3"><Metric icon="check" label="Publicados" value={totalPublished} /><Metric icon="warning" label="Por revisar" value={totalPending} /><Metric icon="alert" label="Errores" value={totalErrors} /></section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="upload" title="Nuevo lote" description="El procesamiento se realiza con reglas determinísticas y deja trazabilidad completa." /><div className="mt-6"><DocumentIntakeForm /></div></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="tasks" title="Lotes recientes" description="Resultado consolidado de cada carga." /><div className="mt-5 grid gap-3">{batches.length === 0 ? <Empty text="No hay lotes procesados." /> : batches.map((batch) => <article key={batch.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#17324a]">{batch.nombre}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(batch.created_at, { dateStyle: 'medium', timeStyle: 'short' })} · {batch.total_archivos} archivos</p></div><StatusBadge status={batch.estado} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini label="Publicados" value={batch.clasificados} /><Mini label="Revisión" value={batch.pendientes} /><Mini label="Errores" value={batch.errores} /></div></article>)}</div></section>
      </div>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="warning" title="Cola de revisión" description="Confirme empresa, categoría y periodo antes de publicar el archivo en el portal del cliente." /><div className="mt-5 grid gap-4">{intake.length === 0 ? <Empty text="No hay archivos pendientes de revisión." /> : intake.map((item) => { const company = one(item.empresa); return <article key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><h3 className="break-all font-black text-[#17324a]">{item.nombre_original}</h3><p className="mt-1 text-xs leading-5 text-slate-500">Detectado: {company?.nombre_fantasia || company?.razon_social || 'sin empresa'} · RUT {item.rut_detectado || 'no detectado'} · confianza {item.confianza}%</p><div className="mt-3 flex flex-wrap gap-2">{(item.razones ?? []).map((reason, index) => <span key={index} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">{reason}</span>)}</div></div><StatusBadge status={item.estado} /></div><form action={confirmarArchivoIngesta} className="mt-5 grid gap-3 border-t border-amber-200 pt-4 sm:grid-cols-3 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end"><input type="hidden" name="ingesta_id" value={item.id} /><label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-600">Empresa<select name="empresa_id" defaultValue={item.empresa_id ?? ''} required className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold normal-case tracking-normal"><option value="">Seleccione</option>{companies.map((companyRow) => <option key={companyRow.id} value={companyRow.id}>{companyRow.nombre_fantasia || companyRow.razon_social} · {companyRow.rut}</option>)}</select></label><label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-600">Categoría<select name="categoria" defaultValue={item.categoria_sugerida === 'Sin clasificar' ? 'Tributario' : item.categoria_sugerida} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold normal-case tracking-normal">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-600">Periodo<input name="periodo" defaultValue={item.periodo_sugerido ?? ''} placeholder="2026-06" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold normal-case tracking-normal" /></label><button className="h-10 rounded-xl bg-[#0f2438] px-5 text-xs font-black text-white">Confirmar y publicar</button></form></article> })}</div></section>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: 'check' | 'warning' | 'alert'; label: string; value: number }) { return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p></div></article> }
function SectionTitle({ icon, title, description }: { icon: 'upload' | 'tasks' | 'warning'; title: string; description: string }) { return <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div> }
function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-[#0f2438]">{value}</p><p className="text-[11px] font-bold uppercase text-slate-400">{label}</p></div> }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">{text}</div> }
