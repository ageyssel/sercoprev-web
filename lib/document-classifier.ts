import {
  DOCUMENT_TYPES,
  documentCategoryForType,
  type DocumentCategory,
  type DocumentTypeCode,
} from '@/lib/document-types'

export type CompanyReference = {
  id: string
  rut: string
  razonSocial: string
  nombreFantasia?: string | null
}

export type DocumentClassification = {
  companyId: string | null
  category: DocumentCategory | 'Sin clasificar'
  documentTypeCode: DocumentTypeCode
  period: string | null
  documentDate: string | null
  detectedRut: string | null
  confidence: number
  status: 'Confirmada' | 'Revisión'
  reasons: string[]
  exactRutMatch: boolean
}

const MONTHS: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
}

export function normalizeDocumentText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function normalizeRut(value: string) {
  return value.replace(/[^0-9kK]/g, '').toUpperCase()
}

export function isValidChileanRut(value: string) {
  const normalized = normalizeRut(value)
  if (!/^\d{7,8}[0-9K]$/.test(normalized)) return false
  const body = normalized.slice(0, -1)
  const verifier = normalized.slice(-1)
  let factor = 2
  let sum = 0
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const result = 11 - (sum % 11)
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result)
  return verifier === expected
}

export function extractValidRuts(value: string) {
  const candidates = value.match(/\b\d{1,2}[.]?\d{3}[.]?\d{3}[-_ ]?[0-9kK]\b/g) ?? []
  return [...new Set(candidates.map(normalizeRut).filter(isValidChileanRut))]
}

function extractPeriod(value: string) {
  const text = normalizeDocumentText(value)
  const explicitPeriod = text.match(/(?:periodo(?: tributario| remuneracional| de remuneraciones)?|mes)\s*[:\-]?\s*(0?[1-9]|1[0-2])[-/ ](20\d{2})/)
  if (explicitPeriod) {
    const month = explicitPeriod[1].padStart(2, '0')
    return { period: `${explicitPeriod[2]}-${month}`, date: `${explicitPeriod[2]}-${month}-01` }
  }

  const iso = text.match(/\b(20\d{2})[-_. /](0[1-9]|1[0-2])(?:[-_. /]([0-3]\d))?\b/)
  if (iso) {
    return {
      period: `${iso[1]}-${iso[2]}`,
      date: iso[3] ? `${iso[1]}-${iso[2]}-${iso[3]}` : `${iso[1]}-${iso[2]}-01`,
    }
  }

  const compact = text.match(/\b(20\d{2})(0[1-9]|1[0-2])\b/)
  if (compact) return { period: `${compact[1]}-${compact[2]}`, date: `${compact[1]}-${compact[2]}-01` }

  const monthName = Object.keys(MONTHS).find((month) => text.includes(month))
  const year = text.match(/\b(20\d{2})\b/)?.[1]
  if (monthName && year) return { period: `${year}-${MONTHS[monthName]}`, date: `${year}-${MONTHS[monthName]}-01` }

  return { period: null, date: null }
}

const TYPE_RULES: Array<{ code: DocumentTypeCode; terms: string[] }> = [
  { code: 'CARPETA_TRIBUTARIA', terms: ['carpeta tributaria electronica', 'carpeta tributaria', 'informacion del contribuyente'] },
  { code: 'FORMULARIO_29', terms: ['formulario 29', 'formulario f29', 'f29'] },
  { code: 'FORMULARIO_22', terms: ['formulario 22', 'formulario f22', 'f22'] },
  { code: 'DECLARACION_JURADA', terms: ['declaracion jurada', 'dj 1887', 'dj1887', 'dj 1879', 'dj1879'] },
  { code: 'REGISTRO_COMPRAS_VENTAS', terms: ['registro de compras y ventas', 'registro compras ventas', 'rcv'] },
  { code: 'COMPROBANTE_TGR', terms: ['tesoreria general de la republica', 'comprobante tgr', 'tgr'] },
  { code: 'LIQUIDACION_SUELDO', terms: ['liquidacion de sueldo', 'liquidacion remuneracion'] },
  { code: 'LIBRO_REMUNERACIONES', terms: ['libro de remuneraciones electronico', 'libro remuneraciones', 'lre'] },
  { code: 'PLANILLA_PREVIRED', terms: ['previred', 'planilla de cotizaciones', 'declaracion y pago de cotizaciones'] },
  { code: 'ANEXO_CONTRATO', terms: ['anexo de contrato', 'anexo contrato'] },
  { code: 'CONTRATO_TRABAJO', terms: ['contrato de trabajo', 'contrato trabajo'] },
  { code: 'FINIQUITO', terms: ['finiquito de trabajo', 'finiquito'] },
  { code: 'LICENCIA_MEDICA', terms: ['licencia medica', 'formulario de licencia'] },
  { code: 'CERTIFICADO_F30_1', terms: ['f30-1', 'f30 1', 'certificado de cumplimiento de obligaciones laborales y previsionales'] },
  { code: 'CERTIFICADO_F30', terms: ['f30', 'certificado de antecedentes laborales y previsionales'] },
  { code: 'CONCILIACION_BANCARIA', terms: ['conciliacion bancaria'] },
  { code: 'CARTOLA_BANCARIA', terms: ['cartola bancaria', 'estado de cuenta corriente', 'movimientos cuenta corriente'] },
  { code: 'BALANCE_CLASIFICADO', terms: ['balance clasificado'] },
  { code: 'BALANCE_GENERAL', terms: ['balance general', 'balance tributario'] },
  { code: 'ESTADO_RESULTADOS', terms: ['estado de resultados', 'estado resultado'] },
  { code: 'LIBRO_DIARIO', terms: ['libro diario'] },
  { code: 'LIBRO_MAYOR', terms: ['libro mayor'] },
  { code: 'INVENTARIO_BALANCES', terms: ['inventario y balances', 'libro de inventarios'] },
  { code: 'CERTIFICADO_VIGENCIA', terms: ['certificado de vigencia', 'vigencia de sociedad'] },
  { code: 'ESCRITURA', terms: ['escritura publica', 'constitucion de sociedad', 'estatutos sociales'] },
  { code: 'PODER', terms: ['poder especial', 'mandato judicial', 'mandato general'] },
]

