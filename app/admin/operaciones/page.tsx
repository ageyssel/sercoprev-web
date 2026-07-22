import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, dueDateLabel } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { cambiarEstadoObligacion, cambiarEstadoSolicitud, cambiarEstadoTarea } from '@/app/admin/operational-actions'

export const dynamic = 'force-dynamic'

type CompanyRelation = { razon_social: string } | Array<{ razon_social: string }> | null
const nameOf = (value: CompanyRelation) => Array.isArray(value) ? value[0]?.razon_social ?? 'Sin empresa' : value?.razon_social ?? 'Sin empresa'

export default async function OperationsPage() {
  const supabase = await createClient()
  const [obligationsResult, tasksResult, requestsResult] = await Promise.all([
    supabase.from('obligaciones').select('id, empresa_id, titulo, tipo, periodo, fecha_vencimiento, estado, prioridad, requiere_accion_cliente, empresa:empresas(razon_social)').not('estado', 'in', '(Presentada,Pagada,No aplica)').order('fecha_vencimiento').limit(100),
    supabase.from('tareas').select('id, empresa_id, titulo, responsable, fecha_vencimiento, estado, prioridad, empresa:empresas(razon_social)').neq('estado', 'Completada').order('fecha_vencimiento', { ascending: true, nullsFirst: false }).limit(100),
    supabase.from('solicitudes_documentos').select('id, empresa_id, titulo, categoria, periodo, fecha_limite, estado, empresa:empresas(razon_social)').not('estado', 'in', '(Aprobado,Vencido)').order('fecha_limite', { ascending: true, nullsFirst: false }).limit(100),
  ])

  const obligations = (obligationsResult.data ?? []) as Array<{ id: string; empresa_id: string; titulo: string; tipo: string; periodo: string | null; fecha_vencimiento: string; estado: string; prioridad: string; requiere_accion_cliente: boolean; empresa: CompanyRelation }>
  const tasks = (tasksResult.data ?? []) as Array<{ id: string; empresa_id: string; titulo: string; responsable: string | null; fecha_vencimiento: string | null; estado: string; prioridad: string; empresa: CompanyRelation }>
  const requests = (requestsResult.data ?? []) as Array<{ id: string; empresa_id: string; titulo: string; categoria: string; periodo: string | null; fecha_limite: string | null; estado: string; empresa: CompanyRelation }>
  const error = obligationsResult.error || tasksResult.error || requestsResult.error

  return (
    <div className="mx-auto max-w-[1500px]">
      <header><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Control transversal</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Obligaciones y tareas</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Prioridades de toda la cartera ordenadas por vencimiento y estado.</p></header>
      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar todas las operaciones.</div>}

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <Panel title="Obligaciones abiertas" icon="calendar" count={obligations.length}>
          {obligations.length === 0 ? <Empty text="No hay obligaciones abiertas." /> : obligations.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><Link href={`/admin/clientes/${item.empresa_id}`} className="font-black text-[#17324a] hover:text-[#134b78]">{item.titulo}</Link><p className="mt-1 text-xs text-slate-500">{nameOf(item.empresa)} · {item.tipo}{item.periodo ? ` · ${item.periodo}` : ''}</p><div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={item.estado} /><StatusBadge status={item.prioridad} />{item.requiere_accion_cliente && <StatusBadge status="Esperando cliente" />}</div></div><div className="shrink-0 sm:text-right"><p className="text-sm font-black">{formatDate(item.fecha_vencimiento)}</p><p className="mt-1 text-xs text-slate-500">{dueDateLabel(item.fecha_vencimiento)}</p></div></div><form action={cambiarEstadoObligacion} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="empresa_id" value={item.empresa_id} /><select name="estado" defaultValue={item.estado} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-xs font-bold">{['Pendiente', 'En proceso', 'Esperando cliente', 'Presentada', 'Pagada', 'No aplica', 'Vencida'].map((status) => <option key={status}>{status}</option>)}</select><button className="rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Guardar</button></form></article>)}
        </Panel>

        <Panel title="Tareas internas" icon="tasks" count={tasks.length}>
          {tasks.length === 0 ? <Empty text="No hay tareas abiertas." /> : tasks.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/admin/clientes/${item.empresa_id}`} className="font-black text-[#17324a] hover:text-[#134b78]">{item.titulo}</Link><p className="mt-1 text-xs text-slate-500">{nameOf(item.empresa)} · {item.responsable || 'Sin responsable'}</p></div><StatusBadge status={item.prioridad} /></div><p className="mt-3 text-xs font-bold text-slate-500">{item.fecha_vencimiento ? `${formatDate(item.fecha_vencimiento)} · ${dueDateLabel(item.fecha_vencimiento)}` : 'Sin vencimiento'}</p><form action={cambiarEstadoTarea} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="empresa_id" value={item.empresa_id} /><select name="estado" defaultValue={item.estado} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-xs font-bold">{['Pendiente', 'En curso', 'Bloqueada', 'Completada'].map((status) => <option key={status}>{status}</option>)}</select><button className="rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Guardar</button></form></article>)}
        </Panel>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name="upload" className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">Solicitudes documentales activas</h2><p className="mt-1 text-sm text-slate-500">Antecedentes pendientes de recepción, revisión o aprobación.</p></div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{requests.length}</span></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{requests.length === 0 ? <div className="lg:col-span-2"><Empty text="No hay solicitudes activas." /></div> : requests.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/admin/clientes/${item.empresa_id}`} className="font-black text-[#17324a] hover:text-[#134b78]">{item.titulo}</Link><p className="mt-1 text-xs text-slate-500">{nameOf(item.empresa)} · {item.categoria}{item.periodo ? ` · ${item.periodo}` : ''}</p></div><StatusBadge status={item.estado} /></div><p className="mt-3 text-xs font-bold text-slate-500">{item.fecha_limite ? `Límite ${formatDate(item.fecha_limite)}` : 'Sin fecha límite'}</p><form action={cambiarEstadoSolicitud} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="empresa_id" value={item.empresa_id} /><select name="estado" defaultValue={item.estado} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-xs font-bold">{['Solicitado', 'Recibido', 'En revisión', 'Observado', 'Aprobado', 'Vencido'].map((status) => <option key={status}>{status}</option>)}</select><button className="rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Guardar</button></form></article>)}</div></section>
    </div>
  )
}

function Panel({ title, icon, count, children }: { title: string; icon: 'calendar' | 'tasks'; count: number; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><h2 className="text-xl font-black text-[#0f2438]">{title}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{count}</span></div><div className="mt-5 grid gap-3">{children}</div></section>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-bold text-slate-500">{text}</div>
}
