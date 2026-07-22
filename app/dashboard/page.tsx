import { redirect } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'
import { BrandLogo } from '@/components/BrandLogo'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RequestUploadForm } from '@/app/dashboard/components/RequestUploadForm'
import { formatCurrency, formatDate, dueDateLabel } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { signOut } from './actions'

export const dynamic = 'force-dynamic'

type DocumentRow = {
  id: string
  nombre_original: string
  storage_path: string
  categoria: 'Impuestos' | 'Remuneraciones' | 'Legal'
  periodo: string | null
  descripcion: string | null
  fecha_subida: string
}

type DocumentWithUrl = DocumentRow & { signedUrl: string | null }

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

type RequestRow = {
  id: string
  titulo: string
  descripcion: string | null
  categoria: string
  periodo: string | null
  fecha_limite: string | null
  estado: string
}

type FinancialRow = {
  id: string
  periodo: string
  descripcion: string
  monto: number | null
  estado: string
  categoria: string
  subcategoria: string
}

type ServiceRow = {
  id: string
  nombre: string
  descripcion: string | null
  estado: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  const { data: empresa, error: companyError } = await supabase
    .from('empresas')
    .select('id, razon_social, nombre_fantasia, rut, estado_impuestos, estado_cliente, contador_asignado, ejecutivo_asignado, plan_servicio, es_admin, must_change_password')
    .eq('user_id', user.id)
    .single()

  if (companyError || !empresa) {
    await supabase.auth.signOut()
    redirect('/login?message=Su cuenta no tiene una empresa asociada')
  }
  if (empresa.es_admin) redirect('/admin')
  if (empresa.must_change_password) redirect('/cuenta/cambiar-clave')

  const [obligationsResult, requestsResult, financialResult, servicesResult, documentsResult] = await Promise.all([
    supabase.from('obligaciones').select('id, titulo, tipo, periodo, fecha_vencimiento, estado, prioridad, monto, requiere_accion_cliente, descripcion').eq('empresa_id', empresa.id).order('fecha_vencimiento').limit(20),
    supabase.from('solicitudes_documentos').select('id, titulo, descripcion, categoria, periodo, fecha_limite, estado').eq('empresa_id', empresa.id).order('created_at', { ascending: false }).limit(12),
    supabase.from('datos_empresa').select('id, periodo, descripcion, monto, estado, categoria, subcategoria').eq('empresa_id', empresa.id).order('created_at', { ascending: false }).limit(18),
    supabase.from('servicios_contratados').select('id, nombre, descripcion, estado').eq('empresa_id', empresa.id).order('created_at'),
    supabase.from('documentos').select('id, nombre_original, storage_path, categoria, periodo, descripcion, fecha_subida').eq('empresa_id', empresa.id).eq('visible_cliente', true).order('fecha_subida', { ascending: false }).limit(30),
  ])

  const obligations = (obligationsResult.data ?? []) as Obligation[]
  const requests = (requestsResult.data ?? []) as RequestRow[]
  const financialRows = (financialResult.data ?? []) as FinancialRow[]
  const services = (servicesResult.data ?? []) as ServiceRow[]
  const documentRows = (documentsResult.data ?? []) as DocumentRow[]

  const documents: DocumentWithUrl[] = await Promise.all(documentRows.map(async (document) => {
    const { data, error } = await supabase.storage.from('documentos').createSignedUrl(document.storage_path, 900)
    return { ...document, signedUrl: error ? null : data.signedUrl }
  }))

  const openObligations = obligations.filter((item) => !['Presentada', 'Pagada', 'No aplica'].includes(item.estado))
  const clientRequests = requests.filter((item) => !['Aprobado', 'Vencido'].includes(item.estado))
  const urgent = openObligations.filter((item) => item.prioridad === 'Crítica' || item.estado === 'Vencida').length
  const totalVisibleAmount = financialRows.reduce((sum, item) => sum + (Number(item.monto) || 0), 0)

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#17324a]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <BrandLogo href="/dashboard" compact />
            <span className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a47b24]">Portal de clientes</p>
              <p className="text-sm font-bold text-slate-500">Información privada y protegida</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="max-w-[230px] truncate text-sm font-bold text-slate-600">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="rounded-3xl bg-[#0f2438] p-6 text-white shadow-xl shadow-[#0f2438]/10 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e3bf63]">Resumen de la empresa</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{empresa.nombre_fantasia || empresa.razon_social}</h1>
              <p className="mt-2 text-sm text-slate-300">{empresa.razon_social} · RUT {empresa.rut}</p>
              <div className="mt-5 flex flex-wrap gap-2"><StatusBadge status={empresa.estado_cliente || 'Activo'} /><StatusBadge status={`IVA: ${empresa.estado_impuestos}`} /></div>
            </div>
            <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2 lg:text-right">
              <p><span className="block text-xs font-black uppercase tracking-wider text-slate-500">Contador asignado</span><span className="mt-1 block font-bold text-white">{empresa.contador_asignado || 'Equipo SERCOPREV'}</span></p>
              <p><span className="block text-xs font-black uppercase tracking-wider text-slate-500">Plan o servicio</span><span className="mt-1 block font-bold text-white">{empresa.plan_servicio || 'Servicio contable'}</span></p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principales">
          <MetricCard label="Obligaciones abiertas" value={openObligations.length} detail={urgent ? `${urgent} requieren atención prioritaria` : 'Sin alertas críticas'} icon="calendar" tone={urgent ? 'red' : 'blue'} />
          <MetricCard label="Solicitudes activas" value={clientRequests.length} detail="Antecedentes solicitados por SERCOPREV" icon="upload" tone={clientRequests.length ? 'gold' : 'green'} />
          <MetricCard label="Documentos disponibles" value={documents.length} detail="Últimos documentos publicados" icon="folder" tone="navy" />
          <MetricCard label="Registros del periodo" value={financialRows.length} detail={financialRows.length ? `Total referencial ${formatCurrency(totalVisibleAmount)}` : 'Aún no hay información cargada'} icon="money" tone="green" />
        </section>

        {(obligationsResult.error || requestsResult.error || financialResult.error || servicesResult.error || documentsResult.error) && (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Parte de la información no pudo cargarse. Actualice la página o contacte a SERCOPREV.</div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader icon="calendar" title="Obligaciones y vencimientos" description="Estado de las principales gestiones del periodo." />
            <div className="mt-5 grid gap-3">
              {obligations.length === 0 ? <EmptyState icon="calendar" text="No hay obligaciones publicadas para este periodo." /> : obligations.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#0f2438]">{item.titulo}</h3><StatusBadge status={item.estado} /></div>
                      <p className="mt-1 text-sm text-slate-500">{item.tipo}{item.periodo ? ` · ${item.periodo}` : ''}</p>
                      {item.descripcion && <p className="mt-3 text-sm leading-6 text-slate-600">{item.descripcion}</p>}
                    </div>
                    <div className="shrink-0 sm:text-right"><p className="text-sm font-black text-[#17324a]">{formatDate(item.fecha_vencimiento)}</p><p className={`mt-1 text-xs font-bold ${dueDateLabel(item.fecha_vencimiento).startsWith('Vencida') ? 'text-red-600' : 'text-slate-500'}`}>{dueDateLabel(item.fecha_vencimiento)}</p>{item.monto !== null && <p className="mt-2 text-sm font-black text-[#134b78]">{formatCurrency(item.monto)}</p>}</div>
                  </div>
                  {item.requiere_accion_cliente && <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"><AppIcon name="warning" className="h-4 w-4" />Requiere una acción o antecedente de su empresa.</div>}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader icon="upload" title="Solicitudes de documentos" description="Antecedentes que SERCOPREV necesita revisar." />
            <div className="mt-5 grid gap-3">
              {requests.length === 0 ? <EmptyState icon="inbox" text="No hay solicitudes de documentos." /> : requests.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#0f2438]">{item.titulo}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{item.categoria}{item.periodo ? ` · ${item.periodo}` : ''}</p></div><StatusBadge status={item.estado} /></div>
                  {item.descripcion && <p className="mt-3 text-sm leading-6 text-slate-600">{item.descripcion}</p>}
                  {item.fecha_limite && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500"><AppIcon name="clock" className="h-4 w-4" />Fecha límite: {formatDate(item.fecha_limite)}</p>}
                  {!['Aprobado', 'Vencido'].includes(item.estado) && <RequestUploadForm solicitudId={item.id} />}
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader icon="money" title="Información financiera y operativa" description="Registros publicados por SERCOPREV para consulta del cliente." />
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.12em] text-slate-400"><th className="px-3 py-3">Periodo</th><th className="px-3 py-3">Área</th><th className="px-3 py-3">Descripción</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Monto</th></tr></thead>
              <tbody>{financialRows.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">No hay registros financieros publicados.</td></tr> : financialRows.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-bold text-[#17324a]">{item.periodo}</td><td className="px-3 py-4"><p className="font-bold text-[#17324a]">{item.categoria}</p><p className="text-xs text-slate-400">{item.subcategoria}</p></td><td className="max-w-md px-3 py-4 text-slate-600">{item.descripcion}</td><td className="px-3 py-4"><StatusBadge status={item.estado} /></td><td className="px-3 py-4 text-right font-black text-[#134b78]">{formatCurrency(item.monto)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader icon="briefcase" title="Servicios contratados" description="Áreas actualmente atendidas por SERCOPREV." />
            <div className="mt-5 grid gap-3">{services.length === 0 ? <EmptyState icon="briefcase" text="Los servicios contratados aún no han sido detallados." /> : services.map((service) => <article key={service.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-black text-[#0f2438]">{service.nombre}</h3><StatusBadge status={service.estado} /></div>{service.descripcion && <p className="mt-2 text-sm leading-6 text-slate-600">{service.descripcion}</p>}</article>)}</div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader icon="folder" title="Centro documental" description="Documentos tributarios, laborales y legales publicados para su empresa." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{documents.length === 0 ? <div className="sm:col-span-2"><EmptyState icon="folder" text="No hay documentos disponibles." /></div> : documents.map((document) => <article key={document.id} className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name="document" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[#17324a]" title={document.nombre_original}>{document.nombre_original}</p><p className="mt-1 text-xs text-slate-500">{document.categoria}{document.periodo ? ` · ${document.periodo}` : ''} · {formatDate(document.fecha_subida)}</p>{document.signedUrl ? <a href={document.signedUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[#134b78] hover:underline"><AppIcon name="download" className="h-4 w-4" />Descargar</a> : <p className="mt-3 text-xs font-bold text-red-600">Archivo no disponible</p>}</div></article>)}</div>
          </section>
        </div>
      </main>
    </div>
  )
}

function SectionHeader({ icon, title, description }: { icon: 'calendar' | 'upload' | 'money' | 'briefcase' | 'folder'; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div>
}

function EmptyState({ icon, text }: { icon: 'calendar' | 'inbox' | 'briefcase' | 'folder'; text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"><AppIcon name={icon} className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-500">{text}</p></div>
}
