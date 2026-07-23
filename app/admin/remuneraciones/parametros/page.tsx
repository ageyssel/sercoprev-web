import { AppIcon } from '@/components/AppIcon'
import { CompanySelector, ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { InfoTip } from '@/components/ui/InfoTip'
import { formatCurrency, formatDate } from '@/lib/format'
import { getOfficialIndicators } from '@/lib/chile-indicators'
import { createClient } from '@/utils/supabase/server'
import { PayrollParametersForm, type PayrollParameterDefaults } from '@/app/admin/components/PayrollForms'

export const dynamic = 'force-dynamic'

type Company = { id: string; razon_social: string; nombre_fantasia: string | null }
type Parameter = { id: string; periodo: string; uf: number; utm: number; ingreso_minimo: number; fuente: string | null; uf_fecha: string | null; utm_periodo: string | null; indicadores_verificados_at: string | null; updated_at: string }

function todayInChile() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export default async function PayrollParametersPage({ searchParams }: { searchParams: Promise<{ empresa?: string; fecha?: string }> }) {
  const params = await searchParams
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? '') ? params.fecha! : todayInChile()
  const supabase = await createClient()
  const { data: companyRows } = await supabase.from('empresas').select('id, razon_social, nombre_fantasia').eq('es_admin', false).order('razon_social')
  const companies = (companyRows ?? []) as Company[]
  const selected = companies.find((item) => item.id === params.empresa) ?? companies[0] ?? null
  const { data: parameterRows, error } = selected
    ? await supabase.from('parametros_remuneraciones').select('id, periodo, uf, utm, ingreso_minimo, fuente, uf_fecha, utm_periodo, indicadores_verificados_at, updated_at').or(`empresa_id.eq.${selected.id},empresa_id.is.null`).order('periodo', { ascending: false }).limit(24)
    : { data: [], error: null }

  let indicators: Awaited<ReturnType<typeof getOfficialIndicators>> | null = null
  let indicatorError: string | null = null
  try {
    indicators = await getOfficialIndicators(selectedDate)
  } catch (caught) {
    console.error('No fue posible obtener UF/UTM oficiales:', caught)
    indicatorError = caught instanceof Error && caught.message.includes('NOT_PUBLISHED') ? 'El SII aún no publica uno de los valores para la fecha seleccionada.' : 'No fue posible consultar la fuente oficial. Puede utilizar un valor previamente verificado y dejar su fuente registrada.'
  }

  const defaults: PayrollParameterDefaults | undefined = indicators ? {
    period: selectedDate.slice(0, 7),
    uf: indicators.uf.valor,
    utm: indicators.utm.valor,
    ufDate: indicators.uf.fecha_referencia,
    utmPeriod: indicators.utm.fecha_referencia,
    sourceUf: indicators.uf.fuente_url,
    sourceUtm: indicators.utm.fuente_url,
    sourceLabel: `UF y UTM: SII, consulta ${selectedDate}. Verificar además ingreso mínimo, topes, AFP, SIS, AFC e Impuesto Único para ${selectedDate.slice(0, 7)}.`,
  } : { period: selectedDate.slice(0, 7) }

  return (
    <div className="mx-auto max-w-[1350px]">
      <ModulePageHeader eyebrow="Remuneraciones · Cumplimiento" title="Parámetros legales" description="Seleccione una fecha y la plataforma obtiene automáticamente la UF diaria y la UTM mensual desde el Servicio de Impuestos Internos. Las fuentes quedan visibles y almacenadas." help="Los parámetros son versionados por mes. Un periodo de remuneraciones sólo puede abrirse cuando existe una configuración para ese mismo mes." actions={<CompanySelector companies={companies} selectedId={selected?.id} />} />

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <form method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <input type="hidden" name="empresa" value={selected?.id ?? ''} />
          <label className="grid flex-1 gap-2 text-sm font-bold text-slate-700"><span className="inline-flex items-center">Fecha de cálculo <InfoTip>La UF es diaria. La UTM corresponde al mes de esta fecha. Para liquidaciones mensuales defina una política interna consistente sobre qué fecha UF se utilizará y consérvela en el parámetro.</InfoTip></span><input type="date" name="fecha" required defaultValue={selectedDate} className="h-11 rounded-xl border border-slate-300 bg-white px-3" /></label>
          <button className="h-11 rounded-xl bg-[#134b78] px-5 text-sm font-black text-white">Consultar valores oficiales</button>
        </form>

        {indicatorError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{indicatorError}</p>}
        {indicators && <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <IndicatorCard type="UF" value={indicators.uf.valor} reference={indicators.uf.fecha_referencia} source={indicators.uf.fuente_url} explanation="Unidad de Fomento oficial para el día exacto seleccionado. Se usa para convertir topes y planes expresados en UF a pesos." />
          <IndicatorCard type="UTM" value={indicators.utm.valor} reference={indicators.utm.fecha_referencia.slice(0, 7)} source={indicators.utm.fuente_url} explanation="Unidad Tributaria Mensual oficial del mes seleccionado. Se usa en cálculos y límites tributarios que la normativa exprese en UTM." />
        </div>}
      </section>

      {!selected ? <Empty /> : <>
        <details open className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><summary className="cursor-pointer list-none text-xl font-black text-[#0f2438] [&::-webkit-details-marker]:hidden">Completar configuración del periodo</summary><p className="mt-2 text-sm leading-6 text-slate-500">UF y UTM se precargan automáticamente. Complete y verifique los demás valores antes de guardar.</p><div className="mt-6 border-t border-slate-200 pt-6"><PayrollParametersForm key={`${selected.id}-${selectedDate}`} companyId={selected.id} defaults={defaults} /></div></details>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-black text-[#0f2438]">Historial de parámetros</h2><p className="mt-1 text-sm text-slate-500">Configuraciones específicas de empresa y globales disponibles para los últimos periodos.</p>{error ? <p className="mt-4 text-sm font-bold text-red-700">No fue posible cargar el historial.</p> : <div className="mt-5 grid gap-3">{((parameterRows ?? []) as Parameter[]).map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-[#17324a]">{item.periodo.slice(0, 7)} · UF {formatCurrency(item.uf)} · UTM {formatCurrency(item.utm)}</p><p className="mt-1 text-xs text-slate-500">Ingreso mínimo {formatCurrency(item.ingreso_minimo)} · actualizado {formatDate(item.updated_at, { dateStyle: 'medium', timeStyle: 'short' })}</p><p className="mt-1 text-xs text-slate-400">{item.fuente || 'Fuente general no registrada'}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${item.indicadores_verificados_at ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{item.indicadores_verificados_at ? 'Indicadores trazados' : 'Revisar trazabilidad'}</span></article>)}</div>}</section>
      </>}
    </div>
  )
}

function IndicatorCard({ type, value, reference, source, explanation }: { type: string; value: number; reference: string; source: string; explanation: string }) { return <article className="rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-[#134b78]">{type} oficial</p><p className="mt-2 text-3xl font-black text-[#0f2438]">{formatCurrency(value)}</p><p className="mt-1 text-xs text-slate-500">Referencia {reference}</p></div><InfoTip>{explanation}</InfoTip></div><a href={source} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#134b78] hover:underline"><AppIcon name="arrow-right" className="h-4 w-4" />Abrir fuente SII</a></article> }
function Empty() { return <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center font-bold text-slate-500">No hay empresas disponibles.</div> }
