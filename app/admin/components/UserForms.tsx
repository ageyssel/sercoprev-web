'use client'

import { useActionState } from 'react'
import { crearUsuarioCliente, crearUsuarioEquipo, type UserActionState } from '@/app/admin/user-actions'

const initialState: UserActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'

export type CompanyOption = { id: string; label: string }

export function StaffUserForm() {
  const [state, action, pending] = useActionState(crearUsuarioEquipo, initialState)
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" name="nombre" required />
        <Field label="Correo" name="email" type="email" required />
        <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Rol<select name="rol" className={inputClass}><option>Administrador</option><option>Contador</option><option>Remuneraciones</option><option>Cobranza</option><option>Lectura</option><option>Superadministrador</option></select></label>
      </div>
      <Notice />
      <Feedback state={state} />
      <Submit pending={pending} text="Crear usuario del equipo" />
    </form>
  )
}

export function ClientUserForm({ companies }: { companies: CompanyOption[] }) {
  const [state, action, pending] = useActionState(crearUsuarioCliente, initialState)
  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-slate-700">Empresa<select name="empresa_id" required className={inputClass}><option value="">Seleccione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" name="nombre" required />
        <Field label="Correo" name="email" type="email" required />
        <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Rol<select name="rol" className={inputClass}><option>Administrador cliente</option><option>Operador</option><option>Solo lectura</option></select></label>
      </div>
      <Notice />
      <Feedback state={state} />
      <Submit pending={pending} text="Crear usuario del cliente" />
    </form>
  )
}

function Notice() { return <p className="rounded-xl border border-[#134b78]/20 bg-[#eaf3f9] p-4 text-xs font-semibold leading-5 text-[#17324a]">SERCOPREV generará una contraseña temporal segura, enviará el acceso por correo y exigirá cambiarla al primer ingreso.</p> }
function Field({ label, name, type = 'text', required = false }: { label: string; name: string; type?: string; required?: boolean }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<input name={name} type={type} required={required} className={inputClass} /></label> }
function Feedback({ state }: { state: UserActionState }) { if (!state.message) return null; return <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p> }
function Submit({ pending, text }: { pending: boolean; text: string }) { return <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{pending ? 'Creando acceso…' : text}</button> }
