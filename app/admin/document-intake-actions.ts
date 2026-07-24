'use server'

import { revalidatePath } from 'next/cache'
import { classifyDocumentFilename, type CompanyReference } from '@/lib/document-classifier'
import { DOCUMENT_TYPES, isDocumentTypeCode, type DocumentTypeCode } from '@/lib/document-types'
import { notifyCompany } from '@/lib/notifications'
import { requireAdmin } from '@/utils/supabase/require-admin'

export type IntakeActionState = { status: 'idle' | 'success' | 'error'; message: string; batchId?: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PERIOD_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])$/
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

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function requestAiAnalysis(intakeId: string) {
  const token = process.env.DOCUMENT_AI_TOKEN?.trim()
  if (!token) return { configured: false, accepted: false }
  const baseUrl = process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'
  try {
    const response = await fetch(`${baseUrl}/api/internal/document-ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sercoprev-document-ai-token': token,
      },
      body: JSON.stringify({ intakeId }),
      cache: 'no-store',
    })
    return { configured: true, accepted: response.status === 202 }
  } catch (error) {
    console.error('DOCUMENT_AI_ENQUEUE_FAILED', intakeId, error)
    return { configured: true, accepted: false }
  }
}

function parsePublicationResult(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

async function removeReplacedStorageFiles(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  actorUserId: string,
  empresaId: string,
  intakeId: string,
  result: Record<string, unknown>,
) {
  const paths = Array.isArray(result.storage_paths_eliminar)
    ? result.storage_paths_eliminar.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []
  if (paths.length === 0) return
  const { error } = await adminClient.storage.from('documentos').remove(paths)
  if (!error) return
  await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    empresa_id: empresaId,
    accion: 'limpieza_storage_carpeta_tributaria_fallida',
    entidad: 'archivo_ingesta',
    entidad_id: intakeId,
    module: 'Documentos',
    description: 'La Carpeta Tributaria fue reemplazada, pero quedaron archivos privados pendientes de limpieza en Storage.',
    result: 'fallido',
    source: 'aplicacion',
    metadata: { cantidad: paths.length },
  })
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
    const { data: batch, error: batchError } = await adminClient.from('lotes_documentales').insert({ nombre: batchName, total_archivos: files.length, pendientes: files.length, estado: 'Procesando', creado_por: actorUserId }).select('id').single()
    if (batchError) throw batchError

    let analyzing = 0
    let review = 0
    let failures = 0

    for (const file of files) {
      const filenameClassification = classifyDocumentFilename(file.name, companies)
      const safeName = safeFilename(file.name)
      const storagePath = `pendientes/${batch.id}/${crypto.randomUUID()}-${safeName}`
      let uploaded = false

      try {
        const buffer = await file.arrayBuffer()
        const fileHash = await sha256(buffer)
        const { error: uploadError } = await adminClient.storage.from('documentos').upload(storagePath, buffer, { contentType: file.type, cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        uploaded = true

        const tokenConfigured = Boolean(process.env.DOCUMENT_AI_TOKEN?.trim())
        const { data: intake, error: intakeError } = await adminClient.from('archivos_ingesta').insert({
          lote_id: batch.id,
          empresa_id: filenameClassification.companyId,
          nombre_original: file.name.slice(0, 255),
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          categoria_sugerida: filenameClassification.category,
          tipo_documento_sugerido: filenameClassification.documentTypeCode,
          periodo_sugerido: filenameClassification.period,
          fecha_sugerida: filenameClassification.documentDate,
          rut_detectado: filenameClassification.detectedRut,
          confianza: filenameClassification.confidence,
          empresa_confianza: filenameClassification.exactRutMatch ? 75 : filenameClassification.companyId ? 45 : 0,
          tipo_confianza: filenameClassification.documentTypeCode === 'SIN_CLASIFICAR' ? 0 : 35,
          periodo_confianza: filenameClassification.period ? 35 : 0,
          estado: tokenConfigured ? 'Analizando' : 'Revisión',
          ai_estado: tokenConfigured ? 'Pendiente' : 'No configurado',
          razones: [...filenameClassification.reasons, tokenConfigured ? 'Pendiente de análisis del contenido con IA.' : 'Workers AI todavía no está configurado; requiere revisión manual.'],
          archivo_hash: fileHash,
        }).select('id').single()
        if (intakeError) throw intakeError

        const aiRequest = await requestAiAnalysis(intake.id)
        if (aiRequest.accepted) {
          analyzing += 1
        } else {
          review += 1
          await adminClient.from('archivos_ingesta').update({
            estado: 'Revisión',
            ai_estado: aiRequest.configured ? 'Error' : 'No configurado',
            error_mensaje: aiRequest.configured ? 'No fue posible iniciar el análisis automático. Puede reintentarlo desde la cola de revisión.' : null,
          }).eq('id', intake.id)
        }
      } catch (fileError) {
        failures += 1
        if (uploaded) await adminClient.storage.from('documentos').remove([storagePath])
        console.error(`Error al procesar ${file.name}:`, fileError)
      }
    }

    const pending = analyzing + review
    const status = failures > 0 || pending > 0 ? 'Con observaciones' : 'Completado'
    await adminClient.from('lotes_documentales').update({ clasificados: 0, pendientes: pending, errores: failures, estado: status, completado_at: analyzing === 0 ? new Date().toISOString() : null }).eq('id', batch.id)
    await adminClient.from('auditoria_eventos').insert({
      actor_user_id: actorUserId,
      accion: 'cargar_lote_con_analisis_ia',
      entidad: 'lote_documental',
      entidad_id: batch.id,
      module: 'Documentos',
      description: 'Lote documental cargado para clasificación por contenido con inteligencia artificial.',
      source: 'aplicacion',
      metadata: { total: files.length, analizando: analyzing, revision: review, errores: failures },
    })

    revalidatePath('/admin/documentos-masivos')
    const message = analyzing > 0
      ? `Lote recibido: ${analyzing} archivo${analyzing === 1 ? '' : 's'} en análisis IA, ${review} en revisión y ${failures} con error.`
      : `Lote recibido: ${review} archivo${review === 1 ? '' : 's'} en revisión y ${failures} con error.`
    return { status: 'success', message, batchId: batch.id }
  } catch (error) {
    console.error('Error al procesar lote documental:', error)
    return { status: 'error', message: 'No fue posible procesar el lote documental.' }
  }
}

export async function reanalizarArchivoIngesta(formData: FormData) {
  const { adminClient } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
  const intakeId = clean(formData.get('ingesta_id'), 40)
  if (!UUID_PATTERN.test(intakeId)) throw new Error('INVALID_INTAKE')
  const { data: intake, error } = await adminClient.from('archivos_ingesta').select('id, documento_id').eq('id', intakeId).maybeSingle()
  if (error || !intake || intake.documento_id) throw new Error('INTAKE_NOT_AVAILABLE')
  await adminClient.from('archivos_ingesta').update({ estado: 'Analizando', ai_estado: 'Pendiente', error_mensaje: null }).eq('id', intakeId)
  const request = await requestAiAnalysis(intakeId)
  if (!request.accepted) {
    await adminClient.from('archivos_ingesta').update({ estado: 'Revisión', ai_estado: request.configured ? 'Error' : 'No configurado', error_mensaje: request.configured ? 'No fue posible iniciar el análisis automático.' : 'Workers AI no está configurado.' }).eq('id', intakeId)
  }
  revalidatePath('/admin/documentos-masivos')
}

export async function confirmarArchivoIngesta(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
  const intakeId = clean(formData.get('ingesta_id'), 40)
  const empresaId = clean(formData.get('empresa_id'), 40)
  const typeCodeRaw = clean(formData.get('tipo_documento_codigo'), 80)
  const periodoRaw = clean(formData.get('periodo'), 20)
  const periodo = periodoRaw && PERIOD_PATTERN.test(periodoRaw) ? periodoRaw : null
  if (!UUID_PATTERN.test(intakeId) || !UUID_PATTERN.test(empresaId)) throw new Error('INVALID_INTAKE')
  if (!isDocumentTypeCode(typeCodeRaw) || typeCodeRaw === 'SIN_CLASIFICAR') throw new Error('INVALID_DOCUMENT_TYPE')
  const typeCode: DocumentTypeCode = typeCodeRaw
  if (DOCUMENT_TYPES[typeCode].periodRequired && !periodo) throw new Error('PERIOD_REQUIRED')

  const { data: intake, error: intakeError } = await adminClient.from('archivos_ingesta').select('*').eq('id', intakeId).in('estado', ['Revisión', 'Analizando']).single()
  if (intakeError || !intake || intake.documento_id) throw new Error('INTAKE_NOT_AVAILABLE')

  const targetPath = `${empresaId}/lotes/${intake.lote_id}/${crypto.randomUUID()}-${safeFilename(intake.nombre_original)}`
  const { error: moveError } = await adminClient.storage.from('documentos').move(intake.storage_path, targetPath)
  if (moveError) throw moveError

  try {
    const { data: publication, error: documentError } = await adminClient.rpc('publicar_archivo_ingesta', {
      p_ingesta_id: intakeId,
      p_empresa_id: empresaId,
      p_categoria: DOCUMENT_TYPES[typeCode].category,
      p_tipo_documento_codigo: typeCode,
      p_periodo: periodo,
      p_fecha_documento: intake.fecha_sugerida,
      p_target_storage_path: targetPath,
      p_actor_user_id: actorUserId,
      p_fuente_carga: 'Masiva revisada',
      p_metadata: {
        confianza_inicial: intake.confianza,
        empresa_confianza: intake.empresa_confianza,
        tipo_confianza: intake.tipo_confianza,
        periodo_confianza: intake.periodo_confianza,
        razones: intake.razones,
        evidencias: intake.evidencias,
        revisado_manualmente: true,
      },
    })
    if (documentError) throw documentError
    const result = parsePublicationResult(publication)
    await removeReplacedStorageFiles(adminClient, actorUserId, empresaId, intakeId, result)

    await notifyCompany({
      adminClient,
      empresaId,
      event: typeCode === 'CARPETA_TRIBUTARIA' ? 'carpeta_tributaria_actualizada' : 'documento_publicado_revision',
      subject: typeCode === 'CARPETA_TRIBUTARIA' ? 'Su Carpeta Tributaria fue actualizada' : `Nuevo documento disponible: ${intake.nombre_original}`,
      title: typeCode === 'CARPETA_TRIBUTARIA' ? 'Carpeta Tributaria vigente' : 'Nueva información disponible en su portal',
      paragraphs: typeCode === 'CARPETA_TRIBUTARIA'
        ? ['SERCOPREV publicó la versión más reciente de la Carpeta Tributaria de su empresa.', 'La versión anterior fue reemplazada automáticamente para mantener una sola copia vigente.']
        : ['SERCOPREV revisó y publicó un nuevo antecedente en la ficha documental de su empresa.'],
      details: [
        { label: 'Archivo', value: intake.nombre_original },
        { label: 'Tipo', value: DOCUMENT_TYPES[typeCode].label },
        { label: 'Periodo', value: periodo },
      ],
      ctaLabel: 'Abrir portal',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/documentos`,
    })
  } catch (error) {
    await adminClient.storage.from('documentos').move(targetPath, intake.storage_path)
    throw error
  }

  revalidatePath('/admin/documentos-masivos')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/documentos')
}
