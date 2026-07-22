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
    navy: 'bg-[#0f2438] text-white ring-[#0f2438]/10',
    blue: 'bg-[#e9f2fb] text-[#134b78] ring-[#134b78]/10',
    gold: 'bg-[#fbf4df] text-[#8a6418] ring-[#d6ad4d]/20',
    red: 'bg-[#fff0ef] text-[#a33a32] ring-[#a33a32]/10',
    green: 'bg-[#edf8f2] text-[#167052] ring-[#167052]/10',
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,36,56,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[#0f2438]">{value}</p>
          {detail && <p className="mt-2 text-sm leading-relaxed text-slate-500">{detail}</p>}
        </div>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
          <AppIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </article>
  )
}
