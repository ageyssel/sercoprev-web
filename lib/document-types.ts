export const DOCUMENT_CATEGORIES = [
  'Impuestos',
  'Remuneraciones',
  'Legal',
  'Contabilidad',
  'Tributario',
  'Laboral',
  'Bancario',
  'Contratos',
] as const

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number]

export const DOCUMENT_TYPES = {
  CARPETA_TRIBUTARIA: { label: 'Carpeta Tributaria', category: 'Tributario', periodRequired: false, replacePrevious: true },
  FORMULARIO_29: { label: 'Formulario 29', category: 'Impuestos', periodRequired: true, replacePrevious: false },
  FORMULARIO_22: { label: 'Formulario 22', category: 'Tributario', periodRequired: true, replacePrevious: false },
  DECLARACION_JURADA: { label: 'Declaración jurada', category: 'Tributario', periodRequired: true, replacePrevious: false },
  REGISTRO_COMPRAS_VENTAS: { label: 'Registro de compras y ventas', category: 'Contabilidad', periodRequired: true, replacePrevious: false },
  COMPROBANTE_TGR: { label: 'Comprobante de Tesorería', category: 'Impuestos', periodRequired: false, replacePrevious: false },
  LIQUIDACION_SUELDO: { label: 'Liquidación de sueldo', category: 'Remuneraciones', periodRequired: true, replacePrevious: false },
  LIBRO_REMUNERACIONES: { label: 'Libro de remuneraciones', category: 'Remuneraciones', periodRequired: true, replacePrevious: false },
  PLANILLA_PREVIRED: { label: 'Planilla PREVIRED', category: 'Remuneraciones', periodRequired: true, replacePrevious: false },
  CONTRATO_TRABAJO: { label: 'Contrato de trabajo', category: 'Contratos', periodRequired: false, replacePrevious: false },
  ANEXO_CONTRATO: { label: 'Anexo de contrato', category: 'Contratos', periodRequired: false, replacePrevious: false },
  FINIQUITO: { label: 'Finiquito', category: 'Contratos', periodRequired: false, replacePrevious: false },
  LICENCIA_MEDICA: { label: 'Licencia médica', category: 'Laboral', periodRequired: false, replacePrevious: false },
  CERTIFICADO_F30: { label: 'Certificado F30', category: 'Laboral', periodRequired: false, replacePrevious: false },
  CERTIFICADO_F30_1: { label: 'Certificado F30-1', category: 'Laboral', periodRequired: false, replacePrevious: false },
  CARTOLA_BANCARIA: { label: 'Cartola bancaria', category: 'Bancario', periodRequired: true, replacePrevious: false },
  CONCILIACION_BANCARIA: { label: 'Conciliación bancaria', category: 'Bancario', periodRequired: true, replacePrevious: false },
  BALANCE_GENERAL: { label: 'Balance general', category: 'Contabilidad', periodRequired: true, replacePrevious: false },
  BALANCE_CLASIFICADO: { label: 'Balance clasificado', category: 'Contabilidad', periodRequired: true, replacePrevious: false },
  ESTADO_RESULTADOS: { label: 'Estado de resultados', category: 'Contabilidad', periodRequired: true, replacePrevious: false },
  LIBRO_DIARIO: { label: 'Libro diario', category: 'Contabilidad', periodRequired: true, replacePrevious: false },
  LIBRO_MAYOR: { label: 'Libro mayor', category: 'Contabilidad', periodRequired: true, replacePrevious: false },
  INVENTARIO_BALANCES: { label: 'Inventario y balances', category: 'Contabilidad', periodRequired: true, replacePrevious: false },
  ESCRITURA: { label: 'Escritura o constitución', category: 'Legal', periodRequired: false, replacePrevious: false },
  CERTIFICADO_VIGENCIA: { label: 'Certificado de vigencia', category: 'Legal', periodRequired: false, replacePrevious: false },
  PODER: { label: 'Poder', category: 'Legal', periodRequired: false, replacePrevious: false },
  OTRO_TRIBUTARIO: { label: 'Otro documento tributario', category: 'Tributario', periodRequired: false, replacePrevious: false },
  OTRO_LABORAL: { label: 'Otro documento laboral', category: 'Laboral', periodRequired: false, replacePrevious: false },
  OTRO_CONTABLE: { label: 'Otro documento contable', category: 'Contabilidad', periodRequired: false, replacePrevious: false },
  OTRO_LEGAL: { label: 'Otro documento legal', category: 'Legal', periodRequired: false, replacePrevious: false },
  SIN_CLASIFICAR: { label: 'Sin clasificar', category: 'Tributario', periodRequired: false, replacePrevious: false },
} as const satisfies Record<string, { label: string; category: DocumentCategory; periodRequired: boolean; replacePrevious: boolean }>

export type DocumentTypeCode = keyof typeof DOCUMENT_TYPES

export const DOCUMENT_TYPE_CODES = Object.keys(DOCUMENT_TYPES) as DocumentTypeCode[]

export function isDocumentCategory(value: string): value is DocumentCategory {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(value)
}

export function isDocumentTypeCode(value: string): value is DocumentTypeCode {
  return Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES, value)
}

export function documentTypeLabel(code: string | null | undefined) {
  return code && isDocumentTypeCode(code) ? DOCUMENT_TYPES[code].label : 'Sin clasificar'
}

export function documentCategoryForType(code: DocumentTypeCode): DocumentCategory {
  return DOCUMENT_TYPES[code].category
}
