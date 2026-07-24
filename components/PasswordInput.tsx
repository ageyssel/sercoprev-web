'use client'

import { useState } from 'react'
import { AppIcon } from '@/components/AppIcon'

export function PasswordInput() {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <AppIcon name="shield" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        name="password"
        type={visible ? 'text' : 'password'}
        required
        autoComplete="current-password"
        placeholder="••••••••••••"
        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-24 text-sm font-medium text-[#17324a] outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10"
      />
      <button
        type="button"
        aria-pressed={visible}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-xs font-black text-[#134b78] transition hover:bg-[#eaf3f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134b78]"
      >
        {visible ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}
