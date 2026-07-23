import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { ModulePageHeader } from '@/components/admin/ModulePageHeader'
import { OfficialIndicatorsPanel } from '@/components/admin/OfficialIndicatorsDashboard'

export const dynamic = 'force-dynamic'

export default function OfficialIndicatorsPage() {
  return (
    <div className="mx-auto max-w-[1500px]">
      <ModulePageHeader
        eyebrow="Cumplimiento · Fuentes oficiales"
        title="Indicadores oficiales"
        description="Valores económicos y previsionales almacenados con fuente, fecha de referencia y momento de obtención. Los periodos ya procesados conservan los valores utilizados en su cálculo."
        help="La sincronización agrega las nuevas publicaciones al historial. No modifica la UF, UTM, tasas o topes que ya fueron utilizados por un periodo de remuneraciones."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/remuneraciones/parametros" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#10283d] px-3.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#173d59]"><AppIcon name="briefcase" className="h-3.5 w-3.5" />Parámetros legales</Link>
            <Link href="/admin" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-extrabold text-[#193247] shadow-sm hover:border-[#174f7a]/30"><AppIcon name="dashboard" className="h-3.5 w-3.5" />Volver al resumen</Link>
          </div>
        }
      />

      <OfficialIndicatorsPanel full />

      <section className="mt-6 rounded-2xl border border-[#cfa84b]/25 bg-[#fbf6e8] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#8a681d] shadow-sm"><AppIcon name="shield" className="h-4 w-4" /></span>
          <div>
            <h2 className="text-sm font-black text-[#5f4817]">Conservación de valores utilizados</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#75591d]">Consultar una fuente muestra el valor oficial de la fecha solicitada. Cuando una configuración ya está asociada a un periodo, permanece inalterable para evitar cambios retroactivos. Las correcciones posteriores deben registrarse en una nueva configuración o rectificación trazable.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
