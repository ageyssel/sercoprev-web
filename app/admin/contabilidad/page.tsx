import Link from 'next/link'
import { AppIcon, type AppIconName } from '@/components/AppIcon'
import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { MetricCard } from '@/components/ui/MetricCard'
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
    { href: `/admin/contabilidad/reportes${companyQuery}`, title: 'Reportes y rentabilidad', description: 'Balance, mayor, estado de resultados, rentabilidad y balance clasificado.', icon: 'tasks' },
  ]

  return (
    <div className="mx-auto max-w-[1450px]">
      <ModulePageHeader eyebrow="Macromódulo financiero y tributario" title="Contabilidad y rentabilidad" description="Procesos separados y ordenados para configurar, registrar, importar, conciliar y analizar resultados financieros." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />

      {!selected ? <Empty /> : <>
        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="document" label="Cuentas activas" value={String(accounts.count ?? 0)} detail="Plan de cuentas habilitado" tone="blue" />
          <MetricCard icon="calendar" label="Periodos abiertos" value={String(openPeriods)} detail="Disponibles para registrar" tone="navy" />
          <MetricCard icon="money" label="Compras registradas" value={formatCurrency(purchases)} detail="Documentos cargados" tone="gold" />
          <MetricCard icon="money" label="Ventas registradas" value={formatCurrency(sales)} detail="Documentos cargados" tone="green" />
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => <ModuleLink key={card.href} {...card} />)}
        </section>

        <section className="mt-6 rounded-2xl border border-[#174f7a]/15 bg-[#edf4f9] p-5 shadow-none">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#174f7a] shadow-sm"><AppIcon name="check" className="h-4 w-4" /></span><div><h2 className="inline-flex items-center text-base font-extrabold text-[#10283d]">Control contable <InfoTip title="Principio de cuadratura">Un asiento sólo puede contabilizarse si el total del Debe es igual al total del Haber. Los reportes se construyen exclusivamente con asientos contabilizados.</InfoTip></h2><p className="mt-1.5 text-xs font-medium leading-5 text-slate-600">Configure la estructura una vez, registre o importe la operación, revise excepciones y luego emita libros e informes.</p></div></div>
        </section>
      </>}
    </div>
  )
}

function ModuleLink({ href, title, description, icon, badge }: Card) {
  return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:border-[#174f7a]/25 hover:shadow-md sm:p-5"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4f9] text-[#174f7a] group-hover:bg-[#174f7a] group-hover:text-white"><AppIcon name={icon} className="h-4 w-4" /></span>{badge && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-500">{badge}</span>}</div><h2 className="mt-3.5 text-base font-extrabold text-[#10283d]">{title}</h2><p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">{description}</p><span className="mt-3.5 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#174f7a]">Abrir sección <AppIcon name="arrow-right" className="h-3.5 w-3.5" /></span></Link>
}

function Empty() { return <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500">Cree al menos un cliente para utilizar contabilidad.</div> }
