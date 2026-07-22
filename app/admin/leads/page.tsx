import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { cambiarEstadoLead } from '@/app/admin/operational-actions'

export const dynamic = 'force-dynamic'

const states = ['Todos', 'Nuevo', 'Contactado', 'Evaluación', 'Propuesta enviada', 'Ganado', 'Descartado']

type Lead = {
  id: string
  nombre: string
  empresa: string | null
  rut: string | null
  email: string
  telefono: string
  servicio: string
  mensaje: string | null
  origen: string
  estado: string
  asignado_a: string | null
  created_at: string
  updated_at: string
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const params = await searchParams
  const search = (params.q ?? '').trim().slice(0, 100)
  const state = states.includes(params.estado ?? '') ? params.estado ?? 'Todos' : 'Todos'
  const supabase = await createClient()

  let query = supabase.from('leads').select('id, nombre, empresa, rut, email, telefono, servicio, mensaje, origen, estado, asignado_a, created_at, updated_at').order('created_at', { ascending: false })
  if (state !== 'Todos') query = query.eq('estado', state)
  if (search) {
    const safe = search.replace(/[%(),]/g, ' ')
    query = query.or(`nombre.ilike.%${safe}%,empresa.ilike.%${safe}%,email.ilike.%${safe}%,telefono.ilike.%${safe}%`)
  }

  const { data, error } = await query
  const leads = (data ?? []) as Lead[]

  return (
    <div className="mx-auto max-w-[1500px]">
      <header><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Pipeline comercial</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Prospectos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Solicitudes recibidas desde la landing y seguimiento del proceso de evaluación comercial.</p></header>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><form method="get" className="grid gap-4 lg:grid-cols-[1fr_240px_auto]"><label className="grid gap-2 text-sm font-bold text-slate-700">Buscar<div className="relative"><AppIcon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={search} placeholder="Nombre, empresa, correo o teléfono" className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10" /></div></label><label className="grid gap-2 text-sm font-bold text-slate-700">Estado<select name="estado" defaultValue={state} className="h-11 rounded-xl border border-slate-300 px-3 text-sm">{states.map((item) => <option key={item}>{item}</option>)}</select></label><button className="mt-auto h-11 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white">Filtrar</button></form></section>

      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar los prospectos.</div>}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {leads.length === 0 ? <div className="lg:col-span-2 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><AppIcon name="lead" className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-4 font-bold text-slate-500">No hay prospectos que coincidan con los filtros.</p></div> : leads.map((lead) => (
          <article key={lead.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-xl font-black text-[#0f2438]">{lead.empresa || lead.nombre}</h2><p className="mt-1 text-sm font-bold text-slate-500">{lead.nombre}{lead.empresa ? ` · ${lead.rut || 'RUT no informado'}` : ''}</p></div><StatusBadge status={lead.estado} /></div>
            <div className="mt-5 grid gap-3 rounded-2xl bg-[#f8fafb] p-4 text-sm">
              <p><span className="block text-xs font-black uppercase tracking-wide text-slate-400">Servicio solicitado</span><span className="mt-1 block font-bold text-[#17324a]">{lead.servicio}</span></p>
              {lead.mensaje && <p><span className="block text-xs font-black uppercase tracking-wide text-slate-400">Mensaje</span><span className="mt-1 block leading-6 text-slate-600">{lead.mensaje}</span></p>}
              <p className="text-xs text-slate-500">Recibido {formatDate(lead.created_at)} · {lead.origen}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2"><a href={`mailto:${lead.email}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-[#134b78] hover:bg-[#eaf3f9]"><AppIcon name="inbox" className="h-4 w-4" />Correo</a><a href={`tel:${lead.telefono.replace(/[^+\d]/g, '')}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-[#134b78] hover:bg-[#eaf3f9]"><AppIcon name="message" className="h-4 w-4" />Llamar</a><a href={`https://wa.me/${lead.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-[#134b78] hover:bg-[#eaf3f9]"><AppIcon name="message" className="h-4 w-4" />WhatsApp</a></div>
            <form action={cambiarEstadoLead} className="mt-4 flex gap-2 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={lead.id} /><select name="estado" defaultValue={lead.estado} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-xs font-bold">{states.filter((item) => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}</select><button className="rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Actualizar</button></form>
          </article>
        ))}
      </section>
    </div>
  )
}
