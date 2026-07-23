import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { getOfficialIndicatorDashboard, type OfficialDashboardIndicator } from '@/lib/indicator-dashboard'
import { formatDate } from '@/lib/format'

const SIDEBAR_CODES = ['UF', 'UTM', 'DOLAR_OBSERVADO', 'IPC_VARIACION_ANUAL', 'INGRESO_MINIMO_GENERAL', 'TASA_SIS_EMPLEADOR']
const DASHBOARD_CODES = [
  'UF',
  'UTM',
  'DOLAR_OBSERVADO',
  'EURO',
  'IPC_VARIACION_MENSUAL',
  'IPC_VARIACION_ANUAL',
  'TPM',
  'INGRESO_MINIMO_GENERAL',
  'TOPE_IMPONIBLE_AFP_UF',
  'TOPE_IMPONIBLE_AFC_UF',
  'TASA_SALUD_LEGAL',
  'TASA_SIS_EMPLEADOR',
]

function selectByCodes(indicators: OfficialDashboardIndicator[], codes: string[]) {
  const byCode = new Map(indicators.map((indicator) => [indicator.code, indicator]))
  return codes.map((code) => byCode.get(code)).filter((indicator): indicator is OfficialDashboardIndicator => Boolean(indicator))
}

export async function OfficialIndicatorSidebar({ mobile = false }: { mobile?: boolean }) {
  const dashboard = await getOfficialIndicatorDashboard()
  const indicators = selectByCodes(dashboard.indicators, SIDEBAR_CODES)

  return (
    <section className={`rounded-xl border p-3 ${mobile ? 'border-slate-200 bg-slate-50' : 'border-white/[0.09] bg-white/[0.045]'}`} aria-label="Indicadores oficiales vigentes">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-[9px] font-black uppercase tracking-[0.17em] ${mobile ? 'text-slate-500' : 'text-[#d8bc70]'}`}>Indicadores oficiales</p>
          <p className={`mt-0.5 text-[10px] font-semibold ${mobile ? 'text-slate-500' : 'text-slate-400'}`}>Último valor almacenado</p>
        </div>
        <AppIcon name="money" className={`h-4 w-4 ${mobile ? 'text-[#174f7a]' : 'text-[#e5c979]'}`} />
      </div>

      {indicators.length === 0 ? (
        <p className={`mt-3 text-[10px] font-semibold leading-4 ${mobile ? 'text-amber-700' : 'text-amber-200'}`}>Sin datos sincronizados todavía.</p>
      ) : (
        <div className={`mt-3 divide-y ${mobile ? 'divide-slate-200' : 'divide-white/[0.07]'}`}>
          {indicators.map((indicator) => (
            <div key={indicator.code} className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
              <span className={`min-w-0 truncate text-[10px] font-bold ${mobile ? 'text-slate-600' : 'text-slate-300'}`}>{indicator.shortLabel}</span>
              <span className={`shrink-0 text-[10px] font-black ${mobile ? 'text-[#10283d]' : 'text-white'}`}>{indicator.formattedValue}</span>
            </div>
          ))}
        </div>
      )}

      <Link href="/admin/indicadores" className={`mt-3 flex items-center justify-between rounded-lg px-2.5 py-2 text-[10px] font-extrabold transition ${mobile ? 'bg-white text-[#174f7a] shadow-sm hover:bg-[#edf4f9]' : 'bg-white/[0.06] text-[#e5c979] hover:bg-white/[0.1]'}`}>
        Ver todos y sus fuentes
        <AppIcon name="arrow-right" className="h-3 w-3" />
      </Link>
    </section>
  )
}

export async function OfficialIndicatorsPanel({ full = false }: { full?: boolean }) {
  const dashboard = await getOfficialIndicatorDashboard()
  const indicators = full ? dashboard.indicators : selectByCodes(dashboard.indicators, DASHBOARD_CODES)
  const categories = ['Económicos', 'Previsionales'] as const

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="official-indicators-title">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbfd_0%,#ffffff_60%,#fbf6e8_100%)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10283d] text-[#e5c979] shadow-sm"><AppIcon name="money" className="h-4.5 w-4.5" /></span>
          <div>
            <h2 id="official-indicators-title" className="text-base font-extrabold text-[#10283d]">Indicadores económicos y previsionales</h2>
            <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-slate-500">Valores obtenidos desde fuentes oficiales y almacenados con fecha de referencia. Consultar esta vista no modifica los valores ya fijados en periodos o cálculos.</p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Última sincronización registrada</p>
          <p className="mt-1 text-xs font-extrabold text-[#193247]">{dashboard.updatedAt ? formatDate(dashboard.updatedAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin registro'}</p>
          {!full && <Link href="/admin/indicadores" className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#174f7a] hover:underline">Ver tablero completo <AppIcon name="arrow-right" className="h-3 w-3" /></Link>}
        </div>
      </div>

      {dashboard.hasErrors && <p className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">Una fuente no estuvo disponible. Se muestran los últimos valores almacenados y no se reemplazan por datos vacíos.</p>}

      {indicators.length === 0 ? (
        <div className="p-8 text-center"><p className="text-sm font-bold text-slate-500">Todavía no hay indicadores oficiales almacenados.</p><p className="mt-1 text-xs text-slate-400">La sincronización automática intentará cargarlos en su próxima ejecución.</p></div>
      ) : (
        <div className="grid gap-6 p-5">
          {categories.map((category) => {
            const rows = indicators.filter((indicator) => indicator.category === category)
            if (rows.length === 0) return null
            return (
              <div key={category}>
                <div className="mb-3 flex items-center gap-2"><span className="h-px w-5 bg-[#cfa84b]" /><h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a681d]">{category}</h3></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {rows.map((indicator) => <IndicatorCard key={indicator.code} indicator={indicator} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function IndicatorCard({ indicator }: { indicator: OfficialDashboardIndicator }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,36,56,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{indicator.shortLabel}</p>
          <p className="mt-2 truncate text-xl font-black tracking-[-0.025em] text-[#10283d]">{indicator.formattedValue}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-black ${indicator.category === 'Económicos' ? 'bg-[#edf4f9] text-[#174f7a]' : 'bg-[#fbf6e8] text-[#8a681d]'}`}>{indicator.category === 'Económicos' ? 'ECON' : 'PREV'}</span>
      </div>
      <p className="mt-2 min-h-8 text-[11px] font-semibold leading-4 text-slate-600">{indicator.label}</p>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Referencia</p>
        <p className="mt-1 text-[10px] font-extrabold text-slate-600">{formatDate(indicator.referenceDate)}</p>
        <a href={indicator.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#174f7a] hover:underline">{indicator.sourceName}<AppIcon name="arrow-right" className="h-3 w-3" /></a>
      </div>
    </article>
  )
}
