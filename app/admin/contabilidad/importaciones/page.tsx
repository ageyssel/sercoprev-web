import { AppIcon } from '@/components/AppIcon'
import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { CalculationLabel, InfoTip } from '@/components/ui/InfoTip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { conciliarMovimientosExactos } from '@/app/admin/accounting-import-actions'
import { BankAccountForm, BankCsvImportForm, RcvImportForm, type ImportOption } from '@/app/admin/components/AccountingImportForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type BankAccount = { id: string; banco: string; tipo_cuenta: string; numero_enmascarado: string; moneda: string; activa: boolean }
type ImportBatch = { id: string; tipo: string; nombre_archivo: string; total_filas: number; insertadas: number; duplicadas: number; rechazadas: number; estado: string; errores: Array<{ fila?: number; error?: string }>; created_at: string }
type BankMovement = { id: string; fecha: string; descripcion: string; referencia: string | null; cargo: number; abono: number; saldo: number | null; estado: string; cuenta: { banco: string; numero_enmascarado: string } | Array<{ banco: string; numero_enmascarado: string }> | null }

const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default async function AccountingImportsPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows, error: companiesError } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selectedCompany = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const empty = { data: [], error: null }

  const [banksResult, accountsResult, importsResult, movementsResult] = selectedCompany ? await Promise.all([
    supabase.from('cuentas_bancarias').select('id, banco, tipo_cuenta, numero_enmascarado, moneda, activa').eq('empresa_id', selectedCompany.id).order('banco'),
    supabase.from('plan_cuentas').select('id, codigo, nombre').eq('empresa_id', selectedCompany.id).eq('activo', true).eq('imputable', true).order('codigo'),
    supabase.from('importaciones_contables').select('id, tipo, nombre_archivo, total_filas, insertadas, duplicadas, rechazadas, estado, errores, created_at').eq('empresa_id', selectedCompany.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('movimientos_bancarios').select('id, fecha, descripcion, referencia, cargo, abono, saldo, estado, cuenta:cuentas_bancarias!inner(banco, numero_enmascarado, empresa_id)').eq('cuenta.empresa_id', selectedCompany.id).order('fecha', { ascending: false }).limit(250),
  ]) : [empty, empty, empty, empty]

  const bankAccounts = (banksResult.data ?? []) as BankAccount[]
  const imports = (importsResult.data ?? []) as ImportBatch[]
  const movements = (movementsResult.data ?? []) as BankMovement[]
  const accountOptions: ImportOption[] = (accountsResult.data ?? []).map((account) => ({ id: account.id, label: `${account.codigo} · ${account.nombre}` }))
  const bankOptions: ImportOption[] = bankAccounts.filter((item) => item.activa).map((account) => ({ id: account.id, label: `${account.banco} · ${account.tipo_cuenta} · ${account.numero_enmascarado}` }))
  const errors = [companiesError, banksResult.error, accountsResult.error, importsResult.error, movementsResult.error].filter(Boolean)
  const pending = movements.filter((item) => item.estado === 'Pendiente')
  const reconciled = movements.filter((item) => item.estado === 'Conciliado')
  const pendingAmount = pending.reduce((sum, item) => sum + Number(item.cargo || item.abono || 0), 0)

  return (
    <div className="mx-auto max-w-[1450px]">
      <ModulePageHeader eyebrow="Contabilidad · Ingreso masivo" title="RCV y cartolas bancarias" description="Importación CSV trazable, deduplicación por huella y conciliación automática sólo cuando existe una coincidencia exacta y única." help="La importación no sustituye la revisión de documentos ni la correcta imputación contable. Los registros ambiguos o no conciliados permanecen pendientes." actions={<CompanySelector companies={companies} selectedId={selectedCompany?.id} />} />

      {errors.length > 0 && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">Parte de las importaciones no pudo cargarse. Confirme la migración contable.</div>}
      {!selectedCompany ? <Empty text="No hay empresas disponibles." /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <Metric icon="upload" label="Importaciones" value={imports.length.toString()} help="Cantidad de lotes RCV y cartolas procesados para la empresa." />
          <Metric icon="clock" label="Movimientos pendientes" value={`${pending.length} · ${formatCurrency(pendingAmount)}`} help="Cantidad y suma absoluta de cargos o abonos que aún no tienen conciliación confirmada." />
          <Metric icon="check" label="Conciliados" value={reconciled.length.toString()} help="Movimientos bancarios asociados a un asiento mediante coincidencia exacta o revisión confirmada." />
        </section>

        <div className="mt-7 grid gap-6 xl:grid-cols-3">
          <Panel icon="building" title="Cuenta bancaria" help="Asocia una cuenta bancaria real con una cuenta imputable del plan contable."><BankAccountForm companyId={selectedCompany.id} accounts={accountOptions} /></Panel>
          <Panel icon="upload" title="Importar RCV" help="Importa compras o ventas. Una huella de contenido evita insertar nuevamente el mismo documento."><RcvImportForm companyId={selectedCompany.id} /></Panel>
          <Panel icon="money" title="Importar cartola" help="Importa cargos, abonos, referencias y saldo. Los movimientos quedan pendientes hasta conciliación.">{bankOptions.length === 0 ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Cree primero una cuenta bancaria.</p> : <BankCsvImportForm companyId={selectedCompany.id} bankAccounts={bankOptions} />}</Panel>
        </div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name="check" className="h-5 w-5" /></span><div><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Conciliación exacta <InfoTip>Se concilia automáticamente sólo cuando fecha y monto coinciden con un único asiento contabilizado. Si hay cero o varias coincidencias, el movimiento queda pendiente.</InfoTip></h2><p className="mt-1 text-sm leading-6 text-slate-500">Ejecute por cuenta bancaria después de importar y contabilizar los asientos relacionados.</p></div></div><div className="mt-5 flex flex-wrap gap-2">{bankAccounts.filter((item) => item.activa).map((account) => <form key={account.id} action={conciliarMovimientosExactos}><input type="hidden" name="empresa_id" value={selectedCompany.id} /><input type="hidden" name="cuenta_bancaria_id" value={account.id} /><button className="h-10 rounded-xl bg-[#0f2438] px-4 text-xs font-black text-white">Conciliar {account.banco} {account.numero_enmascarado}</button></form>)}</div></section>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Movimientos bancarios <InfoTip>Cargo representa salida de fondos; Abono representa entrada. Saldo es el valor informado por el banco y no se recalcula en esta tabla.</InfoTip></h2><p className="mt-1 text-sm text-slate-500">Últimos 250 movimientos importados.</p></div><div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase text-slate-500"><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Cuenta</th><th className="px-4 py-3">Descripción</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3 text-right"><CalculationLabel label="Cargo" help="Salida de fondos informada en la cartola." /></th><th className="px-4 py-3 text-right"><CalculationLabel label="Abono" help="Entrada de fondos informada en la cartola." /></th><th className="px-4 py-3 text-right"><CalculationLabel label="Saldo" help="Saldo informado por el banco después del movimiento." /></th><th className="px-4 py-3">Estado</th></tr></thead><tbody>{movements.length === 0 ? <tr><td colSpan={8} className="p-12 text-center text-slate-500">No hay movimientos bancarios.</td></tr> : movements.map((item) => { const account = one(item.cuenta); return <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-bold">{formatDate(item.fecha)}</td><td className="px-4 py-3">{account?.banco} {account?.numero_enmascarado}</td><td className="max-w-sm px-4 py-3 text-slate-600">{item.descripcion}</td><td className="px-4 py-3 text-slate-500">{item.referencia || '—'}</td><td className="px-4 py-3 text-right">{item.cargo ? formatCurrency(item.cargo) : '—'}</td><td className="px-4 py-3 text-right">{item.abono ? formatCurrency(item.abono) : '—'}</td><td className="px-4 py-3 text-right font-bold">{item.saldo === null ? '—' : formatCurrency(item.saldo)}</td><td className="px-4 py-3"><StatusBadge status={item.estado} /></td></tr> })}</tbody></table></div></section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Historial de importaciones <InfoTip>Insertadas son filas nuevas; Duplicadas ya existían según su huella; Rechazadas no cumplieron la validación mínima.</InfoTip></h2><div className="mt-5 grid gap-3">{imports.length === 0 ? <Empty text="No hay importaciones contables." /> : imports.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-black text-[#17324a]">{item.tipo} · {item.nombre_archivo}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(item.created_at, { dateStyle: 'medium', timeStyle: 'short' })} · {item.total_filas} filas</p></div><StatusBadge status={item.estado} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini label="Insertadas" value={item.insertadas} /><Mini label="Duplicadas" value={item.duplicadas} /><Mini label="Rechazadas" value={item.rechazadas} /></div>{item.errores?.length > 0 && <details className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800"><summary className="cursor-pointer font-black">Ver observaciones</summary><div className="mt-2 grid gap-1">{item.errores.slice(0, 10).map((entry, index) => <p key={index}>Fila {entry.fila || '—'}: {entry.error || 'Error no detallado'}</p>)}</div></details>}</article>)}</div></section>
      </>}
    </div>
  )
}

function Metric({ icon, label, value, help }: { icon: 'upload' | 'clock' | 'check'; label: string; value: string; help: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><InfoTip>{help}</InfoTip></div><p className="mt-4 text-xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase text-slate-500">{label}</p></article> }
function Panel({ icon, title, help, children }: { icon: 'building' | 'upload' | 'money'; title: string; help: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><AppIcon name={icon} className="h-6 w-6 text-[#134b78]" /><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">{title}<InfoTip>{help}</InfoTip></h2></div>{children}</section> }
function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-[#0f2438]">{value}</p><p className="text-[11px] font-bold uppercase text-slate-400">{label}</p></div> }
function Empty({ text }: { text: string }) { return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">{text}</div> }
