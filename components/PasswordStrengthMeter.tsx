type Strength = {
  label: string
  widthClass: string
  barClass: string
  textClass: string
  value: number
}

function passwordStrength(password: string): Strength {
  if (!password) {
    return { label: 'Sin ingresar', widthClass: 'w-0', barClass: 'bg-slate-300', textClass: 'text-slate-500', value: 0 }
  }

  const classes = [/[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
  let score = 0

  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (classes >= 2) score += 1
  if (password.length >= 14 || classes === 3) score += 1

  if (score <= 1) return { label: 'Débil', widthClass: 'w-1/4', barClass: 'bg-red-500', textClass: 'text-red-700', value: 1 }
  if (score === 2) return { label: 'Aceptable', widthClass: 'w-1/2', barClass: 'bg-amber-500', textClass: 'text-amber-700', value: 2 }
  if (score === 3) return { label: 'Buena', widthClass: 'w-3/4', barClass: 'bg-blue-500', textClass: 'text-blue-700', value: 3 }
  return { label: 'Fuerte', widthClass: 'w-full', barClass: 'bg-emerald-500', textClass: 'text-emerald-700', value: 4 }
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password)

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="text-slate-500">Nivel de seguridad</span>
        <span className={strength.textClass}>{strength.label}</span>
      </div>
      <div
        role="meter"
        aria-label="Nivel de seguridad de la contraseña"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={strength.value}
        aria-valuetext={strength.label}
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div className={`h-full rounded-full transition-all ${strength.widthClass} ${strength.barClass}`} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">Mínimo 6 caracteres. La fortaleza mostrada es solo informativa.</p>
    </div>
  )
}
