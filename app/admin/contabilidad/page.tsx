import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { contabilizarAsiento } from '@/app/admin/accounting-actions'
import {
  AccountForm,
  AccountingPeriodForm,
  CostCenterForm,
  SimpleEntryForm,
  TaxDocumentForm,
  type AccountingOption,
} from '@/app/admin/components/AccountingForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type Account = { id: string; codigo: string; nombre: string; tipo: string; naturaleza: string; nivel: number; imputable: boolean; activo: boolean }
type Period = { id: string; periodo: string; estado: string }
type EntryLine = { debe: number; haber: number; cuenta: { codigo: string; nombre: string } | Array<{ codigo: string; nombre: string }> | null }
type Entry = { id: string; empresa_id: string; numero: number; fecha: string; tipo: string; glosa: string; estado: string; origen: string; movimientos: EntryLine[] }
type TaxDocument = { id: string; tipo_registro: string; tipo_documento: string; folio: string | null; rut_contraparte: string | null; razon_social_contraparte: string | null; fecha_emision: string; neto: number; iva: number; total: number; estado: string }

const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows, error: companiesError } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selectedCompany = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const empty = { data: [], error: null }

  const [accountsResult, periodsResult, entriesResult, documentsResult, centersResult] = selectedCompany ? await Promise.all([
    supabase.from('plan_cuentas').select('id, codigo, nombre, tipo, naturaleza, nivel, imputable, activo').eq('empresa_id', selectedCompany.id).order('codigo').limit(500),
    supabase.from('periodos_contables').select('id, periodo, estado').eq('empresa_id', selectedCompany.id).order('periodo', { ascending: false }).limit(36),
    supabase.from('asientos_contables').select('id, empresa_id, numero, fecha, tipo, glosa, estado, origen, movimientos:movimientos_contables(debe, haber, cuenta:plan_cuentas(codigo, nombre))').eq('empresa_id', selectedCompany.id).order('numero', { ascending: false }).limit(150),
    supabase.from('documentos_tributarios').select('id, tipo_registro, tipo_documento, folio, rut_contraparte, razon_social_contraparte, fecha_emision, neto, iva, total, estado').eq('empresa_id', selectedCompany.id).order('fecha_emision', { ascending: false }).limit(150),
    supabase.from('centros_costo').select('id, codigo, nombre, activo').eq('empresa_id', selectedCompany.id).order('codigo'),
  ]) : [empty, empty, empty, empty, empty]

  const accounts = (accountsResult.data ?? []) as Account[]
  const periods = (periodsResult.data ?? []) as Period[]
  const entries = (entriesResult.data ?? []) as Entry[]
  const documents = (documentsResult.data ?? []) as TaxDocument[]
  const centers = (centersResult.data ?? []) as Array<{ id: string; codigo: string; nombre: string; activo: boolean }>
  const errors = [companiesError, accountsResult.error, periodsResult.error, entriesResult.error, documentsResult.error, centersResult.error].filter(Boolean)
  const accountOptions: AccountingOption[] = accounts.filter((item) => item.imputable && item.activo).map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))
  const parentOptions: AccountingOption[] = accounts.filter((item) => item.activo).map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))
  const periodOptions: AccountingOption[] = periods.filter((item) => item.estado !== 'Cerrado').map((item) => ({ id: item.id, label: `${item.periodo.slice(0, 7)} · ${item.estado}` }))
  const postedEntries = entries.filter((item) => item.estado === 'Contabilizado')
  const purchaseTotal = documents.filter((item) => item.tipo_registro === 'Compra').reduce((sum, item) => sum + Number(item.total || 0), 0)
  const salesTotal = documents.filter((item) => item.tipo_registro === 'Venta').reduce((sum, item) => sum + Number(item.total || 0), 0)

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Contabilidad financiera y tributaria</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Contabilidad</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Plan de cuentas, periodos, diario, mayor, documentos tributarios, centros de costo y base para balances y declaraciones juradas.</p></div>
        <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="text-xs font-black uppercase tracking-wide text-slate-500">Empresa</label><select name="empresa" defaultValue={selectedCompany?.id ?? ''} className="h-11 min-w-[280px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">{companies.map((company) => <option key={company.id} value={company.id}>{company.nombre_fantasia || company.razon_social}</option>)}</select><button className="h-11 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white">Abrir</button></form>
      </header>

      {errors.length > 0 && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Parte del módulo contable no pudo cargarse. Confirme que la migración esté aplicada.</div>}
      {!selectedCompany ? <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center font-bold text-slate-500">Cree al menos un cliente para utilizar contabilidad.</div> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon="document" label="Cuentas activas" value={accounts.filter((item) => item.activo).length.toString()} />
          <Metric icon="tasks" label="Asientos contabilizados" value={postedEntries.length.toString()} />
          <Metric icon="upload" label="Compras registradas" value={formatCurrency(purchaseTotal)} />
          <Metric icon="money" label="Ventas registradas" value={formatCurrency(salesTotal)} />
        </section>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle icon="document" title="Plan de cuentas" description="Estructura financiera y tributaria con naturaleza, nivel y cuentas imputables." /><details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-black text-[#134b78]">Crear cuenta</summary><div className="mt-5"><AccountForm companyId={selectedCompany.id} parentAccounts={parentOptions} /></div></details><div className="mt-5 max-h-[520px] overflow-auto rounded-2xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase text-slate-500"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Cuenta</th><th className="px-4 py-3">Tipo</th></tr></thead><tbody>{accounts.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-slate-500">Sin plan de cuentas.</td></tr> : accounts.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-black text-[#134b78]">{item.codigo}</td><td className="px-4 py-3"><p className="font-bold text-[#17324a]">{item.nombre}</p><p className="text-xs text-slate-400">Nivel {item.nivel} · {item.imputable ? 'Imputable' : 'Agrupadora'}</p></td><td className="px-4 py-3"><StatusBadge status={item.tipo} /></td></tr>)}</tbody></table></div></section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><SectionTitle icon="building" title="Centros de costo" description="Segmentación para informes y distribución de gastos e ingresos." /><div className="mt-5"><CostCenterForm companyId={selectedCompany.id} /></div><div className="mt-5 flex flex-wrap gap-2">{centers.length === 0 ? <p className="text-sm text-slate-500">No hay centros de costo.</p> : centers.map((center) => <span key={center.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{center.codigo} · {center.nombre}</span>)}</div><div className="mt-7 border-t border-slate-200 pt-6"><SectionTitle icon="calendar" title="Periodos contables" description="Control de apertura, revisión y cierre mensual." /><div className="mt-5"><AccountingPeriodForm companyId={selectedCompany.id} /></div><div className="mt-4 grid gap-2">{periods.map((period) => <div key={period.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"><span className="font-bold text-[#17324a]">{period.periodo.slice(0, 7)}</span><StatusBadge status={period.estado} /></div>)}</div></div></section>
        </div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="plus" title="Nuevo asiento" description="Ingreso simple de dos líneas; el sistema crea debe y haber por el mismo monto." />{accountOptions.length < 2 || periodOptions.length === 0 ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Cree al menos dos cuentas imputables y un periodo abierto.</p> : <div className="mt-5"><SimpleEntryForm companyId={selectedCompany.id} periods={periodOptions} accounts={accountOptions} /></div>}</section>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="text-xl font-black text-[#0f2438]">Libro diario</h2><p className="mt-1 text-sm text-slate-500">Un asiento borrador sólo puede contabilizarse cuando la suma del debe coincide exactamente con el haber.</p></div><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500"><th className="px-5 py-4">N°</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Glosa</th><th className="px-5 py-4">Origen</th><th className="px-5 py-4 text-right">Debe</th><th className="px-5 py-4 text-right">Haber</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Acción</th></tr></thead><tbody>{entries.length === 0 ? <tr><td colSpan={8} className="px-5 py-14 text-center text-slate-500">No hay asientos.</td></tr> : entries.map((entry) => { const totalDebe = (entry.movimientos ?? []).reduce((sum, line) => sum + Number(line.debe || 0), 0); const totalHaber = (entry.movimientos ?? []).reduce((sum, line) => sum + Number(line.haber || 0), 0); return <tr key={entry.id} className="border-t border-slate-100 align-top"><td className="px-5 py-4 font-black text-[#134b78]">{entry.numero}</td><td className="px-5 py-4">{formatDate(entry.fecha)}</td><td className="px-5 py-4"><p className="font-bold text-[#17324a]">{entry.glosa}</p><div className="mt-2 grid gap-1">{(entry.movimientos ?? []).map((line, index) => { const account = one(line.cuenta); return <p key={index} className="text-xs text-slate-500">{account?.codigo} · {account?.nombre}: {line.debe ? `Debe ${formatCurrency(line.debe)}` : `Haber ${formatCurrency(line.haber)}`}</p> })}</div></td><td className="px-5 py-4">{entry.origen}</td><td className="px-5 py-4 text-right font-bold">{formatCurrency(totalDebe)}</td><td className="px-5 py-4 text-right font-bold">{formatCurrency(totalHaber)}</td><td className="px-5 py-4"><StatusBadge status={entry.estado} /></td><td className="px-5 py-4">{entry.estado === 'Borrador' && <form action={contabilizarAsiento}><input type="hidden" name="asiento_id" value={entry.id} /><input type="hidden" name="empresa_id" value={selectedCompany.id} /><button className="h-9 rounded-lg bg-[#0f2438] px-3 text-xs font-black text-white">Contabilizar</button></form>}</td></tr> })}</tbody></table></div></section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="upload" title="Registro de compras y ventas" description="Base documental para libros, IVA, cuentas corrientes y centralización contable." /><details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-black text-[#134b78]">Registrar documento</summary><div className="mt-5"><TaxDocumentForm companyId={selectedCompany.id} /></div></details><div className="mt-5 overflow-x-auto"><table className="min-w-[950px] w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500"><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Contraparte</th><th className="px-4 py-3 text-right">Neto</th><th className="px-4 py-3 text-right">IVA</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Estado</th></tr></thead><tbody>{documents.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-slate-500">No hay documentos tributarios.</td></tr> : documents.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-4 py-3">{formatDate(item.fecha_emision)}</td><td className="px-4 py-3 font-bold">{item.tipo_registro}</td><td className="px-4 py-3">{item.tipo_documento}{item.folio ? ` N° ${item.folio}` : ''}</td><td className="px-4 py-3"><p className="font-bold">{item.razon_social_contraparte || 'Sin informar'}</p><p className="text-xs text-slate-400">{item.rut_contraparte}</p></td><td className="px-4 py-3 text-right">{formatCurrency(item.neto)}</td><td className="px-4 py-3 text-right">{formatCurrency(item.iva)}</td><td className="px-4 py-3 text-right font-black text-[#134b78]">{formatCurrency(item.total)}</td><td className="px-4 py-3"><StatusBadge status={item.estado} /></td></tr>)}</tbody></table></div></section>
      </>}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: 'document' | 'tasks' | 'upload' | 'money'; label: string; value: string }) { return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p></div></article> }
function SectionTitle({ icon, title, description }: { icon: 'document' | 'building' | 'calendar' | 'plus' | 'upload'; title: string; description: string }) { return <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div> }
