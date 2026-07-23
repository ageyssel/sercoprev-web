import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { CalculationLabel, InfoTip } from '@/components/ui/InfoTip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { contabilizarAsiento } from '@/app/admin/accounting-actions'
import { SimpleEntryForm, type AccountingOption } from '@/app/admin/components/AccountingForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null }
type EntryLine = { debe: number; haber: number; cuenta: { codigo: string; nombre: string } | Array<{ codigo: string; nombre: string }> | null }
type Entry = { id: string; numero: number; fecha: string; tipo: string; glosa: string; estado: string; origen: string; movimientos: EntryLine[] }
const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const [accountsResult, periodsResult, entriesResult] = selected ? await Promise.all([
    supabase.from('plan_cuentas').select('id, codigo, nombre').eq('empresa_id', selected.id).eq('activo', true).eq('imputable', true).order('codigo'),
    supabase.from('periodos_contables').select('id, periodo, estado').eq('empresa_id', selected.id).neq('estado', 'Cerrado').order('periodo', { ascending: false }),
    supabase.from('asientos_contables').select('id, numero, fecha, tipo, glosa, estado, origen, movimientos:movimientos_contables(debe, haber, cuenta:plan_cuentas(codigo, nombre))').eq('empresa_id', selected.id).order('numero', { ascending: false }).limit(300),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
  const accounts: AccountingOption[] = (accountsResult.data ?? []).map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))
  const periods: AccountingOption[] = (periodsResult.data ?? []).map((item) => ({ id: item.id, label: `${item.periodo.slice(0, 7)} · ${item.estado}` }))
  const entries = (entriesResult.data ?? []) as Entry[]
  const hasError = Boolean(accountsResult.error || periodsResult.error || entriesResult.error)
  const totals = entries.reduce((acc, entry) => ({ debit: acc.debit + (entry.movimientos ?? []).reduce((sum, line) => sum + Number(line.debe || 0), 0), credit: acc.credit + (entry.movimientos ?? []).reduce((sum, line) => sum + Number(line.haber || 0), 0) }), { debit: 0, credit: 0 })

  return (
    <div className="mx-auto max-w-[1450px]">
      <ModulePageHeader eyebrow="Contabilidad · Registro" title="Libro diario" description="Registre y revise asientos sin mezclar esta tarea con plan de cuentas, bancos o reportes. La contabilización exige cuadratura exacta." help="El Debe representa aplicaciones o aumentos según la naturaleza de la cuenta; el Haber representa orígenes o disminuciones. El efecto depende del tipo de cuenta." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />
      {hasError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar todos los datos del diario.</div>}
      {!selected ? <Empty /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Asientos" value={String(entries.length)} help="Cantidad de asientos cargados en la vista actual." /><Metric label="Debe acumulado" value={formatCurrency(totals.debit)} help="Suma de todas las líneas registradas al Debe en los asientos consultados." /><Metric label="Haber acumulado" value={formatCurrency(totals.credit)} help="Suma de todas las líneas registradas al Haber. En un diario cuadrado debe coincidir con el Debe." /></section>

        <details className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><summary className="cursor-pointer list-none text-xl font-black text-[#134b78] [&::-webkit-details-marker]:hidden">+ Crear asiento simple</summary><p className="mt-2 text-sm text-slate-500">Crea un asiento de dos líneas por el mismo monto. Para asientos complejos debe utilizarse un editor multlínea en una siguiente etapa.</p><div className="mt-5 border-t border-slate-200 pt-5">{accounts.length < 2 || periods.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Cree al menos dos cuentas imputables y un periodo abierto.</p> : <SimpleEntryForm companyId={selected.id} periods={periods} accounts={accounts} />}</div></details>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Asientos contables <InfoTip>Un asiento Borrador puede revisarse. Al contabilizarlo pasa a integrar libros e informes. Debe y Haber deben ser iguales.</InfoTip></h2></div><div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase text-slate-500"><th className="px-5 py-4">N°</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Glosa y líneas</th><th className="px-5 py-4">Origen</th><th className="px-5 py-4 text-right"><CalculationLabel label="Debe" help="Suma de cargos del asiento." /></th><th className="px-5 py-4 text-right"><CalculationLabel label="Haber" help="Suma de abonos del asiento. Debe coincidir con el Debe." /></th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Acción</th></tr></thead><tbody>{entries.length === 0 ? <tr><td colSpan={8} className="p-12 text-center text-slate-500">No hay asientos.</td></tr> : entries.map((entry) => { const debit = (entry.movimientos ?? []).reduce((sum, line) => sum + Number(line.debe || 0), 0); const credit = (entry.movimientos ?? []).reduce((sum, line) => sum + Number(line.haber || 0), 0); const balanced = Math.abs(debit - credit) < 0.5; return <tr key={entry.id} className="border-t border-slate-100 align-top"><td className="px-5 py-4 font-black text-[#134b78]">{entry.numero}</td><td className="px-5 py-4">{formatDate(entry.fecha)}</td><td className="px-5 py-4"><p className="font-bold text-[#17324a]">{entry.glosa}</p><div className="mt-2 grid gap-1">{(entry.movimientos ?? []).map((line, index) => { const account = one(line.cuenta); return <p key={index} className="text-xs text-slate-500">{account?.codigo} · {account?.nombre}: {line.debe ? `Debe ${formatCurrency(line.debe)}` : `Haber ${formatCurrency(line.haber)}`}</p> })}</div></td><td className="px-5 py-4">{entry.origen}</td><td className="px-5 py-4 text-right font-bold">{formatCurrency(debit)}</td><td className="px-5 py-4 text-right font-bold">{formatCurrency(credit)}</td><td className="px-5 py-4"><StatusBadge status={entry.estado} />{!balanced && <p className="mt-2 text-xs font-black text-red-700">Descuadrado</p>}</td><td className="px-5 py-4">{entry.estado === 'Borrador' && <form action={contabilizarAsiento}><input type="hidden" name="asiento_id" value={entry.id} /><input type="hidden" name="empresa_id" value={selected.id} /><button disabled={!balanced} className="h-9 rounded-lg bg-[#0f2438] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Contabilizar</button></form>}</td></tr> })}</tbody></table></div></section>
      </>}
    </div>
  )
}

function Metric({ label, value, help }: { label: string; value: string; help: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><InfoTip>{help}</InfoTip></div><p className="mt-3 text-2xl font-black text-[#0f2438]">{value}</p></article> }
function Empty() { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">No hay empresas disponibles.</div> }
