'use client'

import { useActionState, useState } from 'react'
import { SubmitButton } from '@/app/admin/components/SubmitButton'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { cambiarClave, type PasswordActionState } from './actions'

const INITIAL_STATE: PasswordActionState = {
  status: 'idle',
  message: '',
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(cambiarClave, INITIAL_STATE)
  const [password, setPassword] = useState('')

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="password" className="block text-sm font-bold text-[#0f172a] mb-2">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          maxLength={128}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full px-4 py-3 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-gray-900 bg-gray-50"
        />
        <PasswordStrengthMeter password={password} />
      </div>

      <div>
        <label htmlFor="confirmation" className="block text-sm font-bold text-[#0f172a] mb-2">
          Confirmar contraseña
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          minLength={6}
          maxLength={128}
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-gray-900 bg-gray-50"
        />
      </div>

      <p className="text-sm text-gray-600">
        La contraseña debe tener al menos 6 caracteres. No se exige una combinación específica de letras, números o símbolos.
      </p>

      {state.message && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {state.message}
        </div>
      )}

      <SubmitButton
        text="Guardar nueva contraseña"
        loadingText="Actualizando..."
        className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold py-3 rounded-md"
      />
    </form>
  )
}
