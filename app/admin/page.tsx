import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, dueDateLabel } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type RelatedCompany = { razon_social: string } | Array<{ razon_social: string }> | null

type ObligationRow = {
  id: string
  titulo: string
  fecha_vencimiento: string
  estado: string
  prioridad: string
  empresa_id: string
  empresa: RelatedCompany
}

type TaskRow = {
  id: string
  titulo: string
  fecha_vencimiento: string | null
  estado: string
  prioridad: string
  responsable: string | null
  empresa_id: string | null
  empresa: RelatedCompany
}

type LeadRow = {
  id: string
  nombre: string
  empresa: string | null
  servicio: string
  estado: string
  created_at: string
}

type ClientRow = {
  id: string
  razon_social: string
  estado_cliente: string
  ultima_actividad_at: string | null
}

function companyName(value: RelatedCompany) {
  if (Array.isArray(value)) return value[0]?.razon_social ?? 'Sin empresa'
  return value?.razon_social ?? 'Sin empresa'
}

export default async function AdminPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const inThirtyDays = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)

  const [clientsCount, obligationsCount, overdueCount, requestsCount, leadsCount, obligationsResult, tasksResult, leadsResult, clientsResult] = await Promise.all([
    supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('es_admin', false).neq('estado_cliente', 'Archivado'),
    supabase.from('obligaciones').select('id', { count: 'exact', head: true }).not('estado', 'in', '(Presentada,Pagada,No aplica)'),
    supabase.from('obligaciones').select('id', { count: 'exact', head: true }).lt('fecha_vencimiento', today).not('estado', 'in', '(Presentada,Pagada,No aplica)'),
    supabase.from('solicitudes_documentos').select('id', { count: 'exact', head: true }).not('estado', 'in', '(Aprobado,Vencido)'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).not('estado', 'in', '(Ganado,Descartado)'),
    supabase.from('obligaciones').select('id, titulo, fecha_vencimiento, estado, prioridad, empresa_id, empresa:empresas(razon_social)').gte('fecha_vencimiento', today).lte('fecha_vencimiento', inThirtyDays).not('estado', 'in', '(Presentada,Pagada,No aplica)').order('fecha_vencimiento').limit(8),
    supabase.from('tareas').select('id, titulo, fecha_vencimiento, estado, prioridad, responsable, empresa_id, empresa:empresas(razon_social)').not('estado', 'eq', 'Completada').order('fecha_vencimiento', { ascending: true, nullsFirst: false }).limit(8),
    supabase.from('leads').select('id, nombre, empresa, servicio, estado, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('empresas').select('id, razon_social, estado_cliente, ultima_actividad_at').eq('es_admin', false).in('estado_cliente', ['En incorporación', 'Requiere atención', 'Suspendido']).order('updated_at', { ascending: false }).limit(6),
  ])

  const obligations = (obligationsResult.data ?? []) as ObligationRow[]
  const tasks = (tasksResult.data ?? []) as TaskRow[]
  const leads = (leadsResult.data ?? []) as LeadRow[]
  const clients = (clientsResult.data ?? []) as ClientRow[]
  const hasErrors = [clientsCount.error, obligationsCount.error, overdueCount.error, requestsCount.error, leadsCount.error, obligationsResult.error, tasksResult.error, leadsResult.error, clientsResult.error].some(Boolean)

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Centro operativo</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Resumen de la cartera</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Prioridades, vencimientos, solicitudes y oportunidades comerciales en una sola vista.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/clientes" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-[#17324a] shadow-sm hover:border-[#134b78]/30"><AppIcon name="users" className="h-4 w-4" />Ver clientes</Link>
          <Link href="/admin/clientes#nuevo" className="inline-flex items-center gap-2 rounded-xl bg-[#0f2438] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-[#0f2438]/10 hover:bg-[#173d5c]"><AppIcon name="plus" className="h-4 w-4" />Nuevo cliente</Link>
        </div>
      </header>

      {hasErrors && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Algunos indicadores no pudieron cargarse. Revise que la migración operativa se encuentre aplicada.</div>}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores de cartera">
        <MetricCard label="Clientes activos" value={clientsCount.count ?? 0} detail="Empresas no archivadas" icon="users" tone="navy" />
        <MetricCard label="Obligaciones abiertas" value={obligationsCount.count ?? 0} detail="Pendientes o en proceso" icon="calendar" tone="blue" />
        <MetricCard label="Vencidas" value={overdueCount.count ?? 0} detail="Requieren regularización" icon="warning" tone={(overdueCount.count ?? 0) > 0 ? 'red' : 'green'} />
        <MetricCard label="Documentos pendientes" value={requestsCount.count ?? 0} detail="Solicitudes activas" icon="upload" tone="gold" />
        <MetricCard label="Prospectos abiertos" value={leadsCount.count ?? 0} detail="Oportunidades por gestionar" icon="lead" tone="green" />
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <PanelHeader icon="calendar" title="Próximos vencimientos" description="Obligaciones abiertas dentro de los próximos 30 días." href="/admin/operaciones" />
          <div className="mt-5 grid gap-3">
            {obligations.length === 0 ? <Empty text="No hay vencimientos próximos." icon="calendar" /> : obligations.map((item) => (
              <Link key={item.id} href={`/admin/clientes/${item.empresa_id}`} className="group flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-[#134b78]/30 hover:bg-[#f8fafb] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-black text-[#17324a]">{item.titulo}</p><StatusBadge status={item.prioridad} /></div><p className="mt-1 truncate text-sm text-slate-500">{companyName(item.empresa)}</p></div>
                <div className="shrink-0 sm:text-right"><p className="text-sm font-black text-[#17324a]">{formatDate(item.fecha_vencimiento)}</p><p className="mt-1 text-xs font-bold text-slate-500">{dueDateLabel(item.fecha_vencimiento)}</p></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <PanelHeader icon="tasks" title="Tareas del equipo" description="Trabajo pendiente y responsables asignados." href="/admin/operaciones" />
          <div className="mt-5 grid gap-3">
            {tasks.length === 0 ? <Empty text="No hay tareas abiertas." icon="tasks" /> : tasks.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-[#17324a]">{item.titulo}</p><p className="mt-1 truncate text-xs text-slate-500">{companyName(item.empresa)}{item.responsable ? ` · ${item.responsable}` : ''}</p></div><StatusBadge status={item.estado} /></div>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500"><StatusBadge status={item.prioridad} /><span>{item.fecha_vencimiento ? formatDate(item.fecha_vencimiento) : 'Sin vencimiento'}</span></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <PanelHeader icon="lead" title="Prospectos recientes" description="Solicitudes recibidas desde la landing." href="/admin/leads" />
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.12em] text-slate-400"><th className="px-2 py-3">Contacto</th><th className="px-2 py-3">Servicio</th><th className="px-2 py-3">Estado</th><th className="px-2 py-3">Ingreso</th></tr></thead>
              <tbody>{leads.length === 0 ? <tr><td colSpan={4} className="px-2 py-9 text-center text-slate-500">No hay prospectos registrados.</td></tr> : leads.map((lead) => <tr key={lead.id} className="border-b border-slate-100 last:border-0"><td className="px-2 py-4"><p className="font-black text-[#17324a]">{lead.nombre}</p><p className="text-xs text-slate-500">{lead.empresa || 'Sin empresa informada'}</p></td><td className="px-2 py-4 text-slate-600">{lead.servicio}</td><td className="px-2 py-4"><StatusBadge status={lead.estado} /></td><td className="px-2 py-4 text-slate-500">{formatDate(lead.created_at)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <PanelHeader icon="warning" title="Clientes que requieren atención" description="Incorporaciones, alertas o cuentas suspendidas." href="/admin/clientes" />
          <div className="mt-5 grid gap-3">
            {clients.length === 0 ? <Empty text="No hay clientes marcados para atención." icon="check" /> : clients.map((client) => <Link key={client.id} href={`/admin/clientes/${client.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-[#134b78]/30 hover:bg-[#f8fafb]"><div className="min-w-0"><p className="truncate font-black text-[#17324a]">{client.razon_social}</p><p className="mt-1 text-xs text-slate-500">Última actividad: {client.ultima_actividad_at ? formatDate(client.ultima_actividad_at) : 'sin registro'}</p></div><StatusBadge status={client.estado_cliente} /></Link>)}
          </div>
        </section>
      </div>
    </div>
  )
}

function PanelHeader({ icon, title, description, href }: { icon: 'calendar' | 'tasks' | 'lead' | 'warning'; title: string; description: string; href: string }) {
  return <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div><Link href={href} className="shrink-0 text-xs font-black text-[#134b78] hover:underline">Ver todo</Link></div>
}

function Empty({ text, icon }: { text: string; icon: 'calendar' | 'tasks' | 'check' }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center"><AppIcon name={icon} className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-500">{text}</p></div>
}
