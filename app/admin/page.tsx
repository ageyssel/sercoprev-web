import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { OfficialIndicatorsPanel } from '@/components/admin/OfficialIndicatorsDashboard'
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
  const todayDate = new Date()
  const today = todayDate.toISOString().slice(0, 10)
  const inThirtyDaysDate = new Date(todayDate)
  inThirtyDaysDate.setUTCDate(inThirtyDaysDate.getUTCDate() + 30)
  const inThirtyDays = inThirtyDaysDate.toISOString().slice(0, 10)

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
      <ModulePageHeader
        eyebrow="Centro operativo"
        title="Resumen de la cartera"
        description="Prioridades, vencimientos, solicitudes documentales y oportunidades comerciales en una vista ejecutiva y accionable."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/leads" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfa84b]/30 bg-[#fbf6e8] px-3.5 text-xs font-extrabold text-[#7d601f] shadow-sm hover:border-[#cfa84b]/50"><AppIcon name="lead" className="h-3.5 w-3.5" />Ver prospectos</Link>
            <Link href="/admin/clientes" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-extrabold text-[#193247] shadow-sm hover:border-[#174f7a]/30"><AppIcon name="users" className="h-3.5 w-3.5" />Ver clientes</Link>
            <Link href="/admin/clientes#nuevo" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#10283d] px-3.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#173d59]"><AppIcon name="plus" className="h-3.5 w-3.5" />Nuevo cliente</Link>
          </div>
        }
      />

      {hasErrors && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Algunos indicadores no pudieron cargarse. Revise que la migración operativa se encuentre aplicada.</div>}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores de cartera">
        <MetricCard label="Clientes activos" value={clientsCount.count ?? 0} detail="Empresas no archivadas" icon="users" tone="navy" />
        <MetricCard label="Obligaciones abiertas" value={obligationsCount.count ?? 0} detail="Pendientes o en proceso" icon="calendar" tone="blue" />
        <MetricCard label="Vencidas" value={overdueCount.count ?? 0} detail="Requieren regularización" icon="warning" tone={(overdueCount.count ?? 0) > 0 ? 'red' : 'green'} />
        <MetricCard label="Documentos pendientes" value={requestsCount.count ?? 0} detail="Solicitudes activas" icon="upload" tone="gold" />
        <MetricCard label="Prospectos abiertos" value={leadsCount.count ?? 0} detail="Solicitudes del landing" icon="lead" tone="green" />
      </section>

      <OfficialIndicatorsPanel />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PanelHeader icon="calendar" title="Próximos vencimientos" description="Obligaciones abiertas dentro de los próximos 30 días." href="/admin/operaciones" />
          <div className="mt-4 grid gap-2.5">
            {obligations.length === 0 ? <Empty text="No hay vencimientos próximos." icon="calendar" /> : obligations.map((item) => (
              <Link key={item.id} href={`/admin/clientes/${item.empresa_id}`} className="group flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3.5 hover:border-[#174f7a]/25 hover:bg-[#f8fafc] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13px] font-extrabold text-[#193247]">{item.titulo}</p><StatusBadge status={item.prioridad} /></div><p className="mt-1 truncate text-xs font-medium text-slate-500">{companyName(item.empresa)}</p></div>
                <div className="shrink-0 sm:text-right"><p className="text-xs font-extrabold text-[#193247]">{formatDate(item.fecha_vencimiento)}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{dueDateLabel(item.fecha_vencimiento)}</p></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PanelHeader icon="tasks" title="Tareas del equipo" description="Trabajo pendiente y responsables asignados." href="/admin/operaciones" />
          <div className="mt-4 grid gap-2.5">
            {tasks.length === 0 ? <Empty text="No hay tareas abiertas." icon="tasks" /> : tasks.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 px-4 py-3.5 shadow-none">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[13px] font-extrabold text-[#193247]">{item.titulo}</p><p className="mt-1 truncate text-[11px] font-medium text-slate-500">{companyName(item.empresa)}{item.responsable ? ` · ${item.responsable}` : ''}</p></div><StatusBadge status={item.estado} /></div>
                <div className="mt-2.5 flex items-center justify-between"><StatusBadge status={item.prioridad} /><span className="text-[10px] font-bold text-slate-500">{item.fecha_vencimiento ? formatDate(item.fecha_vencimiento) : 'Sin vencimiento'}</span></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PanelHeader icon="lead" title="Prospectos recientes" description="Solicitudes ingresadas desde el formulario público." href="/admin/leads" />
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-xs">
              <thead><tr><th className="px-2 py-3">Contacto</th><th className="px-2 py-3">Servicio</th><th className="px-2 py-3">Estado</th><th className="px-2 py-3">Ingreso</th></tr></thead>
              <tbody>{leads.length === 0 ? <tr><td colSpan={4} className="px-2 py-9 text-center text-slate-500">No hay prospectos registrados.</td></tr> : leads.map((lead) => <tr key={lead.id} className="border-t border-slate-100"><td className="px-2 py-3.5"><p className="font-extrabold text-[#193247]">{lead.nombre}</p><p className="mt-0.5 text-[10px] text-slate-500">{lead.empresa || 'Sin empresa informada'}</p></td><td className="px-2 py-3.5 font-medium text-slate-600">{lead.servicio}</td><td className="px-2 py-3.5"><StatusBadge status={lead.estado} /></td><td className="px-2 py-3.5 text-slate-500">{formatDate(lead.created_at)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PanelHeader icon="warning" title="Clientes que requieren atención" description="Incorporaciones, alertas o cuentas suspendidas." href="/admin/clientes" />
          <div className="mt-4 grid gap-2.5">
            {clients.length === 0 ? <Empty text="No hay clientes marcados para atención." icon="check" /> : clients.map((client) => <Link key={client.id} href={`/admin/clientes/${client.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3.5 hover:border-[#174f7a]/25 hover:bg-[#f8fafc]"><div className="min-w-0"><p className="truncate text-[13px] font-extrabold text-[#193247]">{client.razon_social}</p><p className="mt-1 text-[10px] font-medium text-slate-500">Última actividad: {client.ultima_actividad_at ? formatDate(client.ultima_actividad_at) : 'sin registro'}</p></div><StatusBadge status={client.estado_cliente} /></Link>)}
          </div>
        </section>
      </div>
    </div>
  )
}

function PanelHeader({ icon, title, description, href }: { icon: 'calendar' | 'tasks' | 'lead' | 'warning'; title: string; description: string; href: string }) {
  return <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf4f9] text-[#174f7a]"><AppIcon name={icon} className="h-4 w-4" /></span><div><h2 className="text-base font-extrabold text-[#10283d]">{title}</h2><p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p></div></div><Link href={href} className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-extrabold text-[#174f7a] hover:bg-[#edf4f9]">Ver todo</Link></div>
}

function Empty({ text, icon }: { text: string; icon: 'calendar' | 'tasks' | 'check' }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-7 text-center"><AppIcon name={icon} className="mx-auto h-5 w-5 text-slate-400" /><p className="mt-2.5 text-xs font-bold text-slate-500">{text}</p></div>
}
