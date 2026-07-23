export type CompanyReference = {
  id: string
  rut: string
  razonSocial: string
  nombreFantasia?: string | null
}

export type DocumentClassification = {
  companyId: string | null
  category: 'Impuestos' | 'Remuneraciones' | 'Legal' | 'Contabilidad' | 'Tributario' | 'Laboral' | 'Bancario' | 'Contratos' | 'Sin clasificar'
  period: string | null
  documentDate: string | null
  detectedRut: string | null
  confidence: number
  status: 'Confirmada' | 'Revisión'
  reasons: string[]
}

const MONTHS: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
}

function normalize(value: string) {
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

function extractRut(filename: string) {
  const candidates = filename.match(/\b\d{1,2}[.]?\d{3}[.]?\d{3}[-_ ]?[0-9kK]\b/g) ?? []
  return candidates.map(normalizeRut).find((item) => item.length >= 8 && item.length <= 9) ?? null
}

function extractPeriod(filename: string) {
  const text = normalize(filename)
  const iso = text.match(/\b(20\d{2})[-_. ](0[1-9]|1[0-2])(?:[-_. ]([0-3]\d))?\b/)
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

function classifyCategory(filename: string): DocumentClassification['category'] {
  const text = normalize(filename)
  const groups: Array<{ category: DocumentClassification['category']; terms: string[] }> = [
    { category: 'Tributario', terms: ['carpeta tributaria', 'situacion tributaria', 'formulario 22', 'f22', 'renta anual', 'registro empresas'] },
    { category: 'Impuestos', terms: ['formulario 29', 'f29', 'iva', 'impuesto pagado', 'tgr', 'declaracion mensual'] },
    { category: 'Remuneraciones', terms: ['liquidacion', 'libro remuneraciones', 'lre', 'previred', 'dj1887', 'sueldo'] },
    { category: 'Laboral', terms: ['f30', 'obligaciones laborales', 'cotizaciones', 'licencia medica', 'vacaciones'] },
    { category: 'Contratos', terms: ['contrato trabajo', 'anexo contrato', 'finiquito'] },
    { category: 'Contabilidad', terms: ['balance', 'libro diario', 'libro mayor', 'estado resultado', 'inventario balance', 'rcv', 'compras ventas'] },
    { category: 'Bancario', terms: ['cartola', 'banco', 'cuenta corriente', 'movimiento bancario', 'conciliacion'] },
    { category: 'Legal', terms: ['escritura', 'estatuto', 'constitucion', 'certificado vigencia', 'poder'] },
  ]

  return groups.find((group) => group.terms.some((term) => text.includes(term)))?.category ?? 'Sin clasificar'
}

export function classifyDocumentFilename(filename: string, companies: CompanyReference[]): DocumentClassification {
  const detectedRut = extractRut(filename)
  const { period, date } = extractPeriod(filename)
  const category = classifyCategory(filename)
  const reasons: string[] = []
  let confidence = 0
  let companyId: string | null = null

  if (detectedRut) {
    const matches = companies.filter((company) => normalizeRut(company.rut) === detectedRut)
    if (matches.length === 1) {
      companyId = matches[0].id
      confidence += 60
      reasons.push('RUT único identificado en el nombre del archivo.')
    } else if (matches.length > 1) {
      reasons.push('El RUT coincide con más de una empresa y requiere revisión.')
    } else {
      reasons.push('Se detectó un RUT, pero no corresponde a una empresa registrada.')
    }
  } else {
    const text = normalize(filename)
    const matches = companies.filter((company) => {
      const fantasy = normalize(company.nombreFantasia ?? '')
      const legal = normalize(company.razonSocial)
      return (fantasy.length >= 4 && text.includes(fantasy)) || (legal.length >= 5 && text.includes(legal))
    })
    if (matches.length === 1) {
      companyId = matches[0].id
      confidence += 45
      reasons.push('Empresa identificada por su nombre.')
    } else {
      reasons.push('No se pudo identificar una empresa de forma inequívoca.')
    }
  }

  if (category !== 'Sin clasificar') {
    confidence += 20
    reasons.push(`Categoría detectada: ${category}.`)
  } else {
    reasons.push('Categoría no identificada.')
  }

  if (period) {
    confidence += 20
    reasons.push(`Periodo detectado: ${period}.`)
  } else {
    reasons.push('Periodo no identificado.')
  }

  confidence = Math.min(100, confidence)
  const status: DocumentClassification['status'] = companyId && category !== 'Sin clasificar' && confidence >= 80
    ? 'Confirmada'
    : 'Revisión'

  return {
    companyId,
    category,
    period,
    documentDate: date,
    detectedRut,
    confidence,
    status,
    reasons,
  }
}
