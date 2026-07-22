import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate, dueDateLabel } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import {
  AdminDocumentUploadForm,
  ClientProfileForm,
  DocumentRequestForm,
  ObligationForm,
  ServiceForm,
  TaskForm,
} from '@/app/admin/components/OperationalForms'
import {
  cambiarEstadoObligacion,
  cambiarEstadoSolicitud,
  cambiarEstadoTarea,
} from '@/app/admin/operational-actions'

export const dynamic = 'force-dynamic'

type Company = {
  id: string
  razon_social: string
  nombre_fantasia: string | null
  rut: string
  tipo_sociedad: string | null
  giro: string | null
  regimen_tributario: string | null
  inicio_actividades: string | null
  direccion: string | null
  comuna: string | null
  ciudad: string | null
  representante_legal: string | null
  representante_rut: string | null
  telefono: string | null
  email_contacto: string | null
  contador_asignado: string | null
  ejecutivo_asignado: string | null
  estado_cliente: string
  estado_impuestos: string
  plan_servicio: string | null
  honorario_mensual: number | null
  dia_pago: number | null
  notas_internas: string | null
  created_at: string
  ultima_actividad_at: string | null
}

type Obligation = {
  id: string
  titulo: string
  tipo: string
  periodo: string | null
  fecha_vencimiento: string
  estado: string
  prioridad: string
  monto: number | null
  requiere_accion_cliente: boolean
  descripcion: string | null
}

type Task = {
  id: string
  titulo: string
  descripcion: string | null
  responsable: string | null
  fecha_vencimiento: string | null
  estado: string
  prioridad: string
}

type RequestRow = {
  id: string
  titulo: string
  descripcion: string | null
  categoria: string
  periodo: string | null
  fecha_limite: string | null
  estado: string
  created_at: string
}

type Service = {
  id: string
  nombre: string
  descripcion: string | null
  estado: string
  fecha_inicio: string | null
  honorario_mensual: number | null
}

type DocumentRow = {
  id: string
  nombre_original: string
  storage_path: string
  categoria: string
  periodo: string | null
  descripcion: string | null
  fecha_subida: string
  file_size: number | null
  solicitud_id: string | null
  signedUrl?: string | null
}

type FinancialRow = {
  id: string
  periodo: string
  descripcion: string
  monto: number | null
  estado: string
  categoria: string
  subcategoria: string
  created_at: string
}

const obligationStates = ['Pendiente', 'En proceso', 'Esperando cliente', 'Presentada', 'Pagada', 'No aplica', 'Vencida']
const taskStates = ['Pendiente', 'En curso', 'Bloqueada', 'Completada']
const requestStates = ['Solicitado', 'Recibido', 'En revisión', 'Observado', 'Aprobado', 'Vencido']

