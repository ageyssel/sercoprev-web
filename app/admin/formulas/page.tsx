import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  friendlyInputName,
  getFriendlyNumberControls,
  getFriendlyOperationGuide,
  getFriendlyRuleSummary,
  getFriendlyTermControls,
  getFriendlyVariableMeta,
  hasFriendlyRuleEditor,
  type FormulaVariableDefinition,
} from '@/lib/formula-friendly'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'
import { isPrivilegedAdminRole } from '@/utils/supabase/role-access'
import { guardarBorradorFormula, probarFormula, publicarVersionFormula } from '@/app/admin/formula-actions'

export const dynamic = 'force-dynamic'

type VariableDefinition = FormulaVariableDefinition
type VersionRow = {
  id: string
  version: number
  expression: string
  status: string
  effective_from: string
  effective_to: string | null
  change_reason: string | null
  published_at: string | null
  created_at: string
}
type FormulaRow = {
  id: string
  code: string
  name: string
  module: string
  category: string
  description: string
  default_expression: string
  variables: VariableDefinition[] | null
  unit: string
  rounding: string
  critical: boolean
  versions: VersionRow[] | null
}

type SearchParams = {
  message?: string
  error?: string
  test_formula?: string
  test_result?: string
  preview_version?: string
}

function formatResult(value: string | null, unit: string) {
  if (value === null) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  if (unit.toUpperCase() === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(numeric)
  }
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(numeric)
}

function inputUnit(meta: ReturnType<typeof getFriendlyVariableMeta>) {
  if (meta.kind === 'money') return 'Pesos'
  if (meta.kind === 'percent') return 'Porcentaje'
  if (meta.kind === 'days') return 'Días'
  if (meta.kind === 'uf') return 'UF'
  if (meta.kind === 'boolean') return 'Sí / No'
  return 'Número'
}

