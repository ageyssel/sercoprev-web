import { AppIcon } from '@/components/AppIcon'
import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { formatCurrency, formatDate } from '@/lib/format'
import { buildMonthlyTaxBrackets, getOfficialIndicators } from '@/lib/chile-indicators'
import { getAutomaticPayrollDefaults } from '@/lib/official-data'
import { createClient } from '@/utils/supabase/server'
import { OfficialPayrollParametersForm, type OfficialPayrollParameterDefaults } from '@/app/admin/components/OfficialPayrollParametersForm'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null }
type Parameter = { id: string; periodo: string; uf: number; utm: number; ingreso_minimo: number; fuente: string | null; uf_fecha: string | null; utm_periodo: string | null; indicadores_verificados_at: string | null; parametros_automaticos_at: string | null; updated_at: string }

function todayInChile() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export default async function PayrollParametersPage({ searchParams }: { searchParams: Promise<{ empresa?: string; fecha?: string }> }) {
  const params = await searchParams
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? '') ? params.fecha! : todayInChile()
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const { data: parameterRows, error } = selected
    ? await supabase.from('parametros_remuneraciones').select('id, periodo, uf, utm, ingreso_minimo, fuente, uf_fecha, utm_periodo, indicadores_verificados_at, parametros_automaticos_at, updated_at').or(`empresa_id.eq.${selected.id},empresa_id.is.null`).order('periodo', { ascending: false }).limit(24)
    : { data: [], error: null }

  let indicators: Awaited<ReturnType<typeof getOfficialIndicators>> | null = null
  let automaticPayroll: Awaited<ReturnType<typeof getAutomaticPayrollDefaults>> | null = null
  let indicatorError: string | null = null
  let payrollSourceError: string | null = null

  const [indicatorResult, payrollResult] = await Promise.allSettled([
    getOfficialIndicators(selectedDate),
    getAutomaticPayrollDefaults(selectedDate),
  ])

  if (indicatorResult.status === 'fulfilled') indicators = indicatorResult.value
  else {
    console.error('No fue posible obtener UF/UTM oficiales:', indicatorResult.reason)
    indicatorError = indicatorResult.reason instanceof Error && indicatorResult.reason.message.includes('NOT_PUBLISHED')
      ? 'El SII aún no publica uno de los valores para la fecha seleccionada.'
      : 'No fue posible consultar UF/UTM en la fuente oficial. Puede usar un valor previamente verificado y registrar su fuente.'
  }

  if (payrollResult.status === 'fulfilled') automaticPayroll = payrollResult.value
  else {
    console.error('No fue posible obtener parámetros previsionales resilientes:', payrollResult.reason)
    payrollSourceError = 'No fue posible consultar ni reconstruir los indicadores previsionales. Complete y verifique profesionalmente los campos antes de guardar.'
  }

  const payrollStatusLabel = automaticPayroll?.completeOfficialToday
    ? `PREVIRED: ${automaticPayroll.obtainedCodes.length} campos obtenidos hoy`
    : automaticPayroll
      ? `PREVIRED degradado: ${automaticPayroll.obtainedCodes.length} obtenidos hoy · ${automaticPayroll.degradedCodes.length} históricos · ${automaticPayroll.unavailableCodes.length} no disponibles`
      : null

  const defaults: OfficialPayrollParameterDefaults = {
    period: selectedDate.slice(0, 7),
    uf: indicators?.uf.valor,
    utm: indicators?.utm.valor,
    ufDate: indicators?.uf.fecha_referencia,
    utmPeriod: indicators?.utm.fecha_referencia,
    sourceUf: indicators?.uf.fuente_url,
    sourceUtm: indicators?.utm.fuente_url,
    taxBrackets: indicators ? buildMonthlyTaxBrackets(indicators.utm.valor) : [],
    incomeMinimum: automaticPayroll?.incomeMinimum,
    pensionCapUf: automaticPayroll?.pensionCapUf,
    healthCapUf: automaticPayroll?.healthCapUf,
    unemploymentCapUf: automaticPayroll?.unemploymentCapUf,
    healthRate: automaticPayroll?.healthRate,
    sisEmployerRate: automaticPayroll?.sisEmployerRate,
    unemploymentWorkerIndefiniteRate: automaticPayroll?.unemploymentWorkerIndefiniteRate,
    unemploymentEmployerIndefiniteRate: automaticPayroll?.unemploymentEmployerIndefiniteRate,
    unemploymentEmployerFixedRate: automaticPayroll?.unemploymentEmployerFixedRate,
    afpRates: automaticPayroll?.afpRates,
    payrollSourceName: automaticPayroll?.sourceName,
    payrollSourceUrl: automaticPayroll?.sourceUrl,
    payrollObtainedAt: automaticPayroll?.obtainedAt,
    automaticPayrollAvailable: Boolean(automaticPayroll?.hasUsableValues),
    automaticPayrollComplete: Boolean(automaticPayroll?.completeOfficialToday),
    trackedAdditionalValues: automaticPayroll?.trackedAdditionalValues,
    payrollFieldStates: automaticPayroll?.fieldStates,
    sourceLabel: [
      indicators ? `UF y UTM: SII, consulta ${selectedDate}` : null,
      automaticPayroll?.completeOfficialToday
        ? `Parámetros previsionales: ${automaticPayroll.sourceName}, obtenidos desde fuente oficial para ${automaticPayroll.period.slice(0, 7)}`
        : automaticPayroll?.hasUsableValues
          ? `Parámetros previsionales: consulta PREVIRED degradada; revisar la procedencia indicada en cada campo antes de guardar`
          : null,
      indicators ? 'Tramos mensuales de Impuesto Único derivados desde la UTM oficial' : null,
    ].filter(Boolean).join('. '),
  }

  return (
    <div className="mx-auto max-w-[1350px]">
      <ModulePageHeader eyebrow="Remuneraciones · Cumplimiento" title="Parámetros legales" description="La plataforma consulta, versiona y precarga valores generales publicados por SII y PREVIRED. Cada parámetro previsional informa si fue obtenido hoy, recuperado del historial de forma degradada o no está disponible; la aprobación antes de guardar siempre es humana." help="Los parámetros son versionados por mes. Un periodo de remuneraciones sólo puede abrirse cuando existe una configuración para ese mismo mes." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <form method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <input type="hidden" name="empresa" value={selected?.id ?? ''} />
          <label className="grid flex-1 gap-2 text-sm font-bold text-slate-700"><span className="inline-flex items-start">Fecha de cálculo <InfoTip>La UF es diaria. La UTM y los demás parámetros se aplican al mes de esta fecha. PREVIRED se consulta por campo; si un dato falla, el historial se usa únicamente como referencia degradada y nunca como valor actual.</InfoTip></span><input type="date" name="fecha" required defaultValue={selectedDate} className="h-11 rounded-xl border border-slate-300 bg-white px-3" /></label>
          <button className="h-11 rounded-xl bg-[#134b78] px-5 text-sm font-black text-white">Consultar y sincronizar</button>
        </form>

        {indicatorError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{indicatorError}</p>}
        {payrollSourceError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{payrollSourceError}</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {indicators && <IndicatorCard type="UF" value={indicators.uf.valor} reference={indicators.uf.fecha_referencia} source={indicators.uf.fuente_url} sourceName="SII" explanation="Unidad de Fomento oficial para el día exacto seleccionado. Se usa para convertir topes y planes expresados en UF a pesos." />}
          {indicators && <IndicatorCard type="UTM" value={indicators.utm.valor} reference={indicators.utm.fecha_referencia.slice(0, 7)} source={indicators.utm.fuente_url} sourceName="SII" explanation="Unidad Tributaria Mensual oficial del mes seleccionado. Además sirve para construir los ocho tramos mensuales del Impuesto Único." />}
          {automaticPayroll && <PayrollSourceCard payroll={automaticPayroll} statusLabel={payrollStatusLabel ?? ''} />}
        </div>
      </section>

      {!selected ? <Empty /> : <>
        <details open className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><summary className="cursor-pointer list-none text-xl font-black text-[#0f2438] [&::-webkit-details-marker]:hidden">Configuración del periodo</summary><p className="mt-2 text-sm leading-6 text-slate-500">Los parámetros disponibles se precargan con su estado de procedencia. Revise especialmente cualquier valor histórico degradado o no disponible antes de guardar.</p><div className="mt-6 border-t border-slate-200 pt-6"><OfficialPayrollParametersForm key={`${selected.id}-${selectedDate}`} companyId={selected.id} defaults={defaults} /></div></details>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-black text-[#0f2438]">Historial de parámetros</h2><p className="mt-1 text-sm text-slate-500">Configuraciones específicas de empresa y globales disponibles para los últimos periodos.</p>{error ? <p className="mt-4 text-sm font-bold text-red-700">No fue posible cargar el historial.</p> : <div className="mt-5 grid gap-3">{((parameterRows ?? []) as Parameter[]).map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-[#17324a]">{item.periodo.slice(0, 7)} · UF {formatCurrency(item.uf)} · UTM {formatCurrency(item.utm)}</p><p className="mt-1 text-xs text-slate-500">Ingreso mínimo {formatCurrency(item.ingreso_minimo)} · actualizado {formatDate(item.updated_at, { dateStyle: 'medium', timeStyle: 'short' })}</p><p className="mt-1 text-xs text-slate-400">{item.fuente || 'Fuente general no registrada'}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${item.indicadores_verificados_at && item.parametros_automaticos_at ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{item.indicadores_verificados_at && item.parametros_automaticos_at ? 'Fuentes automáticas trazadas' : 'Revisar trazabilidad'}</span></article>)}</div>}</section>
      </>}
    </div>
  )
}

function PayrollSourceCard({ payroll, statusLabel }: { payroll: Awaited<ReturnType<typeof getAutomaticPayrollDefaults>>; statusLabel: string }) {
  const className = payroll.completeOfficialToday
    ? 'border-emerald-200 bg-emerald-50'
    : payroll.hasUsableValues
      ? 'border-amber-200 bg-amber-50'
      : 'border-red-200 bg-red-50'
  const accent = payroll.completeOfficialToday ? 'text-emerald-700' : payroll.hasUsableValues ? 'text-amber-800' : 'text-red-700'

  return (
    <article className={`rounded-2xl border p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-wide ${accent}`}>{payroll.completeOfficialToday ? 'Previsión oficial obtenida hoy' : payroll.hasUsableValues ? 'Previsión degradada' : 'Previsión no disponible'}</p>
          <p className="mt-2 text-xl font-black text-[#0f2438]">{payroll.period.slice(0, 7)}</p>
          <p className="mt-1 text-xs text-slate-600">{statusLabel}</p>
          {!payroll.completeOfficialToday && payroll.degradedCodes.length > 0 && <p className="mt-2 text-xs font-bold text-amber-800">Los valores históricos son referencias no verificadas para este período.</p>}
        </div>
        <InfoTip>El estado se calcula por campo. Un fallo en SIS, una AFP u otro indicador no elimina los valores que sí pudieron obtenerse desde la fuente.</InfoTip>
      </div>
      <a href={payroll.sourceUrl} target="_blank" rel="noreferrer" className={`mt-4 inline-flex items-center gap-2 text-xs font-black hover:underline ${accent}`}><AppIcon name="arrow-right" className="h-4 w-4" />Abrir fuente PREVIRED</a>
    </article>
  )
}

function IndicatorCard({ type, value, reference, source, sourceName, explanation }: { type: string; value: number; reference: string; source: string; sourceName: string; explanation: string }) { return <article className="rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-[#134b78]">{type} oficial</p><p className="mt-2 text-3xl font-black text-[#0f2438]">{formatCurrency(value)}</p><p className="mt-1 text-xs text-slate-500">Referencia {reference}</p></div><InfoTip>{explanation}</InfoTip></div><a href={source} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4" />Abrir fuente {sourceName}</a></article> }
function Empty() { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">No hay empresas disponibles.</div> }
