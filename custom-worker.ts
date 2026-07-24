// The OpenNext worker is generated during `npm run build:cloudflare`.
// @ts-expect-error Generated module is intentionally unavailable before the build step.
import handler from './.open-next/worker.js'
import {
  classifyDocumentText,
  extractValidRuts,
  normalizeDocumentText,
  normalizeRut,
  type CompanyReference,
} from './lib/document-classifier'
import {
  DOCUMENT_TYPE_CODES,
  DOCUMENT_TYPES,
  isDocumentTypeCode,
  type DocumentTypeCode,
} from './lib/document-types'

type WorkerSelfReference = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

type MarkdownConversion = {
  format?: string
  data?: string
  error?: string
}

type AiBinding = {
  toMarkdown(input: { name: string; blob: Blob } | Array<{ name: string; blob: Blob }>): Promise<MarkdownConversion | MarkdownConversion[]>
  run(model: string, input: unknown): Promise<unknown>
}

type WorkerEnvironment = {
  WORKER_SELF_REFERENCE: WorkerSelfReference
  AI: AiBinding
  OFFICIAL_SYNC_TOKEN?: string
  DOCUMENT_AI_TOKEN?: string
  SUPABASE_SECRET_KEY?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
}

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void
}

type IntakeRow = {
  id: string
  nombre_original: string
  storage_path: string
  mime_type: string | null
  ai_intentos: number
}

type AiClassification = {
  company_id?: unknown
  company_confidence?: unknown
  document_type_code?: unknown
  type_confidence?: unknown
  period?: unknown
  period_confidence?: unknown
  document_date?: unknown
  detected_rut?: unknown
  reasons?: unknown
  evidences?: unknown
}

const DOCUMENT_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast'
const DOCUMENT_AI_PROMPT_VERSION = 'document-ai-v1'
const DOCUMENT_AI_PATH = '/api/internal/document-ai/analyze'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PERIOD_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])$/
const DATE_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/

function numberConfidence(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : 0
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function object(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function storagePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function supabaseHeaders(env: WorkerEnvironment, extra: Record<string, string> = {}) {
  const key = env.SUPABASE_SECRET_KEY?.trim()
  if (!key) throw new Error('SUPABASE_SECRET_KEY_MISSING')
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  }
}

async function supabaseJson<T>(env: WorkerEnvironment, path: string, init?: RequestInit): Promise<T> {
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!baseUrl) throw new Error('SUPABASE_URL_MISSING')
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...supabaseHeaders(env),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`SUPABASE_HTTP_${response.status}:${(await response.text()).slice(0, 300)}`)
  if (response.status === 204) return undefined as T
  return await response.json() as T
}

