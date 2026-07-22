import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
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
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Gestión de cartera</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Clientes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Directorio, estado de atención, responsables, servicios y acceso a la ficha operativa de cada empresa.</p>
      </header>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <form className="grid gap-4 lg:grid-cols-[1fr_240px_auto]" method="get">
          <label className="grid gap-2 text-sm font-bold text-slate-700">Buscar cliente<div className="relative"><AppIcon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={search} placeholder="Razón social, nombre o RUT" className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10" /></div></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Estado<select name="estado" defaultValue={state} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10">{allowedStates.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button type="submit" className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white hover:bg-[#173d5c]"><AppIcon name="search" className="h-4 w-4" />Filtrar</button>
        </form>
      </section>

      {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar el directorio. Confirme que la migración operativa esté aplicada.</div>}

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 className="text-xl font-black text-[#0f2438]">Directorio de empresas</h2><p className="mt-1 text-sm text-slate-500">{clients.length} resultado{clients.length === 1 ? '' : 's'}</p></div>
          <a href="#nuevo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#eaf3f9] px-4 py-2.5 text-sm font-black text-[#134b78] hover:bg-[#dcebf4]"><AppIcon name="plus" className="h-4 w-4" />Registrar cliente</a>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead><tr className="bg-[#f8fafb] text-xs font-black uppercase tracking-[0.12em] text-slate-400"><th className="px-5 py-4">Empresa</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Responsable</th><th className="px-5 py-4">Servicio</th><th className="px-5 py-4 text-right">Honorario</th><th className="px-5 py-4">Actividad</th><th className="px-5 py-4"></th></tr></thead>
            <tbody>
              {clients.length === 0 ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">No hay clientes que coincidan con los filtros.</td></tr> : clients.map((client) => (
                <tr key={client.id} className="border-t border-slate-100 transition hover:bg-[#fbfcfd]">
                  <td className="px-5 py-4"><p className="font-black text-[#17324a]">{client.nombre_fantasia || client.razon_social}</p><p className="mt-1 text-xs text-slate-500">{client.razon_social} · {client.rut}</p></td>
                  <td className="px-5 py-4"><div className="flex flex-col items-start gap-1.5"><StatusBadge status={client.estado_cliente} /><span className="text-xs text-slate-500">IVA: {client.estado_impuestos}</span></div></td>
                  <td className="px-5 py-4 text-slate-600">{client.contador_asignado || 'Sin asignar'}</td>
                  <td className="px-5 py-4 text-slate-600">{client.plan_servicio || 'Sin detalle'}</td>
                  <td className="px-5 py-4 text-right font-black text-[#134b78]">{formatCurrency(client.honorario_mensual)}</td>
                  <td className="px-5 py-4 text-slate-500">{client.ultima_actividad_at ? formatDate(client.ultima_actividad_at) : `Alta ${formatDate(client.created_at)}`}</td>
                  <td className="px-5 py-4 text-right"><Link href={`/admin/clientes/${client.id}`} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black text-[#134b78] hover:bg-[#eaf3f9]">Abrir ficha<AppIcon name="arrow-right" className="h-3.5 w-3.5" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="nuevo" className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name="plus" className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">Registrar nuevo cliente</h2><p className="mt-1 text-sm leading-6 text-slate-500">Crea el acceso inicial. Luego complete la ficha operativa desde el directorio.</p></div></div>
        <div className="max-w-2xl"><CreateClientForm /></div>
      </section>
    </div>
  )
}
