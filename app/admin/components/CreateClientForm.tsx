'use client'

import { useActionState } from 'react'
import { crearCliente, type AdminActionState } from '../actions'
import { SubmitButton } from './SubmitButton'

const INITIAL_STATE: AdminActionState = {
  status: 'idle',
  message: '',
}

export function CreateClientForm() {
  const [state, formAction] = useActionState(crearCliente, INITIAL_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="razon_social" className="block text-sm font-semibold text-gray-700 mb-1">
          Razón Social de la Empresa
        </label>
        <input
          id="razon_social"
          name="razon_social"
          type="text"
          required
          minLength={2}
          maxLength={160}
          autoComplete="organization"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500 bg-white"
          placeholder="Ej. Comercializadora SpA"
        />
      </div>

      <div>
        <label htmlFor="rut" className="block text-sm font-semibold text-gray-700 mb-1">
          RUT Empresa
        </label>
        <input
          id="rut"
          name="rut"
          type="text"
          required
          maxLength={20}
          autoComplete="off"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500 bg-white"
          placeholder="Ej. 76.123.456-7"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
          Correo de Acceso
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500 bg-white"
          placeholder="cliente@correo.cl"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
          Contraseña Temporal
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500 bg-white"
          placeholder="12+ caracteres, mayúscula, número y símbolo"
        />
        <p className="mt-2 text-xs text-gray-500">
          Entréguela por un canal seguro. El cliente deberá cambiarla en su primer ingreso.
        </p>
      </div>

      {state.message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border p-3 text-sm font-semibold ${
            state.status === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {state.message}
        </div>
      )}

      <SubmitButton
        text="Registrar Cliente"
        loadingText="Creando cuenta..."
        className="w-full bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold py-3 rounded-lg mt-4"
      />
    </form>
  )
}
