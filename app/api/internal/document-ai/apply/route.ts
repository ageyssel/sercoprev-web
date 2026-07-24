import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { DOCUMENT_TYPES, isDocumentCategory, isDocumentTypeCode } from '@/lib/document-types'
import { notifyCompany } from '@/lib/notifications'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PERIOD_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])$/
const DATE_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/

function safeFilename(value: string) {
  const extension = value.includes('.') ? `.${value.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}` : ''
  const base = value.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'documento'
  return `${base}${extension}`
}
function text(value: unknown, maxLength: number) { return typeof value === 'string' ? value.trim().slice(0, maxLength) : '' }
function confidence(value: unknown) { const number = Number(value); return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : 0 }
function jsonObject(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function authorized(request: Request) {
  const expected = process.env.DOCUMENT_AI_TOKEN?.trim() || process.env.OFFICIAL_SYNC_TOKEN?.trim()
  const provided = request.headers.get('x-sercoprev-document-ai-token')?.trim()
  return Boolean(expected && provided && expected === provided)
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 })

  const body = jsonObject(await request.json().catch(() => null))
  const intakeId = text(body.intakeId, 40)
  const companyId = text(body.companyId, 40)
  const category = text(body.category, 40)
  const typeCode = text(body.documentTypeCode, 80)
  const periodRaw = text(body.period, 20)
  const documentDateRaw = text(body.documentDate, 20)
  const period = PERIOD_PATTERN.test(periodRaw) ? periodRaw : null
  const documentDate = DATE_PATTERN.test(documentDateRaw) ? documentDateRaw : null
  const exactRutMatch = body.exactRutMatch === true
  const autoPublishRequested = body.autoPublish === true

  if (!UUID_PATTERN.test(intakeId)) return NextResponse.json({ status: 'error', error: 'INVALID_INTAKE' }, { status: 400 })
  if (companyId && !UUID_PATTERN.test(companyId)) return NextResponse.json({ status: 'error', error: 'INVALID_COMPANY' }, { status: 400 })
  if (!isDocumentTypeCode(typeCode)) return NextResponse.json({ status: 'error', error: 'INVALID_DOCUMENT_TYPE' }, { status: 400 })
  if (category && !isDocumentCategory(category)) return NextResponse.json({ status: 'error', error: 'INVALID_CATEGORY' }, { status: 400 })

  const resolvedCategory = typeCode === 'SIN_CLASIFICAR' ? (isDocumentCategory(category) ? category : 'Tributario') : DOCUMENT_TYPES[typeCode].category
  const companyConfidence = confidence(body.companyConfidence)
  const typeConfidence = confidence(body.typeConfidence)
  const periodConfidence = confidence(body.periodConfidence)
  const overallConfidence = confidence(body.confidence)
  const aiProvider = text(body.aiProvider, 80) || 'Cloudflare Workers AI'
  const aiModel = text(body.aiModel, 160) || '@cf/meta/llama-3.1-8b-instruct-fast'
  const aiPromptVersion = text(body.aiPromptVersion, 80) || 'document-ai-v1'
  const detectedRut = text(body.detectedRut, 16) || null
  const textHash = text(body.textHash, 128) || null
  const reasons = Array.isArray(body.reasons) ? body.reasons.filter((item): item is string => typeof item === 'string').slice(0, 30) : []
  const evidences = jsonObject(body.evidences)
  const rawResult = jsonObject(body.rawResult)
  const autoPublish = autoPublishRequested
    && exactRutMatch
    && Boolean(companyId)
    && typeCode !== 'SIN_CLASIFICAR'
    && companyConfidence >= 95
    && typeConfidence >= 90
    && (!DOCUMENT_TYPES[typeCode].periodRequired || Boolean(period && periodConfidence >= 85))

  const adminClient = createAdminClient()
  const { data: intake, error: intakeError } = await adminClient
    .from('archivos_ingesta')
    .select('id, lote_id, documento_id, nombre_original, storage_path, mime_type, file_size, archivo_hash, lote:lotes_documentales(nombre, creado_por)')
    .eq('id', intakeId)
    .maybeSingle()

  if (intakeError || !intake) return NextResponse.json({ status: 'error', error: 'INTAKE_NOT_FOUND' }, { status: 404 })
  if (intake.documento_id) return NextResponse.json({ status: 'ok', alreadyPublished: true, documentId: intake.documento_id })

  const lot = Array.isArray(intake.lote) ? intake.lote[0] : intake.lote
  const actorUserId = lot?.creado_por ?? null
  const analysisUpdate = {
    empresa_id: companyId || null,
    categoria_sugerida: resolvedCategory,
    tipo_documento_sugerido: typeCode,
    periodo_sugerido: period,
    fecha_sugerida: documentDate,
    rut_detectado: detectedRut,
    confianza: overallConfidence,
    empresa_confianza: companyConfidence,
    tipo_confianza: typeConfidence,
    periodo_confianza: periodConfidence,
    razones: reasons,
    evidencias: evidences,
    resultado_ia: rawResult,
    texto_hash: textHash,
    ai_estado: 'Completado',
    ai_proveedor: aiProvider,
    ai_modelo: aiModel,
    ai_prompt_version: aiPromptVersion,
    ai_procesado_at: new Date().toISOString(),
    estado: autoPublish ? 'Analizando' : 'Revisión',
    error_mensaje: null,
  }

  const { error: updateError } = await adminClient.from('archivos_ingesta').update(analysisUpdate).eq('id', intakeId)
  if (updateError) return NextResponse.json({ status: 'error', error: 'INTAKE_UPDATE_FAILED' }, { status: 500 })

  if (!autoPublish || !companyId) {
    revalidatePath('/admin/documentos-masivos')
    return NextResponse.json({ status: 'review', autoPublished: false })
  }

  const targetPath = `${companyId}/lotes/${intake.lote_id}/${crypto.randomUUID()}-${safeFilename(intake.nombre_original)}`
  const { error: moveError } = await adminClient.storage.from('documentos').move(intake.storage_path, targetPath)
  if (moveError) {
    await adminClient.from('archivos_ingesta').update({ estado: 'Error', ai_estado: 'Error', error_mensaje: 'No fue posible mover el archivo a la carpeta de la empresa.' }).eq('id', intakeId)
    return NextResponse.json({ status: 'error', error: 'STORAGE_MOVE_FAILED' }, { status: 500 })
  }

  try {
    const { data: result, error: publishError } = await adminClient.rpc('publicar_archivo_ingesta', {
      p_ingesta_id: intakeId,
      p_empresa_id: companyId,
      p_categoria: resolvedCategory,
      p_tipo_documento_codigo: typeCode,
      p_periodo: period,
      p_fecha_documento: documentDate,
      p_target_storage_path: targetPath,
      p_actor_user_id: actorUserId,
      p_fuente_carga: 'Masiva con IA',
      p_metadata: {
        confianza: overallConfidence,
        empresa_confianza: companyConfidence,
        tipo_confianza: typeConfidence,
        periodo_confianza: periodConfidence,
        razones: reasons,
        evidencias: evidences,
        proveedor_ia: aiProvider,
        modelo_ia: aiModel,
        prompt_version: aiPromptVersion,
        exact_rut_match: exactRutMatch,
      },
    })
    if (publishError) throw publishError

    const response = jsonObject(result)
    const oldPaths = Array.isArray(response.storage_paths_eliminar) ? response.storage_paths_eliminar.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
    if (oldPaths.length > 0) {
      const { error: cleanupError } = await adminClient.storage.from('documentos').remove(oldPaths)
      if (cleanupError) {
        await adminClient.from('auditoria_eventos').insert({
          actor_user_id: actorUserId,
          empresa_id: companyId,
          accion: 'limpieza_storage_carpeta_tributaria_fallida',
          entidad: 'archivo_ingesta',
          entidad_id: intakeId,
          module: 'Documentos',
          description: 'La Carpeta Tributaria fue reemplazada, pero quedaron archivos privados pendientes de limpieza en Storage.',
          result: 'fallido',
          source: 'inteligencia_artificial',
          metadata: { cantidad: oldPaths.length },
        })
      }
    }

    await notifyCompany({
      adminClient,
      empresaId: companyId,
      event: typeCode === 'CARPETA_TRIBUTARIA' ? 'carpeta_tributaria_actualizada' : 'documento_publicado_ia',
      subject: typeCode === 'CARPETA_TRIBUTARIA' ? 'Su Carpeta Tributaria fue actualizada' : `Nuevo documento disponible: ${intake.nombre_original}`,
      title: typeCode === 'CARPETA_TRIBUTARIA' ? 'Carpeta Tributaria vigente' : 'Nueva información disponible en su portal',
      paragraphs: typeCode === 'CARPETA_TRIBUTARIA'
        ? ['SERCOPREV publicó la versión más reciente de la Carpeta Tributaria de su empresa.', 'La versión anterior fue reemplazada automáticamente para mantener una sola copia vigente.']
        : ['SERCOPREV clasificó y publicó un nuevo antecedente en la ficha documental de su empresa.'],
      details: [
        { label: 'Archivo', value: intake.nombre_original },
        { label: 'Tipo', value: DOCUMENT_TYPES[typeCode].label },
        { label: 'Periodo', value: period },
      ],
      ctaLabel: 'Abrir portal',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/documentos`,
    })

    revalidatePath('/admin/documentos-masivos')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/documentos')
    return NextResponse.json({ status: 'ok', autoPublished: true, result: response })
  } catch (error) {
    await adminClient.storage.from('documentos').move(targetPath, intake.storage_path)
    await adminClient.from('archivos_ingesta').update({ estado: 'Revisión', error_mensaje: 'La clasificación IA se completó, pero la publicación automática requiere revisión.' }).eq('id', intakeId)
    console.error('DOCUMENT_AI_PUBLISH_FAILED', error)
    return NextResponse.json({ status: 'review', autoPublished: false, error: 'AUTO_PUBLISH_FAILED' }, { status: 202 })
  }
}
