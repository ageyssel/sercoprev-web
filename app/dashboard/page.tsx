import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'
import { BrandLogo } from '@/components/BrandLogo'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RequestUploadForm } from '@/app/dashboard/components/RequestUploadForm'
import { formatCurrency, formatDate } from '@/lib/format'
import { requireClientCompany } from '@/utils/supabase/require-client'
import { signOut } from './actions'

export const dynamic = 'force-dynamic'

type DocumentRow = { id: string; nombre_original: string; storage_path: string; categoria: string; periodo: string | null; descripcion: string | null; fecha_subida: string }
type RequestRow = { id: string; titulo: string; descripcion: string | null; categoria: string; periodo: string | null; estado: string }
type FinancialRow = { id: string; periodo: string; descripcion: string; monto: number | null; estado: string; categoria: string; subcategoria: string }
type ServiceRow = { id: string; nombre: string; descripcion: string | null; estado: string }

export default async function DashboardPage() {
  let access: Awaited<ReturnType<typeof requireClientCompany>>
  try {
    access = await requireClientCompany()
  } catch {
    redirect('/login?message=Su cuenta no tiene una empresa asociada')
  }

  if (access.mustChangePassword) redirect('/cuenta/cambiar-clave')
  const { sessionClient: supabase, company, role, displayName } = access
  const { data: empresa, error: companyError } = await supabase
    .from('empresas')
    .select('id, razon_social, nombre_fantasia, rut, estado_cliente, contador_asignado, plan_servicio')
    .eq('id', company.id)
    .single()
  if (companyError || !empresa) redirect('/login?message=Empresa no disponible')

  const [requestsResult, financialResult, servicesResult, documentsResult] = await Promise.all([
    supabase.from('solicitudes_documentos').select('id, titulo, descripcion, categoria, periodo, estado').eq('empresa_id', company.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('datos_empresa').select('id, periodo, descripcion, monto, estado, categoria, subcategoria').eq('empresa_id', company.id).order('created_at', { ascending: false }).limit(25),
    supabase.from('servicios_contratados').select('id, nombre, descripcion, estado').eq('empresa_id', company.id).order('created_at'),
    supabase.from('documentos').select('id, nombre_original, storage_path, categoria, periodo, descripcion, fecha_subida').eq('empresa_id', company.id).eq('visible_cliente', true).order('fecha_subida', { ascending: false }).limit(40),
  ])

  const requests = (requestsResult.data ?? []) as RequestRow[]
  const financialRows = (financialResult.data ?? []) as FinancialRow[]
  const services = (servicesResult.data ?? []) as ServiceRow[]
  const documentRows = (documentsResult.data ?? []) as DocumentRow[]
  const documents = await Promise.all(documentRows.map(async (document) => {
    const { data, error } = await supabase.storage.from('documentos').createSignedUrl(document.storage_path, 900)
    return { ...document, signedUrl: error ? null : data.signedUrl }
  }))

  const activeRequests = requests.filter((item) => !['Aprobado', 'Vencido'].includes(item.estado))
  const activeServices = services.filter((item) => item.estado === 'Activo')
  const totalVisibleAmount = financialRows.reduce((sum, item) => sum + (Number(item.monto) || 0), 0)
  const hasError = requestsResult.error || financialResult.error || servicesResult.error || documentsResult.error
  const canWrite = role !== 'Solo lectura'

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#17324a]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-4"><BrandLogo href="/dashboard" compact /><span className="hidden h-7 w-px bg-slate-200 sm:block" /><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a47b24]">Portal de clientes</p><p className="text-sm font-bold text-slate-500">{displayName} · {role}</p></div></div><div className="flex items-center justify-between gap-3"><span className="max-w-[230px] truncate text-sm font-bold text-slate-600">RUT {empresa.rut}</span><form action={signOut}><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-red-50 hover:text-red-700">Cerrar sesión</button></form></div></div></header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="rounded-3xl bg-[#0f2438] p-6 text-white shadow-xl shadow-[#0f2438]/10 sm:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e3bf63]">Resumen de la empresa</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{empresa.nombre_fantasia || empresa.razon_social}</h1><p className="mt-2 text-sm text-slate-300">{empresa.razon_social} · RUT {empresa.rut}</p><div className="mt-5 flex flex-wrap gap-2"><StatusBadge status={empresa.estado_cliente || 'Activo'} />{!canWrite && <StatusBadge status="Solo lectura" />}</div></div><div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:text-right"><p><span className="block text-xs font-black uppercase tracking-wider text-slate-500">Contador</span><span className="mt-1 block font-bold text-white">{empresa.contador_asignado || 'Equipo SERCOPREV'}</span></p><p><span className="block text-xs font-black uppercase tracking-wider text-slate-500">Servicio</span><span className="mt-1 block font-bold text-white">{empresa.plan_servicio || 'Servicio contable'}</span></p></div></div></section>

        <nav className="mt-5 flex flex-wrap gap-2"><Link href="/dashboard" className="rounded-xl bg-[#0f2438] px-4 py-2.5 text-xs font-black text-white">Resumen</Link><Link href="/dashboard/cobranza" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700">Honorarios</Link><Link href="/dashboard/consultas" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700">Consultas</Link><Link href="/dashboard/remuneraciones" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700">Remuneraciones</Link></nav>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Solicitudes activas" value={activeRequests.length} detail="Antecedentes requeridos" icon="upload" tone={activeRequests.length ? 'gold' : 'green'} /><MetricCard label="Documentos" value={documents.length} detail="Últimos archivos publicados" icon="folder" tone="navy" /><MetricCard label="Registros" value={financialRows.length} detail={financialRows.length ? formatCurrency(totalVisibleAmount) : 'Sin información'} icon="money" tone="green" /><MetricCard label="Servicios" value={activeServices.length} detail="Servicios activos" icon="briefcase" tone="blue" /></section>
        {hasError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Parte de la información no pudo cargarse.</div>}

        <Panel icon="upload" title="Solicitudes documentales" className="mt-8"><div className="grid gap-3 sm:grid-cols-2">{requests.length === 0 ? <div className="sm:col-span-2"><Empty text="No hay solicitudes documentales." /></div> : requests.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#0f2438]">{item.titulo}</h3><p className="mt-1 text-xs font-bold uppercase text-slate-400">{item.categoria}{item.periodo ? ` · ${item.periodo}` : ''}</p></div><StatusBadge status={item.estado} /></div>{item.descripcion && <p className="mt-3 text-sm leading-6 text-slate-600">{item.descripcion}</p>}{canWrite && !['Aprobado', 'Vencido'].includes(item.estado) && <RequestUploadForm solicitudId={item.id} />}</article>)}</div></Panel>

        <Panel icon="folder" title="Centro documental" className="mt-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{documents.length === 0 ? <div className="sm:col-span-2 xl:col-span-3"><Empty text="No hay documentos disponibles." /></div> : documents.map((document) => <article key={document.id} className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 p-4"><AppIcon name="document" className="h-6 w-6 shrink-0 text-[#134b78]" /><div className="min-w-0"><p className="truncate font-black text-[#17324a]" title={document.nombre_original}>{document.nombre_original}</p><p className="mt-1 text-xs text-slate-500">{document.categoria}{document.periodo ? ` · ${document.periodo}` : ''} · {formatDate(document.fecha_subida)}</p>{document.signedUrl && <a href={document.signedUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#134b78] hover:underline"><AppIcon name="download" className="h-4 w-4" />Descargar</a>}</div></article>)}</div></Panel>

        <div className="mt-6 grid gap-6 xl:grid-cols-2"><Panel icon="money" title="Información financiera"><div className="overflow-x-auto"><table className="min-w-[650px] w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-400"><th className="px-3 py-3">Periodo</th><th className="px-3 py-3">Área</th><th className="px-3 py-3">Detalle</th><th className="px-3 py-3 text-right">Monto</th></tr></thead><tbody>{financialRows.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">Sin registros.</td></tr> : financialRows.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-4 font-bold">{item.periodo}</td><td className="px-3 py-4">{item.categoria}<p className="text-xs text-slate-400">{item.subcategoria}</p></td><td className="px-3 py-4 text-slate-600">{item.descripcion}</td><td className="px-3 py-4 text-right font-black text-[#134b78]">{formatCurrency(item.monto)}</td></tr>)}</tbody></table></div></Panel><Panel icon="briefcase" title="Servicios contratados"><div className="grid gap-3">{services.length === 0 ? <Empty text="Los servicios aún no han sido detallados." /> : services.map((service) => <article key={service.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-black">{service.nombre}</h3><StatusBadge status={service.estado} /></div>{service.descripcion && <p className="mt-2 text-sm leading-6 text-slate-600">{service.descripcion}</p>}</article>)}</div></Panel></div>
      </main>
    </div>
  )
}

function Panel({ icon, title, children, className = '' }: { icon: 'upload' | 'folder' | 'money' | 'briefcase'; title: string; children: React.ReactNode; className?: string }) { return <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><h2 className="text-xl font-black text-[#0f2438]">{title}</h2></div>{children}</section> }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">{text}</div> }
