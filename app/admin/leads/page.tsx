import { AppIcon } from '@/components/AppIcon'
import { ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
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
  const newLeads = leads.filter((lead) => lead.estado === 'Nuevo').length
  const activeLeads = leads.filter((lead) => ['Contactado', 'Evaluación'].includes(lead.estado)).length
  const proposals = leads.filter((lead) => lead.estado === 'Propuesta enviada').length
  const won = leads.filter((lead) => lead.estado === 'Ganado').length

  return (
    <div className="mx-auto max-w-[1500px]">
      <ModulePageHeader
        eyebrow="Cartera y comercial · Solicitudes del sitio"
        title="Prospectos"
        description="Bandeja central de solicitudes recibidas desde el formulario del landing, con seguimiento comercial, contacto directo y control de avance."
        help="Cada envío del formulario público ingresa aquí como un prospecto nuevo. Desde esta pantalla puede contactarlo, clasificarlo y avanzar su estado comercial."
      />

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de prospectos">
        <MetricCard label="Nuevos" value={newLeads} detail="Sin primera gestión" icon="lead" tone="gold" />
        <MetricCard label="En gestión" value={activeLeads} detail="Contactados o evaluando" icon="message" tone="blue" />
        <MetricCard label="Propuestas" value={proposals} detail="Oferta comercial enviada" icon="document" tone="navy" />
        <MetricCard label="Ganados" value={won} detail="Convertidos comercialmente" icon="check" tone="green" />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form method="get" className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <label className="grid gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
            Buscar prospecto
            <div className="relative">
              <AppIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input name="q" defaultValue={search} placeholder="Nombre, empresa, correo o teléfono" className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-[13px] font-semibold" />
            </div>
          </label>
          <label className="grid gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
            Estado comercial
            <select name="estado" defaultValue={state} className="h-11 rounded-xl border border-slate-300 px-3 text-[13px] font-semibold normal-case tracking-normal">{states.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#10283d] px-5 text-xs font-extrabold text-white shadow-sm hover:bg-[#173d59]"><AppIcon name="search" className="h-3.5 w-3.5" />Aplicar filtros</button>
        </form>
      </section>

      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar los prospectos.</div>}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 className="text-lg font-extrabold text-[#10283d]">Solicitudes recibidas</h2><p className="mt-1 text-xs font-medium text-slate-500">{leads.length} resultado{leads.length === 1 ? '' : 's'} con los filtros actuales.</p></div>
          <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500" />Formulario público conectado</span>
        </div>

        {leads.length === 0 ? (
          <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><AppIcon name="lead" className="h-5 w-5" /></span><p className="mt-4 text-sm font-bold text-slate-500">No hay prospectos que coincidan con los filtros.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-[13px]">
              <thead><tr><th className="px-5 py-3.5">Prospecto</th><th className="px-5 py-3.5">Servicio</th><th className="px-5 py-3.5">Origen e ingreso</th><th className="px-5 py-3.5">Contacto</th><th className="px-5 py-3.5">Estado</th><th className="px-5 py-3.5">Gestión</th></tr></thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-slate-100 align-top">
                    <td className="max-w-[280px] px-5 py-4"><p className="font-extrabold text-[#193247]">{lead.empresa || lead.nombre}</p><p className="mt-1 text-xs font-medium text-slate-500">{lead.nombre}{lead.empresa ? ` · ${lead.rut || 'RUT no informado'}` : ''}</p>{lead.mensaje && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{lead.mensaje}</p>}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{lead.servicio}</td>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-700">{lead.origen}</p><p className="mt-1 text-xs text-slate-500">{formatDate(lead.created_at)}</p></td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5"><a href={`mailto:${lead.email}`} title={lead.email} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-extrabold text-[#174f7a] hover:bg-[#edf4f9]"><AppIcon name="inbox" className="h-3.5 w-3.5" />Correo</a><a href={`tel:${lead.telefono.replace(/[^+\d]/g, '')}`} title={lead.telefono} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-extrabold text-[#174f7a] hover:bg-[#edf4f9]"><AppIcon name="message" className="h-3.5 w-3.5" />Llamar</a><a href={`https://wa.me/${lead.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-extrabold text-[#174f7a] hover:bg-[#edf4f9]"><AppIcon name="message" className="h-3.5 w-3.5" />WhatsApp</a></div><p className="mt-2 text-[11px] text-slate-500">{lead.email}</p></td>
                    <td className="px-5 py-4"><StatusBadge status={lead.estado} /></td>
                    <td className="px-5 py-4"><form action={cambiarEstadoLead} className="flex min-w-[250px] gap-2"><input type="hidden" name="id" value={lead.id} /><select name="estado" defaultValue={lead.estado} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 text-[11px] font-bold">{states.filter((item) => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}</select><button className="h-9 rounded-lg bg-[#10283d] px-3 text-[10px] font-extrabold text-white hover:bg-[#173d59]">Guardar</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
