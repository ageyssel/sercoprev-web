import { AppIcon, type AppIconName } from '@/components/AppIcon'

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = 'navy',
}: {
  label: string
  value: string | number
  detail?: string
  icon: AppIconName
  tone?: 'navy' | 'blue' | 'gold' | 'red' | 'green'
}) {
  const tones = {
    navy: 'bg-[#10283d] text-white ring-[#10283d]/10',
    blue: 'bg-[#edf4f9] text-[#174f7a] ring-[#174f7a]/10',
    gold: 'bg-[#fbf6e8] text-[#8a681d] ring-[#cfa84b]/20',
    red: 'bg-[#fff1f0] text-[#a33a32] ring-[#a33a32]/10',
    green: 'bg-[#edf8f2] text-[#167052] ring-[#167052]/10',
  }

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,36,56,0.055)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,36,56,0.08)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2.5 text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#10283d]">{value}</p>
          {detail && <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">{detail}</p>}
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105 ${tones[tone]}`}>
          <AppIcon name={icon} className="h-4.5 w-4.5" />
        </span>
      </div>
    </article>
  )
}
