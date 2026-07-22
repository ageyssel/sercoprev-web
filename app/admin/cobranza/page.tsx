import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate, dueDateLabel } from '@/lib/format'
import { createClient } from '@/utils/supabase/server'
import { cambiarEstadoHonorario } from '@/app/support-actions'

export const dynamic = 'force-dynamic'

type CompanyRelation = { razon_social: string } | Array<{ razon_social: string }> | null
const companyName = (value: CompanyRelation) => Array.isArray(value) ? value[0]?.razon_social ?? 'Sin empresa' : value?.razon_social ?? 'Sin empresa'

type Fee = {
  id: string
  empresa_id: string
  periodo: string
  concepto: string
  monto: number
  fecha_emision: string | null
  fecha_vencimiento: string
  estado: string
  fecha_pago: string | null
  notas: string | null
  empresa: CompanyRelation
}

export default async function CollectionsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('honorarios')
    .select('id, empresa_id, periodo, concepto, monto, fecha_emision, fecha_vencimiento, estado, fecha_pago, notas, empresa:empresas(razon_social)')
    .order('fecha_vencimiento', { ascending: false })
    .limit(250)

  const fees = (data ?? []) as Fee[]
  const pending = fees.filter((item) => item.estado === 'Pendiente')
  const overdue = fees.filter((item) => item.estado === 'Vencido' || (item.estado === 'Pendiente' && item.fecha_vencimiento < today))
  const paid = fees.filter((item) => item.estado === 'Pagado')
  const pendingAmount = pending.reduce((sum, item) => sum + Number(item.monto || 0), 0)
  const overdueAmount = overdue.reduce((sum, item) => sum + Number(item.monto || 0), 0)
  const paidAmount = paid.reduce((sum, item) => sum + Number(item.monto || 0), 0)

  return (
    <div className="mx-auto max-w-[1500px]">
      <header><p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Gestión financiera interna</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Honorarios y cobranza</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Control de cobros profesionales, vencimientos, pagos y cuentas que requieren seguimiento.</p></header>

      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar la información de honorarios.</div>}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pendientes" value={pending.length} detail={formatCurrency(pendingAmount)} icon="clock" tone="gold" />
        <MetricCard label="Vencidos" value={overdue.length} detail={formatCurrency(overdueAmount)} icon="warning" tone={overdue.length ? 'red' : 'green'} />
        <MetricCard label="Pagados" value={paid.length} detail={formatCurrency(paidAmount)} icon="check" tone="green" />
        <MetricCard label="Registros" value={fees.length} detail="Historial visible" icon="money" tone="navy" />
      </section>

      <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6"><h2 className="text-xl font-black text-[#0f2438]">Cartola de honorarios</h2><p className="mt-1 text-sm text-slate-500">Actualice el estado desde esta vista o registre nuevos cobros en la ficha del cliente.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead><tr className="bg-[#f8fafb] text-xs font-black uppercase tracking-[0.12em] text-slate-400"><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Periodo</th><th className="px-5 py-4">Concepto</th><th className="px-5 py-4">Vencimiento</th><th className="px-5 py-4 text-right">Monto</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Actualizar</th></tr></thead>
            <tbody>{fees.length === 0 ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">No hay honorarios registrados.</td></tr> : fees.map((fee) => <tr key={fee.id} className="border-t border-slate-100 align-top"><td className="px-5 py-4"><Link href={`/admin/clientes/${fee.empresa_id}`} className="font-black text-[#17324a] hover:text-[#134b78]">{companyName(fee.empresa)}</Link>{fee.notas && <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{fee.notas}</p>}</td><td className="px-5 py-4 font-bold text-slate-600">{fee.periodo}</td><td className="px-5 py-4 text-slate-600">{fee.concepto}</td><td className="px-5 py-4"><p className="font-bold text-[#17324a]">{formatDate(fee.fecha_vencimiento)}</p><p className="mt-1 text-xs text-slate-500">{fee.estado === 'Pagado' && fee.fecha_pago ? `Pagado ${formatDate(fee.fecha_pago)}` : dueDateLabel(fee.fecha_vencimiento)}</p></td><td className="px-5 py-4 text-right font-black text-[#134b78]">{formatCurrency(fee.monto)}</td><td className="px-5 py-4"><StatusBadge status={fee.estado} /></td><td className="px-5 py-4"><form action={cambiarEstadoHonorario} className="flex gap-2"><input type="hidden" name="id" value={fee.id} /><input type="hidden" name="empresa_id" value={fee.empresa_id} /><select name="estado" defaultValue={fee.estado} className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-bold"><option>Pendiente</option><option>Pagado</option><option>Vencido</option><option>Anulado</option></select><button className="h-9 rounded-lg bg-[#0f2438] px-3 text-xs font-black text-white">Guardar</button></form></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
