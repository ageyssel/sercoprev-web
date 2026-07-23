import { AppIcon } from '@/components/AppIcon'
import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createClient } from '@/utils/supabase/server'
import { AccountForm, AccountingPeriodForm, CostCenterForm, type AccountingOption } from '@/app/admin/components/AccountingForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null }
type Account = { id: string; codigo: string; nombre: string; tipo: string; naturaleza: string; nivel: number; imputable: boolean; activo: boolean }
type Period = { id: string; periodo: string; estado: string }
type Center = { id: string; codigo: string; nombre: string; activo: boolean }

export default async function AccountingConfigurationPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const [accountsResult, periodsResult, centersResult] = selected ? await Promise.all([
    supabase.from('plan_cuentas').select('id, codigo, nombre, tipo, naturaleza, nivel, imputable, activo').eq('empresa_id', selected.id).order('codigo').limit(1000),
    supabase.from('periodos_contables').select('id, periodo, estado').eq('empresa_id', selected.id).order('periodo', { ascending: false }).limit(60),
    supabase.from('centros_costo').select('id, codigo, nombre, activo').eq('empresa_id', selected.id).order('codigo'),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
  const accounts = (accountsResult.data ?? []) as Account[]
  const periods = (periodsResult.data ?? []) as Period[]
  const centers = (centersResult.data ?? []) as Center[]
  const parentOptions: AccountingOption[] = accounts.filter((item) => item.activo).map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}` }))
  const hasError = Boolean(accountsResult.error || periodsResult.error || centersResult.error)

  return (
    <div className="mx-auto max-w-[1400px]">
      <ModulePageHeader eyebrow="Contabilidad · Base maestra" title="Configuración contable" description="Defina la estructura que utilizarán los asientos, importaciones y reportes. Esta pantalla concentra sólo datos maestros, no movimientos." help="Cambiar clasificación o naturaleza de una cuenta después de contabilizar puede alterar la presentación de informes históricos. Revise antes de usarla." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />
      {hasError && <ErrorBox />}
      {!selected ? <Empty /> : <>
        <section className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Cuentas activas" value={accounts.filter((item) => item.activo).length} /><Metric label="Cuentas imputables" value={accounts.filter((item) => item.activo && item.imputable).length} /><Metric label="Centros de costo" value={centers.filter((item) => item.activo).length} /></section>

        <div className="mt-7 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Plan de cuentas <InfoTip>Las cuentas agrupadoras estructuran el árbol; sólo las cuentas imputables reciben movimientos. Tipo y naturaleza determinan cómo se presentan saldos.</InfoTip></h2><p className="mt-1 text-sm text-slate-500">Activo, Pasivo, Patrimonio, Ingreso y Gasto.</p></div></div><details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer list-none font-black text-[#134b78] [&::-webkit-details-marker]:hidden">+ Crear cuenta</summary><div className="mt-5"><AccountForm companyId={selected.id} parentAccounts={parentOptions} /></div></details><div className="mt-5 max-h-[620px] overflow-auto rounded-2xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase text-slate-500"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Cuenta</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Naturaleza</th></tr></thead><tbody>{accounts.length === 0 ? <tr><td colSpan={4} className="p-10 text-center text-slate-500">Sin plan de cuentas.</td></tr> : accounts.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-black text-[#134b78]">{item.codigo}</td><td className="px-4 py-3"><p className="font-bold text-[#17324a]">{item.nombre}</p><p className="text-xs text-slate-400">Nivel {item.nivel} · {item.imputable ? 'Imputable' : 'Agrupadora'} · {item.activo ? 'Activa' : 'Inactiva'}</p></td><td className="px-4 py-3"><StatusBadge status={item.tipo} /></td><td className="px-4 py-3">{item.naturaleza}</td></tr>)}</tbody></table></div></section>

          <div className="grid content-start gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Centros de costo <InfoTip>Permiten segmentar ingresos y gastos por sucursal, área, proyecto u otra dimensión de gestión.</InfoTip></h2><div className="mt-5"><CostCenterForm companyId={selected.id} /></div><div className="mt-5 flex flex-wrap gap-2">{centers.length === 0 ? <p className="text-sm text-slate-500">No hay centros de costo.</p> : centers.map((center) => <span key={center.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{center.codigo} · {center.nombre}</span>)}</div></section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="inline-flex items-center text-xl font-black text-[#0f2438]">Periodos contables <InfoTip>Un periodo abierto recibe asientos. El cierre debe realizarse después de conciliaciones, provisiones, depreciaciones y revisiones correspondientes.</InfoTip></h2><div className="mt-5"><AccountingPeriodForm companyId={selected.id} /></div><div className="mt-5 grid gap-2">{periods.map((period) => <div key={period.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"><span className="font-bold text-[#17324a]">{period.periodo.slice(0, 7)}</span><StatusBadge status={period.estado} /></div>)}</div></section>
          </div>
        </div>
      </>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</p></article> }
function ErrorBox() { return <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar toda la configuración contable.</div> }
function Empty() { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">No hay empresas disponibles.</div> }
