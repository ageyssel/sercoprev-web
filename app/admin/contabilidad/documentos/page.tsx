import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { CalculationLabel, InfoTip } from '@/components/ui/InfoTip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { TaxDocumentForm } from '@/app/admin/components/AccountingForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null }
type TaxDocument = { id: string; tipo_registro: string; tipo_documento: string; folio: string | null; rut_contraparte: string | null; razon_social_contraparte: string | null; fecha_emision: string; fecha_recepcion: string | null; neto: number; exento: number; iva: number; otros_impuestos: number; total: number; estado: string }

export default async function TaxDocumentsPage({ searchParams }: { searchParams: Promise<{ empresa?: string; registro?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  let query = selected ? supabase.from('documentos_tributarios').select('id, tipo_registro, tipo_documento, folio, rut_contraparte, razon_social_contraparte, fecha_emision, fecha_recepcion, neto, exento, iva, otros_impuestos, total, estado').eq('empresa_id', selected.id).order('fecha_emision', { ascending: false }).limit(1000) : null
  if (query && ['Compra', 'Venta'].includes(params.registro ?? '')) query = query.eq('tipo_registro', params.registro!)
  const { data, error } = query ? await query : { data: [], error: null }
  const documents = (data ?? []) as TaxDocument[]
  const totals = documents.reduce((acc, item) => ({ net: acc.net + Number(item.neto || 0), exempt: acc.exempt + Number(item.exento || 0), vat: acc.vat + Number(item.iva || 0), total: acc.total + Number(item.total || 0) }), { net: 0, exempt: 0, vat: 0, total: 0 })

  return (
    <div className="mx-auto max-w-[1450px]">
      <ModulePageHeader eyebrow="Contabilidad · Documentos tributarios" title="Compras y ventas" description="Registro documental separado del libro diario. Sirve como base para RCV, IVA, cuentas corrientes y centralización contable." help="Registrar un documento no equivale automáticamente a contabilizarlo. La centralización debe definir cuentas, contrapartes, impuestos y periodo." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />
      {selected && <form method="get" className="mt-7 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><input type="hidden" name="empresa" value={selected.id} /><button name="registro" value="" className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600">Todos</button><button name="registro" value="Compra" className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600">Compras</button><button name="registro" value="Venta" className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600">Ventas</button></form>}
      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar los documentos tributarios.</div>}
      {!selected ? <Empty /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Neto afecto" value={totals.net} help="Monto antes de IVA correspondiente a operaciones afectas." /><Metric label="Exento" value={totals.exempt} help="Monto de operaciones exentas o no gravadas, según clasificación del documento." /><Metric label="IVA" value={totals.vat} help="Impuesto al Valor Agregado informado en los documentos cargados. Su tratamiento como crédito o débito fiscal depende del registro y requisitos legales." /><Metric label="Total documentos" value={totals.total} help="Suma de neto, exento, IVA y otros impuestos según cada documento." /></section>

        <details className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><summary className="cursor-pointer list-none text-xl font-black text-[#134b78] [&::-webkit-details-marker]:hidden">+ Registrar documento</summary><div className="mt-5 border-t border-slate-200 pt-5"><TaxDocumentForm companyId={selected.id} /></div></details>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Registro documental <InfoTip>Los duplicados provenientes de importaciones RCV se controlan mediante huella de contenido. Los registros manuales deben revisarse antes de centralizar.</InfoTip></h2></div><div className="overflow-x-auto"><table className="min-w-[1150px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase text-slate-500"><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Contraparte</th><th className="px-4 py-3 text-right"><CalculationLabel label="Neto" help="Base afecta antes de IVA." /></th><th className="px-4 py-3 text-right"><CalculationLabel label="Exento" help="Monto exento o no gravado registrado." /></th><th className="px-4 py-3 text-right"><CalculationLabel label="IVA" help="IVA informado en el documento." /></th><th className="px-4 py-3 text-right"><CalculationLabel label="Total" help="Neto + exento + IVA + otros impuestos." /></th><th className="px-4 py-3">Estado</th></tr></thead><tbody>{documents.length === 0 ? <tr><td colSpan={9} className="p-12 text-center text-slate-500">No hay documentos.</td></tr> : documents.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{formatDate(item.fecha_emision)}</td><td className="px-4 py-3"><StatusBadge status={item.tipo_registro} /></td><td className="px-4 py-3"><p className="font-bold">{item.tipo_documento}</p><p className="text-xs text-slate-500">Folio {item.folio || '—'}</p></td><td className="px-4 py-3"><p className="font-bold">{item.razon_social_contraparte || 'Sin razón social'}</p><p className="text-xs text-slate-500">{item.rut_contraparte || 'Sin RUT'}</p></td><td className="px-4 py-3 text-right">{formatCurrency(item.neto)}</td><td className="px-4 py-3 text-right">{formatCurrency(item.exento)}</td><td className="px-4 py-3 text-right">{formatCurrency(item.iva)}</td><td className="px-4 py-3 text-right font-black">{formatCurrency(item.total)}</td><td className="px-4 py-3"><StatusBadge status={item.estado} /></td></tr>)}</tbody></table></div></section>
      </>}
    </div>
  )
}

function Metric({ label, value, help }: { label: string; value: number; help: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><InfoTip>{help}</InfoTip></div><p className="mt-3 text-2xl font-black text-[#0f2438]">{formatCurrency(value)}</p></article> }
function Empty() { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">No hay empresas disponibles.</div> }
