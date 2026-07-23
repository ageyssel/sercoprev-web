import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { CreateClientForm } from '@/app/admin/components/CreateClientForm'

export const dynamic = 'force-dynamic'

type ClientRow = {
  id: string
  razon_social: string
  nombre_fantasia: string | null
  rut: string
  estado_cliente: string
  estado_impuestos: string
  contador_asignado: string | null
  plan_servicio: string | null
  honorario_mensual: number | null
  ultima_actividad_at: string | null
  created_at: string
}

const allowedStates = ['Todos', 'En incorporación', 'Activo', 'Requiere atención', 'Suspendido', 'Archivado']

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const params = await searchParams
  const search = (params.q ?? '').trim().slice(0, 100)
  const state = allowedStates.includes(params.estado ?? '') ? params.estado ?? 'Todos' : 'Todos'
  const supabase = await createClient()

  let query = supabase
    .from('empresas')
    .select('id, razon_social, nombre_fantasia, rut, estado_cliente, estado_impuestos, contador_asignado, plan_servicio, honorario_mensual, ultima_actividad_at, created_at')
    .eq('es_admin', false)
    .order('razon_social')

  if (search) {
    const safe = search.replace(/[%(),]/g, ' ')
    query = query.or(`razon_social.ilike.%${safe}%,nombre_fantasia.ilike.%${safe}%,rut.ilike.%${safe}%`)
  }
  if (state !== 'Todos') query = query.eq('estado_cliente', state)

  const { data, error } = await query
  const clients = (data ?? []) as ClientRow[]

  return (
    <div className="mx-auto max-w-[1500px]">
      <ModulePageHeader
        eyebrow="Cartera y comercial"
        title="Clientes"
        description="Directorio de empresas, estado de atención, responsables, servicios, honorarios y acceso a la ficha operativa 360°."
        actions={<a href="#nuevo" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#10283d] px-4 text-xs font-extrabold text-white shadow-sm hover:bg-[#173d59]"><AppIcon name="plus" className="h-3.5 w-3.5" />Registrar cliente</a>}
      />

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end" method="get">
          <label className="grid gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Buscar cliente<div className="relative"><AppIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={search} placeholder="Razón social, nombre o RUT" className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-[13px] font-semibold normal-case tracking-normal" /></div></label>
          <label className="grid gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Estado<select name="estado" defaultValue={state} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold normal-case tracking-normal">{allowedStates.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#10283d] px-5 text-xs font-extrabold text-white hover:bg-[#173d59]"><AppIcon name="search" className="h-3.5 w-3.5" />Aplicar filtros</button>
        </form>
      </section>

      {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar el directorio. Confirme que la migración operativa esté aplicada.</div>}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 className="text-lg font-extrabold text-[#10283d]">Directorio de empresas</h2><p className="mt-1 text-xs font-medium text-slate-500">{clients.length} resultado{clients.length === 1 ? '' : 's'} con los filtros actuales.</p></div>
          <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400"><AppIcon name="shield" className="h-3.5 w-3.5" />Acceso multiempresa protegido</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-[13px]">
            <thead><tr><th className="px-5 py-3.5">Empresa</th><th className="px-5 py-3.5">Estado</th><th className="px-5 py-3.5">Responsable</th><th className="px-5 py-3.5">Servicio</th><th className="px-5 py-3.5 text-right">Honorario</th><th className="px-5 py-3.5">Actividad</th><th className="px-5 py-3.5"></th></tr></thead>
            <tbody>
              {clients.length === 0 ? <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-500">No hay clientes que coincidan con los filtros.</td></tr> : clients.map((client) => (
                <tr key={client.id} className="border-t border-slate-100">
                  <td className="px-5 py-4"><p className="font-extrabold text-[#193247]">{client.nombre_fantasia || client.razon_social}</p><p className="mt-1 text-[11px] font-medium text-slate-500">{client.razon_social} · {client.rut}</p></td>
                  <td className="px-5 py-4"><div className="flex flex-col items-start gap-1.5"><StatusBadge status={client.estado_cliente} /><span className="text-[10px] font-medium text-slate-500">IVA: {client.estado_impuestos}</span></div></td>
                  <td className="px-5 py-4 font-medium text-slate-600">{client.contador_asignado || 'Sin asignar'}</td>
                  <td className="px-5 py-4 font-medium text-slate-600">{client.plan_servicio || 'Sin detalle'}</td>
                  <td className="px-5 py-4 text-right font-extrabold text-[#174f7a]">{formatCurrency(client.honorario_mensual)}</td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-500">{client.ultima_actividad_at ? formatDate(client.ultima_actividad_at) : `Alta ${formatDate(client.created_at)}`}</td>
                  <td className="px-5 py-4 text-right"><Link href={`/admin/clientes/${client.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-extrabold text-[#174f7a] hover:bg-[#edf4f9]">Abrir ficha<AppIcon name="arrow-right" className="h-3.5 w-3.5" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="nuevo" className="mt-7 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4f9] text-[#174f7a]"><AppIcon name="plus" className="h-4 w-4" /></span><div><h2 className="text-lg font-extrabold text-[#10283d]">Registrar nuevo cliente</h2><p className="mt-1 text-xs font-medium leading-5 text-slate-500">Cree el acceso inicial y complete luego su ficha operativa desde el directorio.</p></div></div>
        <div className="max-w-3xl"><CreateClientForm /></div>
      </section>
    </div>
  )
}
