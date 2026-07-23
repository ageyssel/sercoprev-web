import { CompanySearchSelector } from '@/components/admin/CompanySelector'
import type { CompanySelectorOption } from '@/components/admin/CompanySelector'
import { InfoTip } from '@/components/ui/InfoTip'

export function CompanySelector({ companies, selectedId }: { companies: CompanySelectorOption[]; selectedId?: string | null }) {
  return <CompanySearchSelector key={selectedId ?? 'sin-empresa'} companies={companies} selectedId={selectedId} />
}

export function ModulePageHeader({ eyebrow, title, description, help, actions }: { eyebrow: string; title: string; description: string; help?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-4xl">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-6 bg-[#cfa84b]" />
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8a681d]">{eyebrow}</p>
        </div>
        <h1 className="mt-3 flex items-start text-[2rem] font-extrabold tracking-[-0.035em] text-[#10283d] sm:text-[2.35rem]">
          <span>{title}</span>
          {help && <InfoTip title={`Acerca de ${title}`} className="mt-1.5 sm:mt-2">{help}</InfoTip>}
        </h1>
        <p className="mt-2.5 max-w-3xl text-[13px] font-medium leading-6 text-slate-500 sm:text-sm">{description}</p>
      </div>
      {actions && <div className="w-full shrink-0 lg:w-auto">{actions}</div>}
    </header>
  )
}
