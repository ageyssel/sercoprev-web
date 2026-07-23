import { InfoTip } from '@/components/ui/InfoTip'

export function ModulePageHeader({ eyebrow, title, description, help, actions }: { eyebrow: string; title: string; description: string; help?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">{eyebrow}</p>
        <h1 className="mt-2 inline-flex items-center text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">{title}{help && <InfoTip title={`Acerca de ${title}`}>{help}</InfoTip>}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {actions}
    </header>
  )
}

export function CompanySelector({ companies, selectedId }: { companies: Array<{ id: string; razon_social: string; nombre_fantasia: string | null }>; selectedId?: string | null }) {
  return (
    <form method="get" className="flex gap-2">
      <select name="empresa" defaultValue={selectedId ?? ''} className="h-11 min-w-[280px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">
        {companies.map((company) => <option key={company.id} value={company.id}>{company.nombre_fantasia || company.razon_social}</option>)}
      </select>
      <button className="h-11 rounded-xl bg-[#0f2438] px-5 text-sm font-black text-white">Abrir</button>
    </form>
  )
}
