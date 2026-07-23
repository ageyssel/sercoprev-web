'use server'

import { revalidatePath } from 'next/cache'
import { classifyDocumentFilename, type CompanyReference } from '@/lib/document-classifier'
import { notifyCompany } from '@/lib/notifications'
import { requireAdmin } from '@/utils/supabase/require-admin'

export type IntakeActionState = { status: 'idle' | 'success' | 'error'; message: string; batchId?: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'image/jpeg',
  'image/png',
])
const MAX_FILE_SIZE = 7 * 1024 * 1024
const MAX_BATCH_SIZE = 30 * 1024 * 1024
const MAX_FILES = 20

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function safeFilename(value: string) {
  const extension = value.includes('.') ? `.${value.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}` : ''
  const base = value.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'documento'
  return `${base}${extension}`
}

export async function cargarLoteDocumental(_state: IntakeActionState, formData: FormData): Promise<IntakeActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const files = formData.getAll('archivos').filter((item): item is File => item instanceof File && item.size > 0)
    if (files.length === 0 || files.length > MAX_FILES) return { status: 'error', message: `Seleccione entre 1 y ${MAX_FILES} archivos por lote.` }
    if (files.some((file) => file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type))) return { status: 'error', message: 'Cada archivo debe ser PDF, Excel, CSV, JPG o PNG y no superar 7 MB.' }
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_SIZE) return { status: 'error', message: 'El lote no puede superar 30 MB. Divídalo en varios envíos.' }

    const { data: companyRows, error: companiesError } = await adminClient.from('empresas').select('id, rut, razon_social, nombre_fantasia').eq('es_admin', false)
    if (companiesError) throw companiesError
    const companies: CompanyReference[] = (companyRows ?? []).map((company) => ({ id: company.id, rut: company.rut, razonSocial: company.razon_social, nombreFantasia: company.nombre_fantasia }))

    const batchName = clean(formData.get('nombre_lote'), 180) || `Carga ${new Date().toLocaleDateString('es-CL')}`
    const { data: batch, error: batchError } = await adminClient.from('lotes_documentales').insert({ nombre: batchName, total_archivos: files.length, estado: 'Procesando', creado_por: actorUserId }).select('id').single()
    if (batchError) throw batchError

    let classified = 0
    let pending = 0
    let failures = 0
    const publishedByCompany = new Map<string, number>()

    for (const file of files) {
      const classification = classifyDocumentFilename(file.name, companies)
      const safeName = safeFilename(file.name)
      const storagePath = classification.companyId
        ? `${classification.companyId}/lotes/${batch.id}/${crypto.randomUUID()}-${safeName}`
        : `pendientes/${batch.id}/${crypto.randomUUID()}-${safeName}`

      try {
        const { error: uploadError } = await adminClient.storage.from('documentos').upload(storagePath, await file.arrayBuffer(), { contentType: file.type, cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError

        let documentId: string | null = null
        if (classification.status === 'Confirmada' && classification.companyId) {
          const { data: document, error: documentError } = await adminClient.from('documentos').insert({
            empresa_id: classification.companyId,
            nombre_original: file.name.slice(0, 255),
            storage_path: storagePath,
            categoria: classification.category,
            periodo: classification.period,
            descripcion: `Clasificado automáticamente desde el lote ${batchName}`,
            uploaded_by: actorUserId,
            mime_type: file.type,
            file_size: file.size,
            visible_cliente: true,
            lote_id: batch.id,
            clasificacion_estado: 'Confirmada',
            rut_detectado: classification.detectedRut,
            fecha_documento: classification.documentDate,
            fuente_carga: 'Masiva',
            metadata_clasificacion: { confianza: classification.confidence, razones: classification.reasons },
          }).select('id').single()
          if (documentError) throw documentError
          documentId = document.id
          classified += 1
          publishedByCompany.set(classification.companyId, (publishedByCompany.get(classification.companyId) ?? 0) + 1)
        } else {
          pending += 1
        }

        const { error: intakeError } = await adminClient.from('archivos_ingesta').insert({
          lote_id: batch.id,
          empresa_id: classification.companyId,
          documento_id: documentId,
          nombre_original: file.name.slice(0, 255),
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          categoria_sugerida: classification.category,
          periodo_sugerido: classification.period,
          fecha_sugerida: classification.documentDate,
          rut_detectado: classification.detectedRut,
          confianza: classification.confidence,
          estado: documentId ? 'Clasificado' : 'Revisión',
          razones: classification.reasons,
        })
        if (intakeError) throw intakeError
      } catch (fileError) {
        failures += 1
        console.error(`Error al procesar ${file.name}:`, fileError)
      }
    }

    const status = failures > 0 || pending > 0 ? 'Con observaciones' : 'Completado'
    await adminClient.from('lotes_documentales').update({ clasificados: classified, pendientes: pending, errores: failures, estado: status, completado_at: new Date().toISOString() }).eq('id', batch.id)
    await adminClient.from('auditoria_eventos').insert({ actor_user_id: actorUserId, accion: 'cargar_lote', entidad: 'lote_documental', entidad_id: batch.id, metadata: { total: files.length, clasificados: classified, pendientes: pending, errores: failures } })

    for (const [companyId, count] of publishedByCompany.entries()) {
      await notifyCompany({
        adminClient,
        empresaId: companyId,
        event: 'documentos_lote_publicados',
        subject: `${count} documento${count === 1 ? '' : 's'} nuevo${count === 1 ? '' : 's'} en su portal`,
        title: 'SERCOPREV publicó nueva información',
        paragraphs: [`Se incorporaron ${count} archivo${count === 1 ? '' : 's'} a la ficha documental de su empresa.`, 'Puede revisar y descargar los antecedentes desde el Portal de Clientes.'],
        details: [{ label: 'Lote', value: batchName }, { label: 'Archivos publicados', value: String(count) }],
        ctaLabel: 'Revisar documentos',
        ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/documentos`,
      })
    }

    revalidatePath('/admin/documentos-masivos')
    revalidatePath('/dashboard')
    return { status: 'success', message: `Lote procesado: ${classified} publicados, ${pending} en revisión y ${failures} con error.`, batchId: batch.id }
  } catch (error) {
    console.error('Error al procesar lote documental:', error)
    return { status: 'error', message: 'No fue posible procesar el lote documental.' }
  }
}

export async function confirmarArchivoIngesta(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
  const intakeId = clean(formData.get('ingesta_id'), 40)
  const empresaId = clean(formData.get('empresa_id'), 40)
  const categoria = clean(formData.get('categoria'), 40)
  const periodo = clean(formData.get('periodo'), 20) || null
  if (!UUID_PATTERN.test(intakeId) || !UUID_PATTERN.test(empresaId)) throw new Error('INVALID_INTAKE')
  if (!['Impuestos', 'Remuneraciones', 'Legal', 'Contabilidad', 'Tributario', 'Laboral', 'Bancario', 'Contratos'].includes(categoria)) throw new Error('INVALID_CATEGORY')

  const { data: intake, error: intakeError } = await adminClient.from('archivos_ingesta').select('*').eq('id', intakeId).eq('estado', 'Revisión').single()
  if (intakeError || !intake) throw new Error('INTAKE_NOT_AVAILABLE')

  const targetPath = `${empresaId}/lotes/${intake.lote_id}/${crypto.randomUUID()}-${safeFilename(intake.nombre_original)}`
  const { error: moveError } = await adminClient.storage.from('documentos').move(intake.storage_path, targetPath)
  if (moveError) throw moveError

  const { data: document, error: documentError } = await adminClient.from('documentos').insert({
    empresa_id: empresaId,
    nombre_original: intake.nombre_original,
    storage_path: targetPath,
    categoria,
    periodo,
    descripcion: 'Clasificación confirmada por el equipo SERCOPREV.',
    uploaded_by: actorUserId,
    mime_type: intake.mime_type,
    file_size: intake.file_size,
    visible_cliente: true,
    lote_id: intake.lote_id,
    clasificacion_estado: 'Confirmada',
    rut_detectado: intake.rut_detectado,
    fecha_documento: intake.fecha_sugerida,
    fuente_carga: 'Masiva revisada',
    metadata_clasificacion: { confianza_inicial: intake.confianza, razones: intake.razones, revisado_manualmente: true },
  }).select('id').single()
  if (documentError) {
    await adminClient.storage.from('documentos').move(targetPath, intake.storage_path)
    throw documentError
  }

  await adminClient.from('archivos_ingesta').update({ empresa_id: empresaId, documento_id: document.id, storage_path: targetPath, categoria_sugerida: categoria, periodo_sugerido: periodo, estado: 'Clasificado', reviewed_at: new Date().toISOString(), reviewed_by: actorUserId }).eq('id', intakeId)
  await adminClient.from('auditoria_eventos').insert({ actor_user_id: actorUserId, empresa_id: empresaId, accion: 'confirmar_clasificacion', entidad: 'archivo_ingesta', entidad_id: intakeId, metadata: { documento_id: document.id } })

  await notifyCompany({
    adminClient,
    empresaId,
    event: 'documento_publicado_revision',
    subject: `Nuevo documento disponible: ${intake.nombre_original}`,
    title: 'Nueva información disponible en su portal',
    paragraphs: ['SERCOPREV revisó y publicó un nuevo antecedente en la ficha documental de su empresa.'],
    details: [{ label: 'Archivo', value: intake.nombre_original }, { label: 'Categoría', value: categoria }, { label: 'Periodo', value: periodo }],
    ctaLabel: 'Abrir portal',
    ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/documentos`,
  })

  revalidatePath('/admin/documentos-masivos')
  revalidatePath('/dashboard')
}
