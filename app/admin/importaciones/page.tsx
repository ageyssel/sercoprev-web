import { AppIcon } from '@/components/AppIcon'
import { createClient } from '@/utils/supabase/server'
import { DataImporter } from '@/app/admin/components/DataImporter'

export const dynamic = 'force-dynamic'

type ClientOption = {
  id: string
  razon_social: string
}

export default async function ImportsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('empresas')
    .select('id, razon_social')
    .eq('es_admin', false)
    .neq('estado_cliente', 'Archivado')
    .order('razon_social')

  const clients = (data ?? []) as ClientOption[]

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Carga estructurada</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Importaciones financieras</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Carga registros por periodo y servicio mediante una plantilla CSV compatible con Excel. La información queda disponible en la ficha administrativa y en el portal del cliente.</p>
      </header>

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar el listado de clientes.</div>}

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3 border-b border-slate-200 pb-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name="upload" className="h-5 w-5" /></span>
          <div><h2 className="text-xl font-black text-[#0f2438]">Importar información de un cliente</h2><p className="mt-1 text-sm leading-6 text-slate-500">Seleccione el cliente, área y trámite; descargue la plantilla y cargue hasta 500 filas por operación.</p></div>
        </div>
        <div className="mt-5"><DataImporter clientes={clients} /></div>
      </section>

      <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-3"><AppIcon name="warning" className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-black">Recomendación de control</h2><p className="mt-1">Revise periodo, descripción, monto y estado antes de importar. Los registros se agregan al historial existente y no reemplazan automáticamente cargas anteriores.</p></div></div>
      </section>
    </div>
  )
}
