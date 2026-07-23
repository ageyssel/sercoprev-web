import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate, dueDateLabel } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { AdminTicketReplyForm, CompanyContactForm, FeeForm } from '@/app/admin/components/BillingSupportForms'
import { cambiarEstadoHonorarioNotificado, cambiarEstadoTicketNotificado } from '@/app/notified-support-actions'

export const dynamic = 'force-dynamic'

type Fee = { id: string; periodo: string; concepto: string; monto: number; fecha_vencimiento: string; estado: string; fecha_pago: string | null; notas: string | null }
type Contact = { id: string; nombre: string; cargo: string | null; email: string | null; telefono: string | null; principal: boolean; recibe_notificaciones: boolean }
type Message = { id: string; autor_tipo: string; mensaje: string; created_at: string }
type Ticket = { id: string; asunto: string; categoria: string; prioridad: string; estado: string; ultimo_mensaje_at: string; mensajes: Message[] }

export default async function ClientManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [companyResult, feesResult, contactsResult, ticketsResult] = await Promise.all([
    supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut, honorario_mensual').eq('id', id).eq('es_admin', false).single(),
    supabase.from('honorarios').select('id, periodo, concepto, monto, fecha_vencimiento, estado, fecha_pago, notas').eq('empresa_id', id).order('fecha_vencimiento', { ascending: false }).limit(100),
    supabase.from('contactos_empresa').select('id, nombre, cargo, email, telefono, principal, recibe_notificaciones').eq('empresa_id', id).order('principal', { ascending: false }).order('nombre'),
    supabase.from('tickets').select('id, asunto, categoria, prioridad, estado, ultimo_mensaje_at, mensajes:ticket_mensajes(id, autor_tipo, mensaje, created_at)').eq('empresa_id', id).order('ultimo_mensaje_at', { ascending: false }).limit(50),
  ])

  if (companyResult.error || !companyResult.data) notFound()
  const company = companyResult.data
  const fees = (feesResult.data ?? []) as Fee[]
  const contacts = (contactsResult.data ?? []) as Contact[]
  const tickets = ((ticketsResult.data ?? []) as Ticket[]).map((ticket) => ({ ...ticket, mensajes: [...(ticket.mensajes ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) }))
  const hasErrors = feesResult.error || contactsResult.error || ticketsResult.error

  return (
    <div className="mx-auto max-w-[1300px]">
      <Link href={`/admin/clientes/${id}`} className="inline-flex items-center gap-2 text-sm font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4 rotate-180" />Volver a la ficha 360°</Link>
      <header className="mt-5 rounded-3xl bg-[#0f2438] p-6 text-white sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e3bf63]">Gestión complementaria</p><h1 className="mt-3 text-3xl font-black tracking-tight">{company.nombre_fantasia || company.razon_social}</h1><p className="mt-2 text-sm text-slate-300">Honorarios, contactos y consultas · RUT {company.rut}</p></header>

      {hasErrors && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Parte de la información no pudo cargarse.</div>}

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle icon="money" title="Honorarios" description="Registro y estado de cobros visibles para el cliente." />
          <details className="group mt-5 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden">Registrar honorario<AppIcon name="chevron-down" className="h-5 w-5 transition group-open:rotate-180" /></summary><div className="mt-5 border-t border-[#134b78]/15 pt-5"><FeeForm companyId={id} defaultAmount={company.honorario_mensual} /></div></details>
          <div className="mt-5 grid gap-3">{fees.length === 0 ? <Empty text="No hay honorarios registrados." /> : fees.map((fee) => <article key={fee.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#17324a]">{fee.periodo} · {fee.concepto}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(fee.fecha_vencimiento)} · {fee.estado === 'Pagado' && fee.fecha_pago ? `pagado ${formatDate(fee.fecha_pago)}` : dueDateLabel(fee.fecha_vencimiento)}</p></div><StatusBadge status={fee.estado} /></div><p className="mt-3 text-xl font-black text-[#134b78]">{formatCurrency(fee.monto)}</p>{fee.notas && <p className="mt-2 text-sm leading-6 text-slate-600">{fee.notas}</p>}<form action={cambiarEstadoHonorarioNotificado} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={fee.id} /><input type="hidden" name="empresa_id" value={id} /><select name="estado" defaultValue={fee.estado} className="h-10 flex-1 rounded-xl border border-slate-300 px-3 text-xs font-bold"><option>Pendiente</option><option>Pagado</option><option>Vencido</option><option>Anulado</option></select><button className="rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Guardar</button></form></article>)}</div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle icon="users" title="Contactos de la empresa" description="Personas autorizadas para coordinación y notificaciones." />
          <details className="group mt-5 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-black text-[#134b78] [&::-webkit-details-marker]:hidden">Agregar contacto<AppIcon name="chevron-down" className="h-5 w-5 transition group-open:rotate-180" /></summary><div className="mt-5 border-t border-[#134b78]/15 pt-5"><CompanyContactForm companyId={id} /></div></details>
          <div className="mt-5 grid gap-3">{contacts.length === 0 ? <Empty text="No hay contactos adicionales." /> : contacts.map((contact) => <article key={contact.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#17324a]">{contact.nombre}</h3><p className="mt-1 text-xs text-slate-500">{contact.cargo || 'Sin cargo informado'}</p></div>{contact.principal && <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Principal</span>}</div><div className="mt-3 grid gap-1 text-sm text-slate-600">{contact.email && <a href={`mailto:${contact.email}`} className="font-bold text-[#134b78] hover:underline">{contact.email}</a>}{contact.telefono && <a href={`tel:${contact.telefono.replace(/[^+\d]/g, '')}`} className="font-bold text-[#134b78] hover:underline">{contact.telefono}</a>}<p className="text-xs text-slate-500">Notificaciones: {contact.recibe_notificaciones ? 'sí' : 'no'}</p></div></article>)}</div>
        </section>
      </div>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle icon="message" title="Consultas e historial" description="Conversaciones registradas entre el cliente y SERCOPREV." />
        <div className="mt-5 grid gap-5">{tickets.length === 0 ? <Empty text="No hay consultas registradas." /> : tickets.map((ticket) => <article key={ticket.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#17324a]">{ticket.asunto}</h3><StatusBadge status={ticket.prioridad} /></div><p className="mt-1 text-xs text-slate-500">{ticket.categoria} · {formatDate(ticket.ultimo_mensaje_at, { dateStyle: 'medium', timeStyle: 'short' })}</p></div><StatusBadge status={ticket.estado} /></div><div className="mt-4 grid gap-3 border-l-2 border-slate-200 pl-4">{ticket.mensajes.map((message) => <div key={message.id} className={`rounded-xl p-3 ${message.autor_tipo === 'SERCOPREV' ? 'bg-[#eaf3f9]' : 'bg-slate-50'}`}><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{message.autor_tipo}</p><p className="text-[11px] text-slate-400">{formatDate(message.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</p></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.mensaje}</p></div>)}</div>{ticket.estado !== 'Cerrado' && <AdminTicketReplyForm ticketId={ticket.id} companyId={id} />}<form action={cambiarEstadoTicketNotificado} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="ticket_id" value={ticket.id} /><input type="hidden" name="empresa_id" value={id} /><select name="estado" defaultValue={ticket.estado} className="h-10 flex-1 rounded-xl border border-slate-300 px-3 text-xs font-bold"><option>Abierto</option><option>En revisión</option><option>Esperando cliente</option><option>Resuelto</option><option>Cerrado</option></select><button className="rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Guardar</button></form></article>)}</div>
      </section>
    </div>
  )
}

function SectionTitle({ icon, title, description }: { icon: 'money' | 'users' | 'message'; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div></div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center text-sm font-bold text-slate-500">{text}</div>
}
