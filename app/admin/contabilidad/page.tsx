import Link from 'next/link'
import { AppIcon, type AppIconName } from '@/components/AppIcon'
import { CompanySelector } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { formatCurrency } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type Card = { href: string; title: string; description: string; icon: AppIconName; badge?: string }

export default async function AccountingOverview({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const empty = { count: 0, data: [], error: null }

  const [accounts, periods, entries, documents, banks] = selected ? await Promise.all([
    supabase.from('plan_cuentas').select('id', { count: 'exact', head: true }).eq('empresa_id', selected.id).eq('activo', true),
    supabase.from('periodos_contables').select('id, estado', { count: 'exact' }).eq('empresa_id', selected.id),
    supabase.from('asientos_contables').select('id, estado', { count: 'exact' }).eq('empresa_id', selected.id),
    supabase.from('documentos_tributarios').select('tipo_registro, total').eq('empresa_id', selected.id).limit(5000),
    supabase.from('cuentas_bancarias').select('id', { count: 'exact', head: true }).eq('empresa_id', selected.id).eq('activa', true),
  ]) : [empty, empty, empty, empty, empty]

  const openPeriods = (periods.data ?? []).filter((item) => item.estado !== 'Cerrado').length
  const draftEntries = (entries.data ?? []).filter((item) => item.estado === 'Borrador').length
  const purchases = (documents.data ?? []).filter((item) => item.tipo_registro === 'Compra').reduce((sum, item) => sum + Number(item.total || 0), 0)
  const sales = (documents.data ?? []).filter((item) => item.tipo_registro === 'Venta').reduce((sum, item) => sum + Number(item.total || 0), 0)
  const companyQuery = selected ? `?empresa=${selected.id}` : ''
  const cards: Card[] = [
    { href: `/admin/contabilidad/configuracion${companyQuery}`, title: 'Configuración contable', description: 'Plan de cuentas, centros de costo, periodos y estructura base de la empresa.', icon: 'settings', badge: `${accounts.count ?? 0} cuentas` },
    { href: `/admin/contabilidad/diario${companyQuery}`, title: 'Libro diario', description: 'Creación, revisión y contabilización de asientos con control automático de cuadratura.', icon: 'document', badge: `${draftEntries} borradores` },
    { href: `/admin/contabilidad/documentos${companyQuery}`, title: 'Compras y ventas', description: 'Documentos tributarios, IVA, contrapartes, folios y base para centralización.', icon: 'money' },
    { href: `/admin/contabilidad/importaciones${companyQuery}`, title: 'RCV y cartolas', description: 'Carga masiva, deduplicación, cuentas bancarias y conciliación exacta.', icon: 'upload', badge: `${banks.count ?? 0} bancos` },
    { href: `/admin/contabilidad/reportes${companyQuery}`, title: 'Libros, rentabilidad y reportes', description: 'Balance de comprobación, mayor, estado de resultados, rentabilidad y balance clasificado.', icon: 'tasks' },
  ]

  return (
    <div className="mx-auto max-w-[1450px]">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Macromódulo financiero y tributario</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Contabilidad y rentabilidad</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Una portada ejecutiva y pantallas separadas por proceso: configuración, registro, importación, conciliación, rentabilidad y reportes.</p>
        </div>
        <CompanySelector companies={companies} selectedId={selected?.id} />
      </header>

      {!selected ? <Empty /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon="document" label="Cuentas activas" value={String(accounts.count ?? 0)} help="Cuentas habilitadas en el plan de cuentas de la empresa." />
          <Metric icon="calendar" label="Periodos abiertos" value={String(openPeriods)} help="Periodos que permiten registrar o modificar asientos antes del cierre." />
          <Metric icon="money" label="Compras registradas" value={formatCurrency(purchases)} help="Suma del total de documentos clasificados como compras dentro del universo cargado." />
          <Metric icon="money" label="Ventas registradas" value={formatCurrency(sales)} help="Suma del total de documentos clasificados como ventas dentro del universo cargado." />
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => <ModuleLink key={card.href} {...card} />)}
        </section>

        <section className="mt-7 rounded-3xl border border-[#134b78]/20 bg-[#eaf3f9] p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#134b78]"><AppIcon name="check" className="h-5 w-5" /></span><div><h2 className="inline-flex items-center text-lg font-black text-[#0f2438]">Control contable <InfoTip title="Principio de cuadratura">Un asiento sólo puede contabilizarse si el total del Debe es igual al total del Haber. Los reportes se construyen exclusivamente con asientos contabilizados.</InfoTip></h2><p className="mt-2 text-sm leading-6 text-slate-600">Configura la estructura una vez, registra o importa la operación, revisa las excepciones y recién después emite libros e informes.</p></div></div>
        </section>
      </>}
    </div>
  )
}

function Metric({ icon, label, value, help }: { icon: AppIconName; label: string; value: string; help: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><InfoTip>{help}</InfoTip></div><p className="mt-4 text-2xl font-black text-[#0f2438]">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p></article> }
function ModuleLink({ href, title, description, icon, badge }: Card) { return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#134b78]/35 hover:shadow-md"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78] group-hover:bg-[#134b78] group-hover:text-white"><AppIcon name={icon} className="h-5 w-5" /></span>{badge && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{badge}</span>}</div><h2 className="mt-4 text-lg font-black text-[#0f2438]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#134b78]">Abrir sección <AppIcon name="arrow-right" className="h-4 w-4" /></span></Link> }
function Empty() { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center font-bold text-slate-500">Cree al menos un cliente para utilizar contabilidad.</div> }
