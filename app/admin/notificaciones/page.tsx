import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type CompanyRelation = { razon_social: string; nombre_fantasia: string | null } | Array<{ razon_social: string; nombre_fantasia: string | null }> | null

type NotificationRow = {
  id: string
  canal: string
  evento: string
  destinatario: string | null
  asunto: string | null
  estado: string
  proveedor_id: string | null
  error_mensaje: string | null
  enviada_at: string | null
  created_at: string
  empresa: CompanyRelation
}

function companyName(value: CompanyRelation) {
  const company = Array.isArray(value) ? value[0] : value
  return company?.nombre_fantasia || company?.razon_social || 'General SERCOPREV'
}

function eventLabel(value: string) {
  const labels: Record<string, string> = {
    nuevo_prospecto: 'Nuevo prospecto',
    solicitud_documento_creada: 'Solicitud documental',
    obligacion_requiere_accion: 'Obligación con acción requerida',
    documento_publicado: 'Documento publicado',
    cliente_cargo_antecedente: 'Antecedente recibido',
    cliente_creado: 'Bienvenida de cliente',
    ticket_cliente_creado: 'Nueva consulta del cliente',
    ticket_admin_respuesta: 'Respuesta de SERCOPREV',
    honorario_creado: 'Nuevo honorario',
    honorario_estado: 'Cambio de honorario',
  }
  return labels[value] || value.replaceAll('_', ' ')
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, canal, evento, destinatario, asunto, estado, proveedor_id, error_mensaje, enviada_at, created_at, empresa:empresas(razon_social, nombre_fantasia)')
    .order('created_at', { ascending: false })
    .limit(250)

  const notifications = (data ?? []) as NotificationRow[]
  const sent = notifications.filter((item) => item.estado === 'Enviada').length
  const failed = notifications.filter((item) => item.estado === 'Fallida').length
  const omitted = notifications.filter((item) => item.estado === 'Omitida').length

  return (
    <div className="mx-auto max-w-[1450px]">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Comunicaciones automáticas</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Notificaciones</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Historial de correos y mensajes de WhatsApp procesados por la plataforma. Los envíos omitidos indican configuración o datos de contacto pendientes.</p>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric icon="check" label="Enviadas" value={sent} />
        <Metric icon="warning" label="Fallidas" value={failed} />
        <Metric icon="inbox" label="Omitidas" value={omitted} />
      </section>

      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar el historial de notificaciones.</div>}

      <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.11em] text-slate-500">
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Empresa</th>
                <th className="px-5 py-4">Evento</th>
                <th className="px-5 py-4">Canal</th>
                <th className="px-5 py-4">Destinatario</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {notifications.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-14 text-center font-bold text-slate-500">Todavía no hay notificaciones registradas.</td></tr>
              ) : notifications.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{formatDate(item.enviada_at || item.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-5 py-4 font-black text-[#17324a]">{companyName(item.empresa)}</td>
                  <td className="px-5 py-4"><p className="font-bold text-slate-700">{eventLabel(item.evento)}</p>{item.asunto && <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{item.asunto}</p>}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#eaf3f9] px-2.5 py-1 text-xs font-black text-[#134b78]">{item.canal}</span></td>
                  <td className="max-w-[240px] break-all px-5 py-4 text-slate-600">{item.destinatario || 'Sin destinatario'}</td>
                  <td className="px-5 py-4"><StatusBadge status={item.estado} /></td>
                  <td className="max-w-sm px-5 py-4 text-xs leading-5 text-slate-500">{item.error_mensaje || (item.proveedor_id ? `Proveedor: ${item.proveedor_id}` : 'Procesada sin identificador externo')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: 'check' | 'warning' | 'inbox'; label: string; value: number }) {
  return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p></div></article>
}
