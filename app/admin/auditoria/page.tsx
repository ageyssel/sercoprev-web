import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createAdminClient } from '@/utils/supabase/admin'
import { requirePrivilegedAdminPage } from '@/utils/supabase/require-privileged-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AuditCompany = {
  razon_social: string
  nombre_fantasia: string | null
}

type AuditRow = {
  id: number
  transaction_code: string
  actor_user_id: string | null
  actor_name: string | null
  actor_email: string | null
  actor_role: string | null
  target_user_id: string | null
  target_user_name: string | null
  target_user_email: string | null
  empresa_id: string | null
  accion: string
  entidad: string
  entidad_id: string | null
  module: string
  description: string | null
  result: 'exitoso' | 'fallido' | 'denegado'
  source: string
  request_id: string | null
  ip_hash: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  created_at: string
  empresa: AuditCompany | AuditCompany[] | null
}

type SearchParams = {
  q?: string
  modulo?: string
  resultado?: string
  desde?: string
  hasta?: string
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] : value
}

function safeText(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function displayAction(value: string) {
  return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function jsonText(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return null
  return JSON.stringify(value, null, 2)
}

export default async function AuditPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requirePrivilegedAdminPage()
  const params = (await searchParams) ?? {}
  const q = safeText(params.q).slice(0, 120)
  const modulo = (params.modulo ?? '').trim().slice(0, 80)
  const resultado = (params.resultado ?? '').trim().slice(0, 20)
  const desde = (params.desde ?? '').trim().slice(0, 10)
  const hasta = (params.hasta ?? '').trim().slice(0, 10)

  const admin = createAdminClient()
  let query = admin
    .from('auditoria_eventos')
    .select('id, transaction_code, actor_user_id, actor_name, actor_email, actor_role, target_user_id, target_user_name, target_user_email, empresa_id, accion, entidad, entidad_id, module, description, result, source, request_id, ip_hash, user_agent, metadata, before_data, after_data, created_at, empresa:empresas(razon_social, nombre_fantasia)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (modulo) query = query.eq('module', modulo)
  if (resultado && ['exitoso', 'fallido', 'denegado'].includes(resultado)) query = query.eq('result', resultado)
  if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) query = query.gte('created_at', `${desde}T00:00:00-04:00`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(hasta)) query = query.lte('created_at', `${hasta}T23:59:59.999-04:00`)

  const { data, error } = await query
  const rows = ((data ?? []) as unknown as AuditRow[]).filter((row) => {
    if (!q) return true
    const company = one(row.empresa)
    const haystack = [
      row.transaction_code,
      row.actor_name,
      row.actor_email,
      row.actor_role,
      row.target_user_name,
      row.target_user_email,
      row.accion,
      row.entidad,
      row.entidad_id,
      row.module,
      row.description,
      row.result,
      row.source,
      company?.nombre_fantasia,
      company?.razon_social,
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })

  const modules = Array.from(new Set(((data ?? []) as unknown as AuditRow[]).map((row) => row.module).filter(Boolean))).sort()
  const successful = rows.filter((row) => row.result === 'exitoso').length
  const alerts = rows.filter((row) => row.result !== 'exitoso').length
  const actors = new Set(rows.map((row) => row.actor_user_id || row.actor_email || row.actor_name).filter(Boolean)).size

  return (
    <div className="mx-auto max-w-[1600px]">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Seguridad y trazabilidad</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Auditoría de la plataforma</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">Registro inmutable de operaciones, cambios y accesos relevantes. Cada evento conserva fecha y hora de Chile, actor, rol, usuario afectado, entidad, resultado, origen y código único de transacción.</p>
      </header>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          No fue posible cargar la auditoría. Confirme que la migración de trazabilidad esté aplicada.
        </div>
      )}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon="tasks" label="Eventos visibles" value={rows.length} />
        <Metric icon="check" label="Exitosos" value={successful} />
        <Metric icon="warning" label="Alertas o denegados" value={alerts} />
        <Metric icon="users" label="Actores identificados" value={actors} />
      </section>

      <form className="mt-7 grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-6" method="get">
        <label className="xl:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Buscar</span>
          <div className="relative mt-1.5">
            <AppIcon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input name="q" defaultValue={params.q} placeholder="Transacción, actor, correo, acción..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#174f7a] focus:ring-2 focus:ring-[#174f7a]/10" />
          </div>
        </label>
        <label>
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Módulo</span>
          <select name="modulo" defaultValue={modulo} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#174f7a]">
            <option value="">Todos</option>
            {modules.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Resultado</span>
          <select name="resultado" defaultValue={resultado} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#174f7a]">
            <option value="">Todos</option>
            <option value="exitoso">Exitoso</option>
            <option value="fallido">Fallido</option>
            <option value="denegado">Denegado</option>
          </select>
        </label>
        <label>
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Desde</span>
          <input type="date" name="desde" defaultValue={desde} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#174f7a]" />
        </label>
        <label>
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Hasta</span>
          <input type="date" name="hasta" defaultValue={hasta} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#174f7a]" />
        </label>
        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-6">
          <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#10283d] px-4 text-sm font-black text-white hover:bg-[#174f7a]"><AppIcon name="search" className="h-4 w-4" />Aplicar filtros</button>
          <a href="/admin/auditoria" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-600 hover:bg-slate-50">Limpiar</a>
        </div>
      </form>

      <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
          <h2 className="text-lg font-black text-[#0f2438]">Eventos recientes</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Se muestran hasta 500 eventos por consulta. Los datos antiguos permanecen almacenados e inmutables.</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm font-bold text-slate-500">No existen eventos que coincidan con los filtros seleccionados.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => <AuditEvent key={row.id} row={row} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function AuditEvent({ row }: { row: AuditRow }) {
  const created = new Date(row.created_at)
  const company = one(row.empresa)
  const metadata = jsonText(row.metadata)
  const before = jsonText(row.before_data)
  const after = jsonText(row.after_data)
  const resultStatus = row.result === 'exitoso' ? 'Completada' : row.result === 'denegado' ? 'Bloqueada' : 'Vencida'

  return (
    <article className="p-5 sm:p-7">
      <div className="grid gap-5 xl:grid-cols-[180px_minmax(0,1fr)_250px]">
        <div>
          <p className="font-mono text-[11px] font-black text-[#174f7a]">{row.transaction_code}</p>
          <p className="mt-3 text-sm font-black text-[#0f2438]">{dateFormatter.format(created)}</p>
          <p className="mt-0.5 text-xs font-bold text-slate-500">{timeFormatter.format(created)} · Chile</p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Origen: {row.source}</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={resultStatus} />
            <span className="rounded-full bg-[#edf4f9] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#174f7a]">{row.module}</span>
          </div>
          <h3 className="mt-3 text-base font-black text-[#0f2438]">{row.description || displayAction(row.accion)}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{displayAction(row.accion)} sobre <span className="font-mono text-xs text-slate-700">{row.entidad}</span>{row.entidad_id ? ` · ${row.entidad_id}` : ''}</p>
          {company && <p className="mt-2 text-xs font-bold text-slate-500">Empresa: {company.nombre_fantasia || company.razon_social}</p>}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Realizado por" value={row.actor_name || 'Proceso del sistema'} secondary={[row.actor_email, row.actor_role].filter(Boolean).join(' · ')} />
            <Info label="Usuario afectado" value={row.target_user_name || row.target_user_email || 'No aplica'} secondary={row.target_user_name ? row.target_user_email || '' : ''} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
          <p className="font-black uppercase tracking-wide text-slate-500">Identificadores técnicos</p>
          <dl className="mt-3 space-y-2 text-slate-600">
            <div><dt className="font-bold">Actor</dt><dd className="mt-0.5 break-all font-mono text-[10px]">{row.actor_user_id || 'Sistema'}</dd></div>
            <div><dt className="font-bold">Solicitud</dt><dd className="mt-0.5 break-all font-mono text-[10px]">{row.request_id || row.transaction_code}</dd></div>
            {row.user_agent && <div><dt className="font-bold">Dispositivo</dt><dd className="mt-0.5 line-clamp-3 break-words text-[10px]">{row.user_agent}</dd></div>}
          </dl>
        </div>
      </div>

      {(metadata || before || after) && (
        <details className="mt-5 rounded-2xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-[#174f7a] [&::-webkit-details-marker]:hidden">Ver detalle técnico y cambios registrados</summary>
          <div className="grid gap-4 border-t border-slate-100 p-4 xl:grid-cols-3">
            <JsonBlock title="Metadatos" value={metadata} />
            <JsonBlock title="Antes" value={before} />
            <JsonBlock title="Después" value={after} />
          </div>
        </details>
      )}
    </article>
  )
}

function Metric({ icon, label, value }: { icon: 'tasks' | 'check' | 'warning' | 'users'; label: string; value: number }) {
  return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase text-slate-500">{label}</p></div></article>
}

function Info({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-[#17324a]">{value}</p>{secondary && <p className="mt-1 break-all text-[11px] font-semibold text-slate-500">{secondary}</p>}</div>
}

function JsonBlock({ title, value }: { title: string; value: string | null }) {
  return <div><p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">{title}</p>{value ? <pre className="max-h-72 overflow-auto rounded-xl bg-[#0d2032] p-3 text-[10px] leading-5 text-slate-200">{value}</pre> : <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-400">Sin información</p>}</div>
}
