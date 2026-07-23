'use client'

export function InfoTip({ title = 'Cómo se calcula', children }: { title?: string; children: React.ReactNode }) {
  return (
    <details className="group relative inline-flex align-middle">
      <summary
        aria-label={title}
        title={title}
        className="ml-1 inline-flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-[#134b78]/25 bg-[#eaf3f9] text-[11px] font-black text-[#134b78] transition hover:border-[#134b78] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6ad4d] [&::-webkit-details-marker]:hidden"
      >
        i
      </summary>
      <div className="absolute right-0 top-7 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs font-medium leading-5 text-slate-600 shadow-xl group-open:animate-in">
        <p className="mb-1 font-black text-[#0f2438]">{title}</p>
        <div>{children}</div>
      </div>
    </details>
  )
}

export function CalculationLabel({ label, help }: { label: string; help: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1">{label}<InfoTip>{help}</InfoTip></span>
}