export default async function ClientWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [companyResult, obligationsResult, tasksResult, requestsResult, servicesResult, documentsResult, financialResult] = await Promise.all([
    supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut, tipo_sociedad, giro, regimen_tributario, inicio_actividades, direccion, comuna, ciudad, representante_legal, representante_rut, telefono, email_contacto, contador_asignado, ejecutivo_asignado, estado_cliente, estado_impuestos, plan_servicio, honorario_mensual, dia_pago, notas_internas, created_at, ultima_actividad_at').eq('id', id).eq('es_admin', false).single(),
    supabase.from('obligaciones').select('id, titulo, tipo, periodo, fecha_vencimiento, estado, prioridad, monto, requiere_accion_cliente, descripcion').eq('empresa_id', id).order('fecha_vencimiento'),
    supabase.from('tareas').select('id, titulo, descripcion, responsable, fecha_vencimiento, estado, prioridad').eq('empresa_id', id).order('created_at', { ascending: false }).limit(40),
    supabase.from('solicitudes_documentos').select('id, titulo, descripcion, categoria, periodo, fecha_limite, estado, created_at').eq('empresa_id', id).order('created_at', { ascending: false }).limit(40),
    supabase.from('servicios_contratados').select('id, nombre, descripcion, estado, fecha_inicio, honorario_mensual').eq('empresa_id', id).order('created_at'),
    supabase.from('documentos').select('id, nombre_original, storage_path, categoria, periodo, descripcion, fecha_subida, file_size, solicitud_id').eq('empresa_id', id).order('fecha_subida', { ascending: false }).limit(60),
    supabase.from('datos_empresa').select('id, periodo, descripcion, monto, estado, categoria, subcategoria, created_at').eq('empresa_id', id).order('created_at', { ascending: false }).limit(50),
  ])

  if (companyResult.error || !companyResult.data) notFound()

  const company = companyResult.data as Company
  const obligations = (obligationsResult.data ?? []) as Obligation[]
  const tasks = (tasksResult.data ?? []) as Task[]
  const requests = (requestsResult.data ?? []) as RequestRow[]
  const services = (servicesResult.data ?? []) as Service[]
  const financial = (financialResult.data ?? []) as FinancialRow[]
  const docsRaw = (documentsResult.data ?? []) as DocumentRow[]
  const documents: DocumentRow[] = await Promise.all(docsRaw.map(async (document) => {
    const { data, error } = await supabase.storage.from('documentos').createSignedUrl(document.storage_path, 900)
    return { ...document, signedUrl: error ? null : data.signedUrl }
  }))

  const activeObligations = obligations.filter((item) => !['Presentada', 'Pagada', 'No aplica'].includes(item.estado))
  const activeTasks = tasks.filter((item) => item.estado !== 'Completada')
  const activeRequests = requests.filter((item) => !['Aprobado', 'Vencido'].includes(item.estado))
  const errors = [obligationsResult.error, tasksResult.error, requestsResult.error, servicesResult.error, documentsResult.error, financialResult.error].filter(Boolean)

  return (
    <div className="mx-auto max-w-[1500px]">
      <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />Volver al directorio</Link>

      <header className="mt-5 rounded-3xl bg-[#0f2438] p-6 text-white shadow-xl shadow-[#0f2438]/10 sm:p-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e3bf63]">Ficha 360° del cliente</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{company.nombre_fantasia || company.razon_social}</h1>
            <p className="mt-2 text-sm text-slate-300">{company.razon_social} · RUT {company.rut}</p>
            <div className="mt-5 flex flex-wrap gap-2"><StatusBadge status={company.estado_cliente} /><StatusBadge status={`IVA: ${company.estado_impuestos}`} /></div>
          </div>
          <div className="grid gap-4 text-sm sm:grid-cols-3 lg:text-right">
            <HeaderStat label="Contador" value={company.contador_asignado || 'Sin asignar'} />
            <HeaderStat label="Servicio principal" value={company.plan_servicio || 'Sin detalle'} />
            <HeaderStat label="Honorario mensual" value={formatCurrency(company.honorario_mensual)} />
          </div>
        </div>
      </header>

      {errors.length > 0 && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Algunas áreas no pudieron cargarse. Confirme que la migración operativa esté aplicada correctamente.</div>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon="calendar" label="Obligaciones abiertas" value={activeObligations.length} />
        <SummaryCard icon="tasks" label="Tareas abiertas" value={activeTasks.length} />
        <SummaryCard icon="upload" label="Solicitudes activas" value={activeRequests.length} />
        <SummaryCard icon="folder" label="Documentos" value={documents.length} />
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon="building" title="Información general y responsables" description="Datos legales, tributarios, comerciales y de atención del cliente." />
        <div className="mt-6"><ClientProfileForm company={company} /></div>
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle icon="calendar" title="Obligaciones" description="Declaraciones, pagos, vencimientos y acciones visibles para el cliente." />
          <details className="group mt-5 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden">Crear obligación<AppIcon name="chevron-down" className="h-5 w-5 transition group-open:rotate-180" /></summary>
            <div className="mt-5 border-t border-[#134b78]/15 pt-5"><ObligationForm companyId={company.id} /></div>
          </details>
          <div className="mt-5 grid gap-3">{obligations.length === 0 ? <Empty text="No hay obligaciones registradas." icon="calendar" /> : obligations.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#17324a]">{item.titulo}</h3><StatusBadge status={item.prioridad} /></div><p className="mt-1 text-xs text-slate-500">{item.tipo}{item.periodo ? ` · ${item.periodo}` : ''}</p>{item.descripcion && <p className="mt-3 text-sm leading-6 text-slate-600">{item.descripcion}</p>}</div><div className="shrink-0 sm:text-right"><p className="text-sm font-black">{formatDate(item.fecha_vencimiento)}</p><p className="mt-1 text-xs text-slate-500">{dueDateLabel(item.fecha_vencimiento)}</p>{item.monto !== null && <p className="mt-2 font-black text-[#134b78]">{formatCurrency(item.monto)}</p>}</div></div><form action={cambiarEstadoObligacion} className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="empresa_id" value={company.id} /><select name="estado" defaultValue={item.estado} className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold">{obligationStates.map((status) => <option key={status}>{status}</option>)}</select><button className="h-10 rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Actualizar</button></form></article>)}</div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle icon="tasks" title="Tareas internas" description="Trabajo del equipo, responsables, bloqueos y prioridades." />
          <details className="group mt-5 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden">Crear tarea<AppIcon name="chevron-down" className="h-5 w-5 transition group-open:rotate-180" /></summary><div className="mt-5 border-t border-[#134b78]/15 pt-5"><TaskForm companyId={company.id} /></div></details>
          <div className="mt-5 grid gap-3">{tasks.length === 0 ? <Empty text="No hay tareas registradas." icon="tasks" /> : tasks.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#17324a]">{item.titulo}</h3><p className="mt-1 text-xs text-slate-500">{item.responsable || 'Sin responsable'} · {item.fecha_vencimiento ? formatDate(item.fecha_vencimiento) : 'Sin vencimiento'}</p></div><StatusBadge status={item.prioridad} /></div>{item.descripcion && <p className="mt-3 text-sm leading-6 text-slate-600">{item.descripcion}</p>}<form action={cambiarEstadoTarea} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="empresa_id" value={company.id} /><select name="estado" defaultValue={item.estado} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold">{taskStates.map((status) => <option key={status}>{status}</option>)}</select><button className="h-10 rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Actualizar</button></form></article>)}</div>
        </section>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle icon="upload" title="Solicitudes documentales" description="Antecedentes que el cliente debe enviar desde su portal." />
          <details className="group mt-5 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden">Nueva solicitud<AppIcon name="chevron-down" className="h-5 w-5 transition group-open:rotate-180" /></summary><div className="mt-5 border-t border-[#134b78]/15 pt-5"><DocumentRequestForm companyId={company.id} /></div></details>
          <div className="mt-5 grid gap-3">{requests.length === 0 ? <Empty text="No hay solicitudes registradas." icon="inbox" /> : requests.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#17324a]">{item.titulo}</h3><p className="mt-1 text-xs text-slate-500">{item.categoria}{item.periodo ? ` · ${item.periodo}` : ''}{item.fecha_limite ? ` · límite ${formatDate(item.fecha_limite)}` : ''}</p></div><StatusBadge status={item.estado} /></div>{item.descripcion && <p className="mt-3 text-sm leading-6 text-slate-600">{item.descripcion}</p>}<form action={cambiarEstadoSolicitud} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="empresa_id" value={company.id} /><select name="estado" defaultValue={item.estado} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold">{requestStates.map((status) => <option key={status}>{status}</option>)}</select><button className="h-10 rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Actualizar</button></form></article>)}</div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle icon="briefcase" title="Servicios contratados" description="Alcance, vigencia y honorarios asociados a la cuenta." />
          <details className="group mt-5 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden">Agregar servicio<AppIcon name="chevron-down" className="h-5 w-5 transition group-open:rotate-180" /></summary><div className="mt-5 border-t border-[#134b78]/15 pt-5"><ServiceForm companyId={company.id} /></div></details>
          <div className="mt-5 grid gap-3">{services.length === 0 ? <Empty text="No hay servicios detallados." icon="briefcase" /> : services.map((service) => <article key={service.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#17324a]">{service.nombre}</h3><p className="mt-1 text-xs text-slate-500">Inicio: {service.fecha_inicio ? formatDate(service.fecha_inicio) : 'sin fecha'}</p></div><StatusBadge status={service.estado} /></div>{service.descripcion && <p className="mt-3 text-sm leading-6 text-slate-600">{service.descripcion}</p>}<p className="mt-3 font-black text-[#134b78]">{formatCurrency(service.honorario_mensual)}</p></article>)}</div>
        </section>
      </div>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle icon="folder" title="Documentos del cliente" description="Carga, clasificación y acceso seguro a archivos tributarios, laborales y legales." />
        <details className="group mt-5 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden">Publicar documento<AppIcon name="chevron-down" className="h-5 w-5 transition group-open:rotate-180" /></summary><div className="mt-5 border-t border-[#134b78]/15 pt-5"><AdminDocumentUploadForm companyId={company.id} /></div></details>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{documents.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><Empty text="No hay documentos cargados." icon="folder" /></div> : documents.map((document) => <article key={document.id} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name="document" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-black text-[#17324a]" title={document.nombre_original}>{document.nombre_original}</p><p className="mt-1 text-xs text-slate-500">{document.categoria}{document.periodo ? ` · ${document.periodo}` : ''} · {formatDate(document.fecha_subida)}</p>{document.descripcion && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{document.descripcion}</p>}{document.signedUrl && <a href={document.signedUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[#134b78] hover:underline"><AppIcon name="download" className="h-4 w-4" />Descargar</a>}</div></article>)}</div>
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle icon="money" title="Registros financieros importados" description="Información disponible en el portal del cliente, organizada por periodo y servicio." />
        <div className="mt-5 overflow-x-auto"><table className="min-w-[800px] w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.12em] text-slate-400"><th className="px-3 py-3">Periodo</th><th className="px-3 py-3">Área</th><th className="px-3 py-3">Descripción</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Monto</th><th className="px-3 py-3">Carga</th></tr></thead><tbody>{financial.length === 0 ? <tr><td colSpan={6} className="px-3 py-12 text-center text-slate-500">No hay registros importados.</td></tr> : financial.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-bold">{item.periodo}</td><td className="px-3 py-4"><p className="font-bold">{item.categoria}</p><p className="text-xs text-slate-400">{item.subcategoria}</p></td><td className="max-w-md px-3 py-4 text-slate-600">{item.descripcion}</td><td className="px-3 py-4"><StatusBadge status={item.estado} /></td><td className="px-3 py-4 text-right font-black text-[#134b78]">{formatCurrency(item.monto)}</td><td className="px-3 py-4 text-slate-500">{formatDate(item.created_at)}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  )
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span><span className="mt-1 block max-w-[220px] truncate font-bold text-white">{value}</span></div>
}

function SummaryCard({ icon, label, value }: { icon: 'calendar' | 'tasks' | 'upload' | 'folder'; label: string; value: number }) {
  return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p></div></article>
}

function SectionTitle({ icon, title, description }: { icon: 'building' | 'calendar' | 'tasks' | 'upload' | 'briefcase' | 'folder' | 'money'; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div>
}

function Empty({ text, icon }: { text: string; icon: 'calendar' | 'tasks' | 'inbox' | 'briefcase' | 'folder' }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center"><AppIcon name={icon} className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-500">{text}</p></div>
}
