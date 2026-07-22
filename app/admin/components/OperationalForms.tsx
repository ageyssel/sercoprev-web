'use client'

import { useActionState } from 'react'
import {
  actualizarCliente,
  cargarDocumentoAdministrador,
  crearObligacion,
  crearServicio,
  crearSolicitudDocumento,
  crearTarea,
  type OperationalActionState,
} from '@/app/admin/operational-actions'
import { AppIcon } from '@/components/AppIcon'

const initialState: OperationalActionState = { status: 'idle', message: '' }

type CompanyProfile = {
  id: string
  nombre_fantasia: string | null
  tipo_sociedad: string | null
  giro: string | null
  regimen_tributario: string | null
  inicio_actividades: string | null
  direccion: string | null
  comuna: string | null
  ciudad: string | null
  representante_legal: string | null
  representante_rut: string | null
  telefono: string | null
  email_contacto: string | null
  contador_asignado: string | null
  ejecutivo_asignado: string | null
  estado_cliente: string
  estado_impuestos: string
  plan_servicio: string | null
  honorario_mensual: number | null
  dia_pago: number | null
  notas_internas: string | null
}

export function ClientProfileForm({ company }: { company: CompanyProfile }) {
  const [state, action, pending] = useActionState(actualizarCliente, initialState)
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="empresa_id" value={company.id} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Nombre de fantasía" name="nombre_fantasia" defaultValue={company.nombre_fantasia} placeholder="Nombre comercial" />
        <Field label="Tipo de sociedad" name="tipo_sociedad" defaultValue={company.tipo_sociedad} placeholder="SpA, Ltda., EIRL…" />
        <Field label="Giro" name="giro" defaultValue={company.giro} placeholder="Actividad principal" />
        <Field label="Régimen tributario" name="regimen_tributario" defaultValue={company.regimen_tributario} placeholder="Pro Pyme General…" />
        <Field label="Inicio de actividades" name="inicio_actividades" type="date" defaultValue={company.inicio_actividades} />
        <SelectField label="Estado del cliente" name="estado_cliente" defaultValue={company.estado_cliente} options={['En incorporación', 'Activo', 'Requiere atención', 'Suspendido', 'Archivado']} />
        <Field label="Dirección" name="direccion" defaultValue={company.direccion} placeholder="Calle y número" />
        <Field label="Comuna" name="comuna" defaultValue={company.comuna} placeholder="Comuna" />
        <Field label="Ciudad" name="ciudad" defaultValue={company.ciudad} placeholder="Ciudad" />
        <Field label="Representante legal" name="representante_legal" defaultValue={company.representante_legal} placeholder="Nombre completo" />
        <Field label="RUT representante" name="representante_rut" defaultValue={company.representante_rut} placeholder="12.345.678-9" />
        <Field label="Teléfono" name="telefono" type="tel" defaultValue={company.telefono} placeholder="+56 9…" />
        <Field label="Correo de contacto" name="email_contacto" type="email" defaultValue={company.email_contacto} placeholder="contacto@empresa.cl" />
        <Field label="Contador asignado" name="contador_asignado" defaultValue={company.contador_asignado} placeholder="Nombre del responsable" />
        <Field label="Ejecutivo asignado" name="ejecutivo_asignado" defaultValue={company.ejecutivo_asignado} placeholder="Nombre del ejecutivo" />
        <Field label="Plan o servicio principal" name="plan_servicio" defaultValue={company.plan_servicio} placeholder="Contabilidad mensual…" />
        <Field label="Honorario mensual" name="honorario_mensual" inputMode="numeric" defaultValue={company.honorario_mensual?.toString()} placeholder="350000" />
        <Field label="Día de pago" name="dia_pago" type="number" min="1" max="31" defaultValue={company.dia_pago?.toString()} placeholder="10" />
        <Field label="Estado IVA / impuestos" name="estado_impuestos" defaultValue={company.estado_impuestos} placeholder="Al día" />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Notas internas<textarea name="notas_internas" defaultValue={company.notas_internas ?? ''} rows={5} maxLength={4000} className={textareaClass} placeholder="Acuerdos, particularidades y observaciones internas del cliente." /></label>
      <Feedback state={state} />
      <SubmitButton pending={pending} text="Guardar ficha del cliente" loading="Guardando…" icon="check" />
    </form>
  )
}

