import { AppIcon } from '@/components/AppIcon'
import { ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { CalculationLabel, InfoTip } from '@/components/ui/InfoTip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string }
type Period = { id: string; periodo: string; estado: string }
type AccountRelation = { id: string; codigo: string; nombre: string; tipo: string; naturaleza: string } | Array<{ id: string; codigo: string; nombre: string; tipo: string; naturaleza: string }> | null
type EntryRelation = { numero: number; fecha: string; glosa: string; tipo: string; estado: string } | Array<{ numero: number; fecha: string; glosa: string; tipo: string; estado: string }> | null
type Movement = { id: string; debe: number; haber: number; glosa: string | null; cuenta: AccountRelation; asiento: EntryRelation }
type AccountSummary = { id: string; code: string; name: string; type: string; nature: string; debit: number; credit: number; balance: number; debtorBalance: number; creditorBalance: number }

const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value
const explanations: Record<string, string> = {
  Ingresos: 'Suma del saldo acreedor de las cuentas clasificadas como Ingreso: Haber menos Debe, sin considerar saldos negativos.',
  Gastos: 'Suma del saldo deudor de las cuentas clasificadas como Gasto: Debe menos Haber, sin considerar saldos negativos.',
  'Resultado del periodo': 'Ingresos menos Gastos. Un valor positivo representa utilidad contable; uno negativo, pérdida.',
  Activos: 'Suma de saldos de las cuentas clasificadas como Activo. La calidad del resultado depende de su correcta naturaleza y clasificación.',
  Pasivos: 'Suma del saldo acreedor de cuentas clasificadas como Pasivo: Haber menos Debe.',
  Patrimonio: 'Suma del saldo acreedor de cuentas clasificadas como Patrimonio: Haber menos Debe.',
  Resultado: 'Resultado del periodo incorporado para comprobar la ecuación contable.',
  'Diferencia de ecuación': 'Activos menos Pasivos, Patrimonio y Resultado. Debe ser cero cuando la clasificación, apertura y cierres son consistentes.',
}

export default async function AccountingReportsPage({ searchParams }: { searchParams: Promise<{ empresa?: string; periodo?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows, error: companiesError } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selectedCompany = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const { data: periodRows, error: periodsError } = selectedCompany
    ? await supabase.from('periodos_contables').select('id, periodo, estado').eq('empresa_id', selectedCompany.id).order('periodo', { ascending: false }).limit(60)
    : { data: [], error: null }
  const periods = (periodRows ?? []) as Period[]
  const selectedPeriod = periods.find((item) => item.periodo.slice(0, 7) === params.periodo) ?? periods[0] ?? null

  let movementQuery = supabase
    .from('movimientos_contables')
    .select('id, debe, haber, glosa, cuenta:plan_cuentas!inner(id, codigo, nombre, tipo, naturaleza, empresa_id), asiento:asientos_contables!inner(numero, fecha, glosa, tipo, estado, empresa_id, periodo_id)')
    .eq('cuenta.empresa_id', selectedCompany?.id ?? '00000000-0000-0000-0000-000000000000')
    .eq('asiento.empresa_id', selectedCompany?.id ?? '00000000-0000-0000-0000-000000000000')
    .eq('asiento.estado', 'Contabilizado')
    .order('created_at')
    .limit(10000)
  if (selectedPeriod) movementQuery = movementQuery.eq('asiento.periodo_id', selectedPeriod.id)
  const { data: movementRows, error: movementsError } = selectedCompany ? await movementQuery : { data: [], error: null }
  const movements = (movementRows ?? []) as Movement[]

  const summaries = new Map<string, AccountSummary>()
  for (const movement of movements) {
    const account = one(movement.cuenta)
    if (!account) continue
    const current = summaries.get(account.id) ?? { id: account.id, code: account.codigo, name: account.nombre, type: account.tipo, nature: account.naturaleza, debit: 0, credit: 0, balance: 0, debtorBalance: 0, creditorBalance: 0 }
    current.debit += Number(movement.debe || 0)
    current.credit += Number(movement.haber || 0)
    current.balance = current.debit - current.credit
    current.debtorBalance = Math.max(0, current.balance)
    current.creditorBalance = Math.max(0, -current.balance)
    summaries.set(account.id, current)
  }

  const accounts = [...summaries.values()].sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }))
  const totalDebit = accounts.reduce((sum, item) => sum + item.debit, 0)
  const totalCredit = accounts.reduce((sum, item) => sum + item.credit, 0)
  const income = accounts.filter((item) => item.type === 'Ingreso').reduce((sum, item) => sum + Math.max(0, item.credit - item.debit), 0)
  const expenses = accounts.filter((item) => item.type === 'Gasto').reduce((sum, item) => sum + Math.max(0, item.debit - item.credit), 0)
  const result = income - expenses
  const assets = accounts.filter((item) => item.type === 'Activo').reduce((sum, item) => sum + item.balance, 0)
  const liabilities = accounts.filter((item) => item.type === 'Pasivo').reduce((sum, item) => sum + Math.max(0, item.credit - item.debit), 0)
  const equity = accounts.filter((item) => item.type === 'Patrimonio').reduce((sum, item) => sum + Math.max(0, item.credit - item.debit), 0)
  const balanceDifference = assets - (liabilities + equity + result)
  const errors = [companiesError, periodsError, movementsError].filter(Boolean)

  return (
    <div className="mx-auto max-w-[1500px]">
      <ModulePageHeader eyebrow="Contabilidad · Libros e informes" title="Reportes contables" description="Balance de comprobación, libro mayor, estado de resultados y balance clasificado construidos exclusivamente desde asientos contabilizados." help="Estos reportes son dinámicos y dependen de la clasificación del plan de cuentas. No sustituyen notas explicativas ni estados financieros formalmente emitidos." />

      <form method="get" className="mt-7 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1.3fr_1fr_auto] sm:items-end sm:p-6">
        <label className="grid gap-2 text-sm font-bold text-slate-700">Empresa<select name="empresa" defaultValue={selectedCompany?.id ?? ''} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">{companies.map((company) => <option key={company.id} value={company.id}>{company.nombre_fantasia || company.razon_social} · {company.rut}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Periodo<select name="periodo" defaultValue={selectedPeriod?.periodo.slice(0, 7) ?? ''} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"><option value="">Todos</option>{periods.map((period) => <option key={period.id} value={period.periodo.slice(0, 7)}>{period.periodo.slice(0, 7)} · {period.estado}</option>)}</select></label>
        <button className="h-11 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white">Generar</button>
      </form>

      {errors.length > 0 && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar todos los movimientos contables.</div>}
      {!selectedCompany ? <Empty text="No hay empresas disponibles." /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon="tasks" label="Movimientos" value={movements.length.toString()} help="Cantidad de líneas contables incluidas en el filtro." />
          <Metric icon="money" label="Debe" value={formatCurrency(totalDebit)} help="Suma de todos los cargos de los movimientos contabilizados." />
          <Metric icon="money" label="Haber" value={formatCurrency(totalCredit)} help="Suma de todos los abonos de los movimientos contabilizados." />
          <Metric icon="check" label="Diferencia diario" value={formatCurrency(totalDebit - totalCredit)} help="Debe total menos Haber total. Debe ser cero para un diario cuadrado." />
        </section>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Balance de comprobación y saldos <InfoTip>Suma débitos y créditos por cuenta. Saldo deudor = máximo entre Debe menos Haber y cero. Saldo acreedor = máximo entre Haber menos Debe y cero.</InfoTip></h2><p className="mt-1 text-sm text-slate-500">Periodo {selectedPeriod?.periodo.slice(0, 7) || 'acumulado'} · sólo asientos contabilizados.</p></div><StatusBadge status={Math.abs(totalDebit - totalCredit) < 0.5 ? 'Cuadrado' : 'Descuadrado'} /></div>
          <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase text-slate-500"><th className="px-4 py-3">Código</th><th className="px-4 py-3">Cuenta</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right"><CalculationLabel label="Debe" help="Suma de cargos de la cuenta." /></th><th className="px-4 py-3 text-right"><CalculationLabel label="Haber" help="Suma de abonos de la cuenta." /></th><th className="px-4 py-3 text-right"><CalculationLabel label="Saldo deudor" help="Debe menos Haber cuando el resultado es positivo." /></th><th className="px-4 py-3 text-right"><CalculationLabel label="Saldo acreedor" help="Haber menos Debe cuando el resultado es positivo." /></th></tr></thead><tbody>{accounts.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-slate-500">No hay movimientos contabilizados para el filtro.</td></tr> : accounts.map((account) => <tr key={account.id} className="border-t border-slate-100"><td className="px-4 py-3 font-black text-[#134b78]">{account.code}</td><td className="px-4 py-3 font-bold text-[#17324a]">{account.name}</td><td className="px-4 py-3"><StatusBadge status={account.type} /></td><td className="px-4 py-3 text-right">{formatCurrency(account.debit)}</td><td className="px-4 py-3 text-right">{formatCurrency(account.credit)}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(account.debtorBalance)}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(account.creditorBalance)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 border-slate-300 bg-slate-50 font-black"><td colSpan={3} className="px-4 py-4">Totales</td><td className="px-4 py-4 text-right">{formatCurrency(totalDebit)}</td><td className="px-4 py-4 text-right">{formatCurrency(totalCredit)}</td><td className="px-4 py-4 text-right">{formatCurrency(accounts.reduce((sum, item) => sum + item.debtorBalance, 0))}</td><td className="px-4 py-4 text-right">{formatCurrency(accounts.reduce((sum, item) => sum + item.creditorBalance, 0))}</td></tr></tfoot></table></div>
        </section>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <ReportCard title="Estado de resultados" rows={[['Ingresos', income], ['Gastos', expenses], ['Resultado del periodo', result]]} />
          <ReportCard title="Balance clasificado resumido" rows={[['Activos', assets], ['Pasivos', liabilities], ['Patrimonio', equity], ['Resultado', result], ['Diferencia de ecuación', balanceDifference]]} warning={Math.abs(balanceDifference) >= 0.5 ? 'La ecuación contable no cierra con la clasificación actual. Revise cuentas de resultado, apertura y cierre.' : null} />
        </div>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Libro mayor detallado <InfoTip>Ordena los movimientos por código de cuenta y fecha, conservando su asiento y glosa de origen.</InfoTip></h2><p className="mt-1 text-sm text-slate-500">Secuencia de movimientos por cuenta y asiento.</p></div><div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs font-black uppercase text-slate-500"><th className="px-4 py-3">Cuenta</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Asiento</th><th className="px-4 py-3">Glosa</th><th className="px-4 py-3 text-right">Debe</th><th className="px-4 py-3 text-right">Haber</th></tr></thead><tbody>{movements.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">Sin movimientos.</td></tr> : [...movements].sort((a, b) => { const accountA = one(a.cuenta)?.codigo ?? ''; const accountB = one(b.cuenta)?.codigo ?? ''; const byAccount = accountA.localeCompare(accountB, 'es', { numeric: true }); if (byAccount !== 0) return byAccount; return (one(a.asiento)?.fecha ?? '').localeCompare(one(b.asiento)?.fecha ?? '') }).map((movement) => { const account = one(movement.cuenta); const entry = one(movement.asiento); return <tr key={movement.id} className="border-t border-slate-100"><td className="px-4 py-3"><p className="font-black text-[#134b78]">{account?.codigo}</p><p className="text-xs text-slate-500">{account?.nombre}</p></td><td className="px-4 py-3">{formatDate(entry?.fecha)}</td><td className="px-4 py-3 font-bold">N° {entry?.numero} · {entry?.tipo}</td><td className="max-w-md px-4 py-3 text-slate-600">{movement.glosa || entry?.glosa}</td><td className="px-4 py-3 text-right">{movement.debe ? formatCurrency(movement.debe) : '—'}</td><td className="px-4 py-3 text-right">{movement.haber ? formatCurrency(movement.haber) : '—'}</td></tr> })}</tbody></table></div></section>

        <section className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><p className="font-black">Alcance del informe</p><p className="mt-1">Los resultados dependen de la correcta clasificación del plan de cuentas, de asientos contabilizados y de procesos de cierre completos. No sustituyen revisión profesional, notas explicativas ni estados financieros formalmente emitidos.</p></section>
      </>}
    </div>
  )
}

function Metric({ icon, label, value, help }: { icon: 'tasks' | 'money' | 'check'; label: string; value: string; help: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><InfoTip>{help}</InfoTip></div><p className="mt-4 text-xl font-black text-[#0f2438]">{value}</p><p className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</p></article> }
function ReportCard({ title, rows, warning }: { title: string; rows: Array<[string, number]>; warning?: string | null }) { return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">{title}<InfoTip>{title === 'Estado de resultados' ? 'Presenta ingresos, gastos y su diferencia para el periodo filtrado.' : 'Compara Activos con Pasivos, Patrimonio y Resultado usando la clasificación del plan de cuentas.'}</InfoTip></h2><div className="mt-5 grid gap-3">{rows.map(([label, value], index) => <div key={label} className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 ${index === rows.length - 1 ? 'bg-[#0f2438] text-white' : 'bg-slate-50'}`}><span className="inline-flex items-center font-bold">{label}<InfoTip>{explanations[label] ?? 'Valor calculado desde los saldos de las cuentas clasificadas para este reporte.'}</InfoTip></span><span className="font-black">{formatCurrency(value)}</span></div>)}</div>{warning && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-800">{warning}</p>}</section> }
function Empty({ text }: { text: string }) { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500">{text}</div> }