export function classifyDocumentType(value: string): DocumentTypeCode {
  const text = normalizeDocumentText(value)
  return TYPE_RULES.find((rule) => rule.terms.some((term) => text.includes(term)))?.code ?? 'SIN_CLASIFICAR'
}

function findCompany(value: string, companies: CompanyReference[]) {
  const validRuts = extractValidRuts(value)
  for (const rut of validRuts) {
    const matches = companies.filter((company) => normalizeRut(company.rut) === rut)
    if (matches.length === 1) return { companyId: matches[0].id, rut, exactRutMatch: true, reason: 'RUT válido y único identificado en el documento.' }
  }

  const text = normalizeDocumentText(value)
  const nameMatches = companies.filter((company) => {
    const fantasy = normalizeDocumentText(company.nombreFantasia ?? '')
    const legal = normalizeDocumentText(company.razonSocial)
    return (fantasy.length >= 4 && text.includes(fantasy)) || (legal.length >= 5 && text.includes(legal))
  })
  if (nameMatches.length === 1) {
    return { companyId: nameMatches[0].id, rut: null, exactRutMatch: false, reason: 'Empresa identificada por razón social o nombre de fantasía.' }
  }
  return { companyId: null, rut: validRuts[0] ?? null, exactRutMatch: false, reason: validRuts.length > 0 ? 'Se detectaron RUT, pero ninguno identifica de forma única a un cliente.' : 'Empresa no identificada de forma inequívoca.' }
}

export function classifyDocumentText(value: string, companies: CompanyReference[], source: 'nombre' | 'contenido' = 'contenido'): DocumentClassification {
  const company = findCompany(value, companies)
  const { period, date } = extractPeriod(value)
  const documentTypeCode = classifyDocumentType(value)
  const category = documentTypeCode === 'SIN_CLASIFICAR' ? 'Sin clasificar' : documentCategoryForType(documentTypeCode)
  const reasons: string[] = [company.reason]
  let confidence = company.exactRutMatch ? 60 : company.companyId ? 42 : 0

  if (documentTypeCode !== 'SIN_CLASIFICAR') {
    confidence += source === 'contenido' ? 25 : 20
    reasons.push(`Tipo detectado: ${DOCUMENT_TYPES[documentTypeCode].label}.`)
  } else {
    reasons.push('Tipo documental no identificado.')
  }

  if (period) {
    confidence += 15
    reasons.push(`Periodo detectado: ${period}.`)
  } else if (documentTypeCode !== 'SIN_CLASIFICAR' && !DOCUMENT_TYPES[documentTypeCode].periodRequired) {
    confidence += 10
    reasons.push('Este tipo documental no exige un periodo mensual.')
  } else {
    reasons.push('Periodo no identificado.')
  }

  confidence = Math.min(100, confidence)
  const status: DocumentClassification['status'] = company.companyId
    && documentTypeCode !== 'SIN_CLASIFICAR'
    && confidence >= 85
    ? 'Confirmada'
    : 'Revisión'

  return {
    companyId: company.companyId,
    category,
    documentTypeCode,
    period,
    documentDate: date,
    detectedRut: company.rut,
    confidence,
    status,
    reasons,
    exactRutMatch: company.exactRutMatch,
  }
}

export function classifyDocumentFilename(filename: string, companies: CompanyReference[]) {
  return classifyDocumentText(filename, companies, 'nombre')
}
