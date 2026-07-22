import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'
import { BrandLogo } from '@/components/BrandLogo'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/dashboard/actions'
import { ClientTicketReplyForm, NewClientTicketForm } from '@/app/dashboard/components/ClientSupportForms'

export const dynamic = 'force-dynamic'

type Message = { id: string; autor_tipo: string; mensaje: string; created_at: string }
type Ticket = { id: string; asunto: string; categoria: string; prioridad: string; estado: string; ultimo_mensaje_at: string; mensajes: Message[] }

export default async function ClientConsultationsPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  const { data: company, error: companyError } = await supabase.from('empresas').select('id, razon_social, es_admin, must_change_password').eq('user_id', user.id).single()
  if (companyError || !company) redirect('/login?message=Cuenta sin empresa asociada')
  if (company.es_admin) redirect('/admin')
  if (company.must_change_password) redirect('/cuenta/cambiar-clave')

  const { data, error } = await supabase
    .from('tickets')
    .select('id, asunto, categoria, prioridad, estado, ultimo_mensaje_at, mensajes:ticket_mensajes(id, autor_tipo, mensaje, created_at)')
    .eq('empresa_id', company.id)
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(50)

  const tickets = ((data ?? []) as Ticket[]).map((ticket) => ({ ...ticket, mensajes: [...(ticket.mensajes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) }))

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#17324a]">
      <ClientHeader email={user.email ?? ''} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />Volver al resumen</Link>
        <header className="mt-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Comunicación con SERCOPREV</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Consultas</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Realice consultas y conserve las respuestas vinculadas a su empresa.</p></header>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar el historial de consultas.</div>}

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name="plus" className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">Nueva consulta</h2><p className="mt-1 text-sm text-slate-500">Para urgencias tributarias o laborales, indique prioridad y contexto completo.</p></div></div>
          <div className="mt-5 max-w-3xl"><NewClientTicketForm /></div>
        </section>

        <section className="mt-7 grid gap-5">
          {tickets.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><AppIcon name="message" className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-4 font-bold text-slate-500">Aún no hay consultas registradas.</p></div> : tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-[#0f2438]">{ticket.asunto}</h2><StatusBadge status={ticket.prioridad} /></div><p className="mt-1 text-sm text-slate-500">{ticket.categoria} · actualizado {formatDate(ticket.ultimo_mensaje_at, { dateStyle: 'medium', timeStyle: 'short' })}</p></div><StatusBadge status={ticket.estado} /></div>
              <div className="mt-5 grid gap-3 border-l-2 border-slate-200 pl-4">{ticket.mensajes.map((message) => <div key={message.id} className={`rounded-2xl p-4 ${message.autor_tipo === 'SERCOPREV' ? 'bg-[#eaf3f9]' : 'bg-slate-50'}`}><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{message.autor_tipo}</p><p className="text-xs text-slate-400">{formatDate(message.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</p></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.mensaje}</p></div>)}</div>
              {ticket.estado !== 'Cerrado' && <ClientTicketReplyForm ticketId={ticket.id} />}
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

function ClientHeader({ email }: { email: string }) {
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-4"><BrandLogo href="/dashboard" compact /><span className="hidden h-7 w-px bg-slate-200 sm:block" /><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a47b24]">Portal clientes</p></div><div className="flex items-center justify-between gap-3"><span className="max-w-[230px] truncate text-sm font-bold text-slate-600">{email}</span><form action={signOut}><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-red-50 hover:text-red-700">Cerrar sesión</button></form></div></div></header>
}
