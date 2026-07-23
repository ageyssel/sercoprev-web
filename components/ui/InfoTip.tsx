'use client'

export function InfoTip({ title = 'Cómo se calcula', children }: { title?: string; children: React.ReactNode }) {
  return (
    <details className="group relative ml-1.5 inline-flex align-middle">
      <summary
        aria-label={title}
        title={title}
        className="inline-flex h-[18px] w-[18px] cursor-pointer list-none items-center justify-center rounded-full border border-[#174f7a]/20 bg-[#edf4f9] text-[10px] font-extrabold text-[#174f7a] shadow-sm transition hover:border-[#174f7a]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cfa84b] [&::-webkit-details-marker]:hidden"
      >
        i
      </summary>
      <div className="absolute right-0 top-6 z-[70] w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3.5 text-left text-xs font-medium leading-5 text-slate-600 shadow-2xl shadow-[#10283d]/15">
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#10283d]">{title}</p>
        <div>{children}</div>
      </div>
    </details>
  )
}

export function CalculationLabel({ label, help }: { label: string; help: React.ReactNode }) {
  return <span className="inline-flex items-center gap-0.5">{label}<InfoTip>{help}</InfoTip></span>
}
