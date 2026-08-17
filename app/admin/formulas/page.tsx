import { AppIcon } from '@/components/AppIcon'
import { ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'
import { isPrivilegedAdminRole } from '@/utils/supabase/role-access'
import { guardarBorradorFormula, probarFormula, publicarVersionFormula } from '@/app/admin/formula-actions'

export const dynamic = 'force-dynamic'

type VariableDefinition = { code: string; description?: string }
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

function sampleValue(code: string) {
  if (code.includes('SALARY') || code.includes('EARNINGS') || code.includes('BASE') || code.includes('ALLOWANCE') || code.includes('DEDUCTION') || code.includes('HEALTH_PLAN')) return 750000
  if (code === 'UF') return 40000
  if (code.includes('UF')) return 90
  if (code.includes('RATE')) return 0.07
  if (code.includes('DAYS')) return 30
  if (code.startsWith('IS_') || code.startsWith('HAS_') || code.endsWith('_APPLIES') || code.includes('MODE_MONTHLY')) return 1
  return 1
}

function sampleInputs(variables: VariableDefinition[] | null) {
  return JSON.stringify(
    Object.fromEntries((variables ?? []).map((item) => [item.code, sampleValue(item.code)])),
    null,
    2,
  )
}

export default async function FormulaPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string; test_formula?: string; test_result?: string }> }) {
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
        eyebrow="Remuneraciones · Gobierno del cálculo"
        title="Fórmulas y cálculos"
        description="Biblioteca versionada de las reglas que construyen los cálculos de SERCOPREV. Todo el equipo puede estudiar el origen de un resultado; sólo administradores autorizados pueden crear y publicar nuevas versiones."
        help="Una fórmula publicada nunca se sobrescribe: cualquier modificación genera una versión nueva con vigencia, motivo y auditoría. Los periodos históricos conservan la regla correspondiente a su fecha."
      />

      {params.message && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{params.message}</div>}
      {params.error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{params.error}</div>}
      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">El catálogo de fórmulas aún no está disponible. Verifique que la migración del módulo esté aplicada.</div>}

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        <GuideCard icon="document" title="1. Entender" text="Abra una fórmula y revise qué calcula, qué variables recibe y de qué resultados anteriores depende." />
        <GuideCard icon="settings" title="2. Probar" text="Use valores ficticios para verificar la expresión sin modificar liquidaciones, periodos ni datos de clientes." />
        <GuideCard icon="check" title="3. Versionar y publicar" text="Un cambio se guarda como borrador. Sólo después de revisarlo se publica con fecha de vigencia; la versión anterior queda histórica." />
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a47b24]">Reglas del editor</p>
            <h2 className="mt-2 text-xl font-black text-[#0f2438]">Lenguaje matemático restringido</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Las expresiones no ejecutan JavaScript ni SQL. Sólo aceptan variables declaradas, números, paréntesis y las funciones autorizadas. Esto evita que una fórmula pueda consultar tablas, ejecutar código o modificar información.</p>
          </div>
          <div className="rounded-2xl bg-[#f4f7fa] p-4 text-xs font-bold leading-6 text-slate-600">
            <p className="font-black text-[#10283d]">Funciones permitidas</p>
            <code>MIN · MAX · ROUND · FLOOR · CEIL · ABS · IF · AND · OR · NOT · TAX_BRACKET</code>
            <p className="mt-2">Operadores: + − × ÷ % ^ &lt; &lt;= &gt; &gt;= == !=</p>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-5">
        {formulas.length === 0 && !error ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500">No hay fórmulas configuradas.</div> : formulas.map((formula) => {
          const versions = [...(formula.versions ?? [])].sort((a, b) => b.version - a.version)
          const published = versions.find((item) => item.status === 'Publicada')
          const editableExpression = published?.expression ?? formula.default_expression
          const variables = formula.variables ?? []
          const testResult = params.test_formula === formula.id ? params.test_result : null

          return (
            <article id={`formula-${formula.id}`} key={formula.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#edf4f9] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#174f7a]">{formula.category}</span>
                    {formula.critical && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800">Crítica</span>}
                    {published && <StatusBadge status={`Publicada v${published.version}`} />}
                  </div>
                  <h2 className="mt-3 text-xl font-black text-[#10283d]">{formula.name}</h2>
                  <p className="mt-1 font-mono text-xs font-bold text-slate-400">{formula.code}</p>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{formula.description}</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-slate-200 bg-[#f8fafb] px-4 py-3 text-xs text-slate-600">
                  <p><strong>Unidad:</strong> {formula.unit}</p>
                  <p className="mt-1"><strong>Redondeo:</strong> {formula.rounding}</p>
                  {published && <p className="mt-1"><strong>Vigente desde:</strong> {published.effective_from}</p>}
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Expresión vigente</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-[#10283d] p-4 text-sm font-semibold leading-6 text-slate-100">{editableExpression}</pre>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Variables</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {variables.map((variable) => <div key={variable.code} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><code className="text-xs font-black text-[#174f7a]">{variable.code}</code><p className="mt-1 text-xs leading-5 text-slate-500">{variable.description || 'Variable del motor de cálculo'}</p></div>)}
                  </div>
                </div>

                <div className="grid gap-4">
                  <form action={probarFormula} className="rounded-2xl border border-slate-200 p-4">
                    <input type="hidden" name="formula_id" value={formula.id} />
                    <input type="hidden" name="expression" value={editableExpression} />
                    <label className="text-xs font-black text-[#10283d]">Probar con valores ficticios</label>
                    <textarea name="inputs" defaultValue={sampleInputs(variables)} rows={Math.min(12, Math.max(5, variables.length + 2))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs leading-5 text-slate-700" />
                    {testResult !== null && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-black text-emerald-800">Resultado de prueba: {testResult}</div>}
                    <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-[#174f7a]/20 bg-[#edf4f9] px-4 text-xs font-black text-[#174f7a]"><AppIcon name="settings" className="h-4 w-4" />Ejecutar prueba</button>
                  </form>

                  {canManage && <form action={guardarBorradorFormula} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                    <input type="hidden" name="formula_id" value={formula.id} />
                    <label className="text-xs font-black text-[#10283d]">Crear una nueva versión</label>
                    <textarea name="expression" defaultValue={editableExpression} rows={6} required className="mt-2 w-full rounded-xl border border-amber-200 bg-white p-3 font-mono text-xs leading-5 text-slate-700" />
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-[11px] font-bold text-slate-600">Vigente desde<input name="effective_from" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs" /></label>
                      <label className="text-[11px] font-bold text-slate-600 sm:col-span-2">Motivo del cambio<textarea name="change_reason" required rows={2} maxLength={1000} placeholder="Explique qué cambió y por qué." className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs" /></label>
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-amber-900">Guardar aquí no altera cálculos. La nueva versión queda como borrador hasta que un administrador la revise y publique.</p>
                    <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#10283d] px-4 text-xs font-black text-white"><AppIcon name="document" className="h-4 w-4" />Guardar borrador</button>
                  </form>}
                </div>
              </div>

              <details className="mt-5 rounded-2xl border border-slate-200 bg-[#f8fafb]">
                <summary className="cursor-pointer px-4 py-3 text-xs font-black text-[#10283d]">Historial de versiones ({versions.length})</summary>
                <div className="border-t border-slate-200 p-4">
                  <div className="grid gap-3">
                    {versions.map((version) => <div key={version.id} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#10283d]">Versión {version.version}</strong><StatusBadge status={version.status} /></div><p className="mt-1 text-xs text-slate-500">Vigencia: {version.effective_from}{version.effective_to ? ` → ${version.effective_to}` : ''}</p>{version.change_reason && <p className="mt-2 text-xs leading-5 text-slate-600">{version.change_reason}</p>}</div>{canManage && version.status !== 'Publicada' && version.status !== 'Reemplazada' && <form action={publicarVersionFormula}><input type="hidden" name="version_id" value={version.id} /><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-[10px] font-black text-white"><AppIcon name="check" className="h-3.5 w-3.5" />Publicar versión</button></form>}</div><pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-600">{version.expression}</pre></div>)}
                  </div>
                </div>
              </details>
            </article>
          )
        })}
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#10283d]">Procedimiento obligatorio antes de cambiar una fórmula</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 lg:grid-cols-2">
          <Step n="1" text="Identifique la fórmula exacta y revise sus variables y dependencias." />
          <Step n="2" text="Documente el motivo normativo, contractual u operacional que exige el cambio." />
          <Step n="3" text="Edite sólo la expresión necesaria. No cambie simultáneamente varias reglas sin poder aislar el efecto." />
          <Step n="4" text="Ejecute pruebas con casos normales, montos cero, topes y valores extremos." />
          <Step n="5" text="Compare manualmente al menos un resultado conocido antes de publicar." />
          <Step n="6" text="Defina la fecha de vigencia correcta. Los periodos anteriores continuarán usando la versión histórica." />
          <Step n="7" text="Publique la versión. La anterior pasa a estado Reemplazada y permanece disponible para auditoría." />
          <Step n="8" text="Recalcule sólo periodos abiertos que correspondan a la nueva vigencia; nunca reescriba liquidaciones históricas cerradas." />
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