export function ObligationForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(crearObligacion, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" name="titulo" required placeholder="Formulario 29" />
        <Field label="Tipo" name="tipo" required placeholder="Impuesto mensual" />
        <Field label="Periodo" name="periodo" placeholder="Junio 2026" />
        <Field label="Fecha de vencimiento" name="fecha_vencimiento" type="date" required />
        <SelectField label="Prioridad" name="prioridad" defaultValue="Media" options={['Baja', 'Media', 'Alta', 'Crítica']} />
        <Field label="Monto referencial" name="monto" inputMode="numeric" placeholder="0" />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800"><input type="checkbox" name="requiere_accion_cliente" className="h-4 w-4 rounded" />Requiere acción o antecedentes del cliente</label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Descripción<textarea name="descripcion" rows={3} maxLength={1500} className={textareaClass} placeholder="Instrucciones o contexto visible para el cliente." /></label>
      <Feedback state={state} />
      <SubmitButton pending={pending} text="Crear obligación" loading="Creando…" icon="plus" />
    </form>
  )
}

export function TaskForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(crearTarea, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <Field label="Tarea" name="titulo" required placeholder="Revisar libro de compras" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Responsable" name="responsable" placeholder="Nombre" />
        <Field label="Vencimiento" name="fecha_vencimiento" type="date" />
        <SelectField label="Prioridad" name="prioridad" defaultValue="Media" options={['Baja', 'Media', 'Alta', 'Crítica']} />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Descripción<textarea name="descripcion" rows={3} maxLength={1500} className={textareaClass} placeholder="Detalle interno de la tarea." /></label>
      <Feedback state={state} />
      <SubmitButton pending={pending} text="Crear tarea" loading="Creando…" icon="plus" />
    </form>
  )
}

export function DocumentRequestForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(crearSolicitudDocumento, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <Field label="Documento solicitado" name="titulo" required placeholder="Libro de compras del periodo" />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Categoría" name="categoria" defaultValue="Impuestos" options={['Impuestos', 'Remuneraciones', 'Legal']} />
        <Field label="Periodo" name="periodo" placeholder="Junio 2026" />
        <Field label="Fecha límite" name="fecha_limite" type="date" />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Instrucciones<textarea name="descripcion" rows={3} maxLength={1500} className={textareaClass} placeholder="Explique qué archivo se necesita y cualquier condición relevante." /></label>
      <Feedback state={state} />
      <SubmitButton pending={pending} text="Enviar solicitud" loading="Enviando…" icon="upload" />
    </form>
  )
}

export function AdminDocumentUploadForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(cargarDocumentoAdministrador, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Categoría" name="categoria" defaultValue="Impuestos" options={['Impuestos', 'Remuneraciones', 'Legal']} />
        <Field label="Periodo" name="periodo" placeholder="Junio 2026" />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Archivo<input name="archivo" type="file" required accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png" className="block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0f2438] file:px-3 file:py-2 file:font-bold file:text-white" /><span className="text-xs font-medium text-slate-500">PDF, Excel, CSV o imagen. Máximo 7 MB.</span></label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Descripción<textarea name="descripcion" rows={2} maxLength={1000} className={textareaClass} placeholder="Descripción visible para el cliente." /></label>
      <Feedback state={state} />
      <SubmitButton pending={pending} text="Publicar documento" loading="Publicando…" icon="upload" />
    </form>
  )
}

export function ServiceForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(crearServicio, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Servicio" name="nombre" required placeholder="Contabilidad mensual" />
        <Field label="Fecha de inicio" name="fecha_inicio" type="date" />
        <Field label="Honorario mensual" name="honorario_mensual" inputMode="numeric" placeholder="350000" />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Descripción<textarea name="descripcion" rows={2} maxLength={1200} className={textareaClass} placeholder="Alcance y observaciones del servicio." /></label>
      <Feedback state={state} />
      <SubmitButton pending={pending} text="Agregar servicio" loading="Agregando…" icon="plus" />
    </form>
  )
}

function Field({ label, name, defaultValue, placeholder, type = 'text', required = false, inputMode, min, max }: { label: string; name: string; defaultValue?: string | null; placeholder?: string; type?: string; required?: boolean; inputMode?: 'numeric'; min?: string; max?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<input name={name} type={type} required={required} defaultValue={defaultValue ?? ''} placeholder={placeholder} inputMode={inputMode} min={min} max={max} className={inputClass} /></label>
}

function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: string[] }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<select name={name} defaultValue={defaultValue} className={inputClass}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

function Feedback({ state }: { state: OperationalActionState }) {
  if (!state.message) return null
  return <p role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p>
}

function SubmitButton({ pending, text, loading, icon }: { pending: boolean; text: string; loading: string; icon: 'check' | 'plus' | 'upload' }) {
  return <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173d5c] disabled:cursor-wait disabled:opacity-60"><AppIcon name={icon} className="h-4 w-4" />{pending ? loading : text}</button>
}

const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition placeholder:text-slate-400 focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const textareaClass = 'rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-[#17324a] outline-none transition placeholder:text-slate-400 focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
