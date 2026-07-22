import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { AdminTicketReplyForm } from '@/app/admin/components/BillingSupportForms'
import { cambiarEstadoTicketNotificado } from '@/app/notified-support-actions'

export const dynamic = 'force-dynamic'

type CompanyRelation = { razon_social: string } | Array<{ razon_social: string }> | null
const companyName = (value: CompanyRelation) => Array.isArray(value) ? value[0]?.razon_social ?? 'Sin empresa' : value?.razon_social ?? 'Sin empresa'

type Message = {
  id: string
  autor_tipo: string
  mensaje: string
  created_at: string
}

type Ticket = {
  id: string
  empresa_id: string
  asunto: string
  categoria: string
  prioridad: string
  estado: string
  asignado_a: string | null
  ultimo_mensaje_at: string
  created_at: string
  empresa: CompanyRelation
  mensajes: Message[]
}

const states = ['Todos', 'Abierto', 'En revisión', 'Esperando cliente', 'Resuelto', 'Cerrado']

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const params = await searchParams
  const state = states.includes(params.estado ?? '') ? params.estado ?? 'Todos' : 'Todos'
  const supabase = await createClient()

  let query = supabase
    .from('tickets')
    .select('id, empresa_id, asunto, categoria, prioridad, estado, asignado_a, ultimo_mensaje_at, created_at, empresa:empresas(razon_social), mensajes:ticket_mensajes(id, autor_tipo, mensaje, created_at)')
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(100)
  if (state !== 'Todos') query = query.eq('estado', state)

  const { data, error } = await query
  const tickets = ((data ?? []) as Ticket[]).map((ticket) => ({ ...ticket, mensajes: [...(ticket.mensajes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) }))

  return (
    <div className="mx-auto max-w-[1300px]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Atención de clientes</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Consultas</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Historial centralizado de dudas, respuestas y compromisos con cada empresa.</p></div><form method="get"><select name="estado" defaultValue={state} className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold" onChange={undefined}>{states.map((item) => <option key={item}>{item}</option>)}</select><button className="ml-2 h-11 rounded-xl bg-[#0f2438] px-4 text-sm font-black text-white">Filtrar</button></form></header>

      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar las consultas.</div>}

      <section className="mt-7 grid gap-5">
        {tickets.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><AppIcon name="message" className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-4 font-bold text-slate-500">No hay consultas en este estado.</p></div> : tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-[#0f2438]">{ticket.asunto}</h2><StatusBadge status={ticket.prioridad} /></div><p className="mt-1 text-sm text-slate-500"><Link href={`/admin/clientes/${ticket.empresa_id}`} className="font-bold text-[#134b78] hover:underline">{companyName(ticket.empresa)}</Link> · {ticket.categoria} · actualizado {formatDate(ticket.ultimo_mensaje_at)}</p></div><StatusBadge status={ticket.estado} />
            </div>

            <div className="mt-5 grid gap-3 border-l-2 border-slate-200 pl-4">
              {ticket.mensajes.map((message) => <div key={message.id} className={`rounded-2xl p-4 ${message.autor_tipo === 'SERCOPREV' ? 'bg-[#eaf3f9]' : 'bg-slate-50'}`}><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{message.autor_tipo}</p><p className="text-xs text-slate-400">{formatDate(message.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</p></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.mensaje}</p></div>)}
            </div>

            {ticket.estado !== 'Cerrado' && <AdminTicketReplyForm ticketId={ticket.id} companyId={ticket.empresa_id} />}
            <form action={cambiarEstadoTicketNotificado} className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row"><input type="hidden" name="ticket_id" value={ticket.id} /><input type="hidden" name="empresa_id" value={ticket.empresa_id} /><select name="estado" defaultValue={ticket.estado} className="h-10 flex-1 rounded-xl border border-slate-300 px-3 text-xs font-bold">{states.filter((item) => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}</select><button className="h-10 rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Actualizar estado</button></form>
          </article>
        ))}
      </section>
    </div>
  )
}