export default async function FormulaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()
  const context = await resolveUserContext(supabase)
  const canManage = Boolean(context?.kind === 'staff' && isPrivilegedAdminRole(context.role))

  const { data, error } = await supabase
    .from('formula_definitions')
    .select('id, code, name, module, category, description, default_expression, variables, unit, rounding, critical, versions:formula_versions(id, version, expression, status, effective_from, effective_to, change_reason, published_at, created_at)')
    .eq('active', true)
    .order('category')
    .order('name')

  const formulas = (data ?? []) as unknown as FormulaRow[]

  return (
    <div className="mx-auto max-w-[1500px]">
      <ModulePageHeader
        eyebrow="Remuneraciones · Reglas de cálculo"
        title="Fórmulas y cálculos"
        description="Revise y simule cómo SERCOPREV calcula remuneraciones usando conceptos contables, montos, porcentajes, topes y operaciones en lenguaje normal. La programación queda oculta y es administrada internamente por la plataforma."
        help="Cada cambio sigue siendo versionado y auditable. Usted modifica parámetros o conceptos contables; SERCOPREV transforma esos cambios en una regla técnica segura sin exponer código."
      />

      {params.message && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{params.message}</div>}
      {params.error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{params.error}</div>}
      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">El catálogo de reglas aún no está disponible. Verifique que las migraciones del módulo estén aplicadas.</div>}

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        <GuideCard icon="document" title="1. Leer como contador" text="Cada ficha explica qué datos entran, qué se suma, resta, multiplica, divide, compara o topa y qué resultado entrega." />
        <GuideCard icon="settings" title="2. Simular con números" text="Ingrese sueldos, días, porcentajes, topes y otros valores en campos normales. No hay JSON, códigos ni expresiones técnicas." />
        <GuideCard icon="check" title="3. Ajustar sin programar" text="Los administradores cambian porcentajes, divisores o conceptos incluidos. SERCOPREV genera y versiona la regla técnica por debajo." />
      </section>

      <section className="mt-7 rounded-3xl border border-[#174f7a]/15 bg-gradient-to-br from-[#f5f9fc] to-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a47b24]">Modo contable</p>
            <h2 className="mt-2 text-xl font-black text-[#0f2438]">La programación ya no forma parte de la interfaz</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">En esta pantalla se trabaja sólo con conceptos y valores entendibles por remuneraciones, contabilidad y administración. El motor matemático, las variables internas y la sintaxis de programación permanecen protegidos en el backend.</p>
          </div>
          <Link href="/admin/remuneraciones/parametros" className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[#174f7a]/20 bg-white px-4 text-xs font-black text-[#174f7a] shadow-sm">Abrir parámetros legales</Link>
        </div>
      </section>

      <section className="mt-7 grid gap-5">
        {formulas.length === 0 && !error ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500">No hay reglas configuradas.</div> : formulas.map((formula) => {
          const versions = [...(formula.versions ?? [])].sort((a, b) => b.version - a.version)
          const published = versions.find((item) => item.status === 'Publicada')
          const publishedExpression = published?.expression ?? formula.default_expression
          const previewVersion = params.preview_version ? versions.find((item) => item.id === params.preview_version) : undefined
          const simulatorVersion = previewVersion ?? published
          const simulatorExpression = simulatorVersion?.expression ?? formula.default_expression
          const variables = formula.variables ?? []
          const numberControls = getFriendlyNumberControls(formula.code, publishedExpression)
          const termControls = getFriendlyTermControls(formula.code, publishedExpression)
          const editable = hasFriendlyRuleEditor(formula.code, publishedExpression)
          const testResult = params.test_formula === formula.id ? formatResult(params.test_result ?? null, formula.unit) : null
          const operationGuide = getFriendlyOperationGuide(formula.code)

          return (
            <article id={`formula-${formula.id}`} key={formula.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#edf4f9] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#174f7a]">{formula.category}</span>
                    {formula.critical && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800">Regla crítica</span>}
                    {published && <StatusBadge status={`Publicada v${published.version}`} />}
                    {previewVersion && previewVersion.id !== published?.id && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">Simulando v{previewVersion.version}</span>}
                  </div>
                  <h2 className="mt-3 text-xl font-black text-[#10283d]">{formula.name}</h2>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{formula.description}</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-slate-200 bg-[#f8fafb] px-4 py-3 text-xs text-slate-600">
                  <p><strong>Resultado:</strong> {formula.unit === 'CLP' ? 'Pesos chilenos' : formula.unit}</p>
                  <p className="mt-1"><strong>Redondeo:</strong> {formula.rounding}</p>
                  {published && <p className="mt-1"><strong>Vigente desde:</strong> {published.effective_from}</p>}
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[1.02fr_.98fr]">
                <div className="grid gap-5">
                  <section className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-4 sm:p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Cómo se calcula</p>
                    <div className="mt-3 grid gap-3">
                      {operationGuide.map((step, index) => (
                        <div key={`${formula.id}-step-${index}`} className="flex gap-3 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(15,36,56,0.05)]">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10283d] text-[11px] font-black text-white">{index + 1}</span>
                          <p className="text-sm leading-6 text-slate-600">{step}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Datos que intervienen</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {variables.map((variable) => {
                        const meta = getFriendlyVariableMeta(variable)
                        return <div key={variable.code} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-start justify-between gap-3"><strong className="text-xs leading-5 text-[#10283d]">{meta.label}</strong><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500">{inputUnit(meta)}</span></div><p className="mt-1 text-[11px] leading-5 text-slate-500">{meta.help}</p></div>
                      })}
                    </div>
                  </section>
                </div>

                <div className="grid content-start gap-4">
                  <form action={probarFormula} className="rounded-2xl border border-[#174f7a]/15 bg-[#f7fbfe] p-4 sm:p-5">
                    <input type="hidden" name="formula_id" value={formula.id} />
                    {simulatorVersion && <input type="hidden" name="version_id" value={simulatorVersion.id} />}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="text-sm font-black text-[#10283d]">Simular con números</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Los valores son ficticios y no modifican trabajadores ni liquidaciones.</p></div>
                      {previewVersion && previewVersion.id !== published?.id && <Link href={`?${new URLSearchParams({}).toString()}#formula-${formula.id}`} className="text-[10px] font-black text-[#174f7a] underline decoration-[#174f7a]/30 underline-offset-4">Volver a vigente</Link>}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {variables.map((variable) => {
                        const meta = getFriendlyVariableMeta(variable)
                        if (meta.kind === 'boolean') {
                          return <label key={variable.code} className="text-[11px] font-bold text-slate-600">{meta.label}<select name={friendlyInputName(variable.code)} defaultValue={String(meta.sample)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-[#10283d]"><option value="1">Sí</option><option value="0">No</option></select></label>
                        }
                        return <label key={variable.code} className="text-[11px] font-bold text-slate-600">{meta.label}<span className="relative mt-1 block">{meta.prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-black text-slate-400">{meta.prefix}</span>}<input name={friendlyInputName(variable.code)} type="number" required defaultValue={meta.sample} step={meta.step ?? '0.01'} min={meta.min} max={meta.max} className={`h-11 w-full rounded-xl border border-slate-300 bg-white pr-12 text-sm font-bold text-[#10283d] ${meta.prefix ? 'pl-7' : 'pl-3'}`} />{meta.suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] font-black uppercase text-slate-400">{meta.suffix}</span>}</span></label>
                      })}
                    </div>
                    {testResult !== null && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Resultado de la simulación</p><p className="mt-1 text-2xl font-black text-emerald-900">{testResult}</p></div>}
                    <button className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#174f7a] px-4 text-xs font-black text-white"><AppIcon name="settings" className="h-4 w-4" />Calcular ejemplo</button>
                  </form>

                  {canManage && editable && <form action={guardarBorradorFormula} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
                    <input type="hidden" name="formula_id" value={formula.id} />
                    <div><p className="text-sm font-black text-[#10283d]">Ajustar esta regla</p><p className="mt-1 text-[11px] leading-5 text-amber-900">Cambie sólo conceptos o números. SERCOPREV generará internamente la nueva versión técnica.</p></div>

                    {numberControls.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{numberControls.map((control) => <label key={control.name} className="text-[11px] font-bold text-slate-600">{control.label}<span className="relative mt-1 block"><input name={control.name} type="number" required defaultValue={control.value} min={control.min} max={control.max} step={control.step} className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 pr-14 text-sm font-bold text-[#10283d]" />{control.suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] font-black uppercase text-slate-400">{control.suffix}</span>}</span><span className="mt-1 block text-[10px] font-medium leading-4 text-slate-500">{control.help}</span></label>)}</div>}

                    {termControls.length > 0 && <div className="mt-4"><p className="text-[11px] font-black text-[#10283d]">Conceptos incluidos en la operación</p><div className="mt-2 grid gap-2">{termControls.map((term) => <label key={term.code} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3"><span><strong className="block text-xs text-[#10283d]">{term.label}</strong><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{term.operation === 'restar' ? 'Restar del cálculo' : 'Sumar al cálculo'}</span></span><input type="checkbox" name={`include__${term.code}`} value="1" defaultChecked={term.included} className="h-5 w-5 rounded border-slate-300 accent-[#174f7a]" /></label>)}</div></div>}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-[11px] font-bold text-slate-600">Vigente desde<input name="effective_from" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs" /></label>
                      <label className="text-[11px] font-bold text-slate-600 sm:col-span-2">Motivo del cambio<textarea name="change_reason" required rows={2} maxLength={1000} placeholder="Ej.: actualización normativa, cambio de criterio contable o corrección de configuración." className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs" /></label>
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-amber-900">Guardar crea un borrador; no altera liquidaciones ni periodos cerrados. Después podrá simular esa versión antes de publicarla.</p>
                    <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#10283d] px-4 text-xs font-black text-white"><AppIcon name="document" className="h-4 w-4" />Guardar nueva versión</button>
                  </form>}

                  {canManage && !editable && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><p className="text-sm font-black text-[#10283d]">Esta regla no necesita programación manual</p><p className="mt-2 text-xs leading-5 text-slate-600">Sus porcentajes, topes o valores provienen de parámetros legales, datos del contrato o resultados anteriores. Cambie esos valores en su módulo correspondiente y SERCOPREV los utilizará automáticamente en esta operación.</p><Link href="/admin/remuneraciones/parametros" className="mt-3 inline-flex text-xs font-black text-[#174f7a] underline decoration-[#174f7a]/30 underline-offset-4">Ir a parámetros legales</Link></div>}
                </div>
              </div>

              <details className="mt-5 rounded-2xl border border-slate-200 bg-[#f8fafb]">
                <summary className="cursor-pointer px-4 py-3 text-xs font-black text-[#10283d]">Historial de versiones ({versions.length})</summary>
                <div className="border-t border-slate-200 p-4">
                  <div className="grid gap-3">
                    {versions.map((version) => {
                      const summary = getFriendlyRuleSummary(formula.code, version.expression)
                      return <div key={version.id} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#10283d]">Versión {version.version}</strong><StatusBadge status={version.status} /></div><p className="mt-1 text-xs text-slate-500">Vigencia: {version.effective_from}{version.effective_to ? ` → ${version.effective_to}` : ''}</p>{version.change_reason && <p className="mt-2 text-xs leading-5 text-slate-600">Motivo: {version.change_reason}</p>}</div><div className="flex flex-wrap gap-2"><Link href={`?preview_version=${version.id}#formula-${formula.id}`} className="inline-flex h-9 items-center rounded-lg border border-[#174f7a]/20 bg-[#edf4f9] px-3 text-[10px] font-black text-[#174f7a]">Simular versión</Link>{canManage && version.status !== 'Publicada' && version.status !== 'Reemplazada' && <form action={publicarVersionFormula}><input type="hidden" name="version_id" value={version.id} /><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-[10px] font-black text-white"><AppIcon name="check" className="h-3.5 w-3.5" />Publicar</button></form>}</div></div><div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Resumen entendible de la regla</p><ul className="mt-2 grid gap-1.5">{summary.map((item, index) => <li key={`${version.id}-summary-${index}`} className="flex gap-2 text-xs leading-5 text-slate-600"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#174f7a]" />{item}</li>)}</ul></div></div>
                    })}
                  </div>
                </div>
              </details>
            </article>
          )
        })}
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#10283d]">Procedimiento recomendado antes de cambiar un cálculo</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 lg:grid-cols-2">
          <Step n="1" text="Revise qué concepto está calculando y qué datos utiliza." />
          <Step n="2" text="Simule el cálculo vigente con números conocidos y confirme el resultado esperado." />
          <Step n="3" text="Ajuste únicamente el porcentaje, divisor o concepto contable que realmente deba cambiar." />
          <Step n="4" text="Explique el motivo normativo, contractual o contable del cambio y defina su fecha de vigencia." />
          <Step n="5" text="Guarde una nueva versión. La plataforma transforma su configuración en una regla técnica protegida." />
          <Step n="6" text="Simule el borrador con casos normales, valores cero, topes y situaciones extremas." />
          <Step n="7" text="Publique sólo cuando el resultado coincida con el cálculo manual esperado." />
          <Step n="8" text="Los periodos históricos cerrados conservan siempre la versión que les correspondía." />
        </ol>
      </section>
    </div>
  )
}

function GuideCard({ icon, title, text }: { icon: 'document' | 'settings' | 'check'; title: string; text: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4f9] text-[#174f7a]"><AppIcon name={icon} className="h-5 w-5" /></span><h2 className="mt-4 font-black text-[#10283d]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>
}

function Step({ n, text }: { n: string; text: string }) {
  return <li className="flex gap-3 rounded-2xl bg-[#f8fafb] p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10283d] text-xs font-black text-white">{n}</span><span>{text}</span></li>
}