async function patchIntake(env: WorkerEnvironment, intakeId: string, payload: Record<string, unknown>) {
  await supabaseJson(env, `/rest/v1/archivos_ingesta?id=eq.${encodeURIComponent(intakeId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  })
}

async function sha256(value: ArrayBuffer | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parseAiResponse(value: unknown): AiClassification {
  const result = object(value)
  const response = result.response ?? value
  if (typeof response === 'string') {
    const cleaned = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    return object(JSON.parse(cleaned)) as AiClassification
  }
  return object(response) as AiClassification
}

function candidateCompanies(markdown: string, filename: string, companies: CompanyReference[]) {
  const normalizedContent = normalizeDocumentText(markdown)
  const validRuts = new Set(extractValidRuts(markdown))
  const candidates = companies.filter((company) => {
    const normalizedRut = normalizeRut(company.rut)
    const legal = normalizeDocumentText(company.razonSocial)
    const fantasy = normalizeDocumentText(company.nombreFantasia ?? '')
    return validRuts.has(normalizedRut)
      || (legal.length >= 5 && normalizedContent.includes(legal))
      || (fantasy.length >= 4 && normalizedContent.includes(fantasy))
  })

  if (candidates.length > 0) return candidates.slice(0, 12)
  const fromFilename = classifyDocumentText(filename, companies, 'nombre')
  if (fromFilename.companyId) return companies.filter((company) => company.id === fromFilename.companyId)
  return []
}

function aiSchema(companyIds: string[]) {
  return {
    type: 'object',
    properties: {
      company_id: companyIds.length > 0
        ? { anyOf: [{ type: 'string', enum: companyIds }, { type: 'null' }] }
        : { type: 'null' },
      company_confidence: { type: 'integer', minimum: 0, maximum: 100 },
      document_type_code: { type: 'string', enum: DOCUMENT_TYPE_CODES },
      type_confidence: { type: 'integer', minimum: 0, maximum: 100 },
      period: { anyOf: [{ type: 'string', pattern: '^20\\d{2}-(0[1-9]|1[0-2])$' }, { type: 'null' }] },
      period_confidence: { type: 'integer', minimum: 0, maximum: 100 },
      document_date: { anyOf: [{ type: 'string', pattern: '^20\\d{2}-(0[1-9]|1[0-2])-([0-2]\\d|3[01])$' }, { type: 'null' }] },
      detected_rut: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      reasons: { type: 'array', items: { type: 'string' }, maxItems: 12 },
      evidences: {
        type: 'object',
        properties: {
          empresa: { type: 'array', items: { type: 'string' }, maxItems: 5 },
          tipo: { type: 'array', items: { type: 'string' }, maxItems: 5 },
          periodo: { type: 'array', items: { type: 'string' }, maxItems: 5 },
        },
        required: ['empresa', 'tipo', 'periodo'],
        additionalProperties: false,
      },
    },
    required: [
      'company_id', 'company_confidence', 'document_type_code', 'type_confidence',
      'period', 'period_confidence', 'document_date', 'detected_rut', 'reasons', 'evidences',
    ],
    additionalProperties: false,
  }
}

async function analyzeDocument(intakeId: string, env: WorkerEnvironment) {
  try {
    const intakeRows = await supabaseJson<IntakeRow[]>(env, `/rest/v1/archivos_ingesta?id=eq.${encodeURIComponent(intakeId)}&select=id,nombre_original,storage_path,mime_type,ai_intentos&limit=1`)
    const intake = intakeRows[0]
    if (!intake) throw new Error('INTAKE_NOT_FOUND')

    await patchIntake(env, intakeId, {
      estado: 'Analizando',
      ai_estado: 'Procesando',
      ai_intentos: Math.min(20, Number(intake.ai_intentos ?? 0) + 1),
      ai_proveedor: 'Cloudflare Workers AI',
      ai_modelo: DOCUMENT_AI_MODEL,
      ai_prompt_version: DOCUMENT_AI_PROMPT_VERSION,
      error_mensaje: null,
    })

    const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    if (!baseUrl) throw new Error('SUPABASE_URL_MISSING')
    const fileResponse = await fetch(`${baseUrl}/storage/v1/object/authenticated/documentos/${storagePath(intake.storage_path)}`, {
      headers: supabaseHeaders(env),
    })
    if (!fileResponse.ok) throw new Error(`DOCUMENT_DOWNLOAD_${fileResponse.status}`)
    const fileBuffer = await fileResponse.arrayBuffer()
    const conversion = await env.AI.toMarkdown({
      name: intake.nombre_original,
      blob: new Blob([fileBuffer], { type: intake.mime_type || 'application/octet-stream' }),
    })
    const converted = Array.isArray(conversion) ? conversion[0] : conversion
    if (!converted || converted.format === 'error' || !converted.data) throw new Error(`DOCUMENT_CONVERSION_FAILED:${converted?.error ?? 'EMPTY_CONTENT'}`)

    const markdown = converted.data.slice(0, 120_000)
    const companiesRows = await supabaseJson<Array<{ id: string; rut: string; razon_social: string; nombre_fantasia: string | null }>>(
      env,
      '/rest/v1/empresas?es_admin=eq.false&select=id,rut,razon_social,nombre_fantasia&limit=5000',
    )
    const companies: CompanyReference[] = companiesRows.map((company) => ({
      id: company.id,
      rut: company.rut,
      razonSocial: company.razon_social,
      nombreFantasia: company.nombre_fantasia,
    }))
    const deterministic = classifyDocumentText(markdown, companies, 'contenido')
    const candidates = candidateCompanies(markdown, intake.nombre_original, companies)
    const candidateText = candidates.length === 0
      ? 'No existen empresas candidatas seguras. Debes responder company_id null.'
      : candidates.map((company) => `${company.id} | RUT ${company.rut} | ${company.razonSocial} | ${company.nombreFantasia ?? ''}`).join('\n')
    const taxonomy = DOCUMENT_TYPE_CODES
      .filter((code) => code !== 'SIN_CLASIFICAR')
      .map((code) => `${code}: ${DOCUMENT_TYPES[code].label}; categoría ${DOCUMENT_TYPES[code].category}; periodo mensual ${DOCUMENT_TYPES[code].periodRequired ? 'requerido' : 'no obligatorio'}`)
      .join('\n')

    const aiRaw = await env.AI.run(DOCUMENT_AI_MODEL, {
      messages: [
        {
          role: 'system',
          content: [
            'Clasificas documentos contables, tributarios, laborales, bancarios y legales chilenos para SERCOPREV.',
            'No inventes empresas, RUT, periodos ni identificadores. company_id solo puede ser uno de los candidatos entregados.',
            'Distingue el RUT del contribuyente o empleador del RUT de trabajadores, proveedores, receptores o representantes.',
            'Para Carpeta Tributaria exige evidencia explícita como “Carpeta Tributaria Electrónica”, información del contribuyente, actividades económicas o secciones tributarias consolidadas.',
            'El periodo debe corresponder al periodo tributario, remuneracional o rango principal del documento, no a una fecha de descarga o impresión secundaria.',
            'Devuelve exclusivamente el JSON solicitado.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `ARCHIVO: ${intake.nombre_original}\n\nEMPRESAS CANDIDATAS:\n${candidateText}\n\nTIPOS PERMITIDOS:\n${taxonomy}\n\nCONTENIDO EXTRAÍDO:\n${markdown.slice(0, 55_000)}`,
        },
      ],
      max_tokens: 1800,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sercoprev_document_classification',
          strict: true,
          schema: aiSchema(candidates.map((company) => company.id)),
        },
      },
    })
    const ai = parseAiResponse(aiRaw)

    const validCandidateIds = new Set(candidates.map((company) => company.id))
    const aiCompanyId = typeof ai.company_id === 'string' && validCandidateIds.has(ai.company_id) ? ai.company_id : null
    const companyId = deterministic.exactRutMatch ? deterministic.companyId : aiCompanyId ?? deterministic.companyId
    const companyConfidence = deterministic.exactRutMatch
      ? 99
      : aiCompanyId
        ? Math.min(85, numberConfidence(ai.company_confidence))
        : deterministic.companyId
          ? 72
          : 0

    const aiTypeCode = typeof ai.document_type_code === 'string' && isDocumentTypeCode(ai.document_type_code)
      ? ai.document_type_code
      : 'SIN_CLASIFICAR'
    const deterministicType = deterministic.documentTypeCode
    const documentTypeCode: DocumentTypeCode = deterministicType !== 'SIN_CLASIFICAR' ? deterministicType : aiTypeCode
    const typeAgreement = deterministicType !== 'SIN_CLASIFICAR' && deterministicType === aiTypeCode
    const typeConfidence = documentTypeCode === 'SIN_CLASIFICAR'
      ? 0
      : typeAgreement
        ? Math.max(95, numberConfidence(ai.type_confidence))
        : deterministicType !== 'SIN_CLASIFICAR'
          ? 90
          : numberConfidence(ai.type_confidence)

    const aiPeriod = typeof ai.period === 'string' && PERIOD_PATTERN.test(ai.period) ? ai.period : null
    const period = deterministic.period ?? aiPeriod
    const periodConfidence = deterministic.period
      ? Math.max(90, numberConfidence(ai.period_confidence))
      : aiPeriod
        ? numberConfidence(ai.period_confidence)
        : DOCUMENT_TYPES[documentTypeCode].periodRequired
          ? 0
          : 100
    const aiDate = typeof ai.document_date === 'string' && DATE_PATTERN.test(ai.document_date) ? ai.document_date : null
    const documentDate = deterministic.documentDate ?? aiDate
    const detectedRut = deterministic.detectedRut ?? text(ai.detected_rut, 16) || null
    const weightedPeriod = DOCUMENT_TYPES[documentTypeCode].periodRequired ? periodConfidence : 100
    const overallConfidence = Math.round((companyConfidence * 0.5) + (typeConfidence * 0.35) + (weightedPeriod * 0.15))
    const aiReasons = Array.isArray(ai.reasons) ? ai.reasons.filter((item): item is string => typeof item === 'string').slice(0, 12) : []
    const reasons = [...new Set([...deterministic.reasons, ...aiReasons])].slice(0, 20)
    const exactRutMatch = deterministic.exactRutMatch
    const autoPublish = exactRutMatch
      && Boolean(companyId)
      && documentTypeCode !== 'SIN_CLASIFICAR'
      && companyConfidence >= 95
      && typeConfidence >= 90
      && (!DOCUMENT_TYPES[documentTypeCode].periodRequired || Boolean(period && periodConfidence >= 85))

    const applyResponse = await env.WORKER_SELF_REFERENCE.fetch('https://www.sercoprev.cl/api/internal/document-ai/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sercoprev-document-ai-token': env.DOCUMENT_AI_TOKEN?.trim() ?? '',
      },
      body: JSON.stringify({
        intakeId,
        companyId,
        category: documentTypeCode === 'SIN_CLASIFICAR' ? deterministic.category : DOCUMENT_TYPES[documentTypeCode].category,
        documentTypeCode,
        period,
        documentDate,
        detectedRut,
        confidence: overallConfidence,
        companyConfidence,
        typeConfidence,
        periodConfidence,
        exactRutMatch,
        autoPublish,
        reasons,
        evidences: object(ai.evidences),
        textHash: await sha256(markdown),
        aiProvider: 'Cloudflare Workers AI',
        aiModel: DOCUMENT_AI_MODEL,
        aiPromptVersion: DOCUMENT_AI_PROMPT_VERSION,
        rawResult: object(ai),
      }),
    })
    if (!applyResponse.ok && applyResponse.status !== 202) {
      throw new Error(`DOCUMENT_APPLY_${applyResponse.status}:${(await applyResponse.text()).slice(0, 300)}`)
    }
  } catch (error) {
    console.error('DOCUMENT_AI_ANALYSIS_FAILED', intakeId, error)
    await patchIntake(env, intakeId, {
      estado: 'Revisión',
      ai_estado: 'Error',
      ai_procesado_at: new Date().toISOString(),
      error_mensaje: error instanceof Error ? error.message.slice(0, 500) : 'No fue posible analizar el documento con IA.',
    }).catch((patchError) => console.error('DOCUMENT_AI_ERROR_STATE_FAILED', patchError))
  }
}

async function synchronizeOfficialData(env: WorkerEnvironment) {
  const token = env.OFFICIAL_SYNC_TOKEN?.trim()
  if (!token) {
    console.error('OFFICIAL_SYNC_TOKEN is not configured; official data synchronization was skipped.')
    return
  }

  const response = await env.WORKER_SELF_REFERENCE.fetch('https://www.sercoprev.cl/api/internal/sync-official-data', {
    method: 'POST',
    headers: {
      'x-sercoprev-sync-token': token,
      'user-agent': 'SERCOPREV-Official-Data-Scheduler/1.0',
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OFFICIAL_SYNC_HTTP_${response.status}:${body.slice(0, 300)}`)
  }

  console.log('Official data synchronization completed.', await response.text())
}

export default {
  async fetch(request: Request, env: WorkerEnvironment, context: WorkerContext) {
    const url = new URL(request.url)
    if (url.pathname === DOCUMENT_AI_PATH) {
      if (request.method !== 'POST') return new NextResponse(null, { status: 404 })
      const expected = env.DOCUMENT_AI_TOKEN?.trim()
      const provided = request.headers.get('x-sercoprev-document-ai-token')?.trim()
      if (!expected || !provided || expected !== provided) return new Response(null, { status: 404 })
      const payload = object(await request.json().catch(() => null))
      const intakeId = text(payload.intakeId, 40)
      if (!UUID_PATTERN.test(intakeId)) return Response.json({ status: 'error', error: 'INVALID_INTAKE' }, { status: 400 })
      context.waitUntil(analyzeDocument(intakeId, env))
      return Response.json({ status: 'accepted', intakeId }, { status: 202 })
    }
    return handler.fetch(request, env, context)
  },
  async scheduled(_event: unknown, env: WorkerEnvironment, context: WorkerContext) {
    context.waitUntil(synchronizeOfficialData(env))
  },
}
