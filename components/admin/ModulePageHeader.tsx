import { CompanySearchSelector } from '@/components/admin/CompanySelector'
import type { CompanySelectorOption } from '@/components/admin/CompanySelector'
import { InfoTip } from '@/components/ui/InfoTip'

export function CompanySelector({ companies, selectedId }: { companies: CompanySelectorOption[]; selectedId?: string | null }) {
  return <CompanySearchSelector key={selectedId ?? 'sin-empresa'} companies={companies} selectedId={selectedId} />
}

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
