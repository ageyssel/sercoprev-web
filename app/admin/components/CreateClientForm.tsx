'use client'

import { useActionState } from 'react'
import { crearClienteConRut, type CreateClientState } from '../create-client-actions'
import { SubmitButton } from './SubmitButton'

const INITIAL_STATE: CreateClientState = {
  status: 'idle',
  message: '',
}

export function CreateClientForm() {
  const [state, formAction] = useActionState(crearClienteConRut, INITIAL_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="razon_social" className="mb-1 block text-sm font-semibold text-gray-700">
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
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          placeholder="Ej. Comercializadora SpA"
        />
      </div>

      <div>
        <label htmlFor="rut" className="mb-1 block text-sm font-semibold text-gray-700">
          RUT Empresa
        </label>
        <input
          id="rut"
          name="rut"
          type="text"
          required
          maxLength={20}
          autoComplete="username"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          placeholder="Ej. 76.123.456-7"
        />
        <p className="mt-2 text-xs text-gray-500">El RUT será el identificador de acceso principal del cliente.</p>
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gray-700">
          Correo de contacto <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          maxLength={254}
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          placeholder="cliente@correo.cl"
        />
        <p className="mt-2 text-xs text-gray-500">Puede dejarlo vacío. El cliente igualmente podrá ingresar con su RUT y contraseña.</p>
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gray-700">
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
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
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
        className="mt-4 w-full rounded-lg bg-[#1d4ed8] py-3 font-bold text-white hover:bg-blue-800"
      />
    </form>
  )
}
