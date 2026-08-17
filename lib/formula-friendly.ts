export type FormulaVariableDefinition = {
  code: string
  description?: string
}

export type FriendlyVariableKind = 'money' | 'percent' | 'days' | 'boolean' | 'uf' | 'number'

export type FriendlyVariableMeta = {
  label: string
  help: string
  kind: FriendlyVariableKind
  prefix?: string
  suffix?: string
  step?: string
  min?: number
  max?: number
  sample: number
}

export type FriendlyNumberControl = {
  name: string
  label: string
  help: string
  value: number
  suffix?: string
  step: string
  min: number
  max: number
}

export type FriendlyTermControl = {
  code: string
  label: string
  operation: 'sumar' | 'restar'
  included: boolean
}

const BOOLEAN_LABELS: Record<string, string> = {
  PAYMENT_MODE_MONTHLY: 'Contrato con remuneración mensual',
  IS_ARTICLE_50: 'Aplica gratificación del artículo 50',
  HAS_HEALTH: 'Corresponde cotización de salud',
  AFC_APPLIES: 'Corresponde seguro de cesantía',
  IS_INDEFINITE: 'Contrato indefinido',
  IS_HONORARIOS: 'Contrato a honorarios',
}

const SAMPLE_VALUES: Record<string, number> = {
  SALARY_BASE: 750000,
  WORKED_DAYS: 30,
  REST_DAYS: 4,
  VARIABLE_EARNINGS_WEEK_RUN: 120000,
  SALARY_BASE_PAID: 750000,
  MOVEMENT_TAXABLE: 100000,
  MOVEMENT_INCOME_TAXABLE: 100000,
  MOVEMENT_NON_TAXABLE: 60000,
  WEEK_RUN: 16000,
  GRATIFICATION: 212500,
  INGRESO_MINIMO: 539000,
  MEAL_ALLOWANCE_DAILY: 3500,
  TRANSPORT_ALLOWANCE_DAILY: 3500,
  DAILY_ALLOWANCES: 210000,
  TAXABLE_EARNINGS: 1000000,
  NON_TAXABLE_EARNINGS: 120000,
  INCOME_TAXABLE_EARNINGS: 1000000,
  TOPE_AFP_UF: 90,
  TOPE_SALUD_UF: 90,
  TOPE_AFC_UF: 135,
  UF: 40000,
  PENSION_BASE: 1000000,
  HEALTH_BASE: 1000000,
  UNEMPLOYMENT_BASE: 1000000,
  AFP_RATE: 11.44,
  HEALTH_RATE: 7,
  AFC_WORKER_RATE: 0.6,
  AFC_EMPLOYER_INDEFINITE_RATE: 2.4,
  AFC_EMPLOYER_TERM_RATE: 3,
  SIS_RATE: 1.78,
  LEGAL_HEALTH: 70000,
  HEALTH_PLAN: 85000,
  AFP_WORKER: 114400,
  UNEMPLOYMENT_WORKER: 6000,
  UNEMPLOYMENT_EMPLOYER: 24000,
  SIS_EMPLOYER: 17800,
  EMPLOYER_MANUAL: 0,
  LEGAL_DEDUCTIONS: 190400,
  OTHER_DEDUCTIONS: 20000,
  TAX_BASE: 809600,
}

function cleanDescription(description: string | undefined, fallback: string) {
  const text = (description ?? '').trim()
  if (!text) return fallback
  return text.replace(/^1 si /i, '').replace(/^0 si /i, '')
}

export function getFriendlyVariableMeta(variable: FormulaVariableDefinition): FriendlyVariableMeta {
  const code = variable.code.toUpperCase()
  const fallback = code.toLowerCase().replaceAll('_', ' ')
  const boolean = code.startsWith('IS_') || code.startsWith('HAS_') || code.endsWith('_APPLIES') || code.includes('MODE_MONTHLY')

  if (boolean) {
    return {
      label: BOOLEAN_LABELS[code] ?? cleanDescription(variable.description, fallback),
      help: 'Seleccione Sí o No.',
      kind: 'boolean',
      sample: 1,
    }
  }

  if (code.includes('RATE')) {
    return {
      label: cleanDescription(variable.description, fallback),
      help: 'Ingrese el porcentaje tal como lo lee normalmente. Ejemplo: 7 para 7%.',
      kind: 'percent',
      suffix: '%',
      step: '0.01',
      min: 0,
      max: 100,
      sample: SAMPLE_VALUES[code] ?? 7,
    }
  }

  if (code.endsWith('_DAYS') || code.includes('DAYS')) {
    return {
      label: cleanDescription(variable.description, fallback),
      help: 'Cantidad de días utilizada por la operación.',
      kind: 'days',
      suffix: 'días',
      step: '1',
      min: 0,
      max: 366,
      sample: SAMPLE_VALUES[code] ?? 30,
    }
  }

  if (code.includes('_UF') && code !== 'UF') {
    return {
      label: cleanDescription(variable.description, fallback),
      help: 'Cantidad expresada en UF.',
      kind: 'uf',
      suffix: 'UF',
      step: '0.01',
      min: 0,
      max: 10000,
      sample: SAMPLE_VALUES[code] ?? 90,
    }
  }

  const looksMoney = code === 'UF'
    || code.includes('SALARY')
    || code.includes('EARNINGS')
    || code.includes('BASE')
    || code.includes('ALLOWANCE')
    || code.includes('DEDUCTION')
    || code.includes('HEALTH_PLAN')
    || code.includes('HEALTH')
    || code.includes('GRATIFICATION')
    || code.includes('MOVEMENT')
    || code.includes('INGRESO_MINIMO')
    || code.includes('EMPLOYER_MANUAL')
    || code.includes('AFP_WORKER')
    || code.includes('UNEMPLOYMENT')
    || code.includes('SIS_EMPLOYER')
    || code.includes('TAXABLE')
    || code.includes('TAX_BASE')

  if (looksMoney) {
    return {
      label: cleanDescription(variable.description, fallback),
      help: 'Monto en pesos chilenos.',
      kind: 'money',
      prefix: '$',
      step: '1',
      min: 0,
      max: 1_000_000_000_000,
      sample: SAMPLE_VALUES[code] ?? 750000,
    }
  }

  return {
    label: cleanDescription(variable.description, fallback),
    help: 'Valor numérico utilizado por la operación.',
    kind: 'number',
    step: '0.01',
    min: -1_000_000_000,
    max: 1_000_000_000,
    sample: SAMPLE_VALUES[code] ?? 1,
  }
}

export function friendlyInputName(code: string) {
  return `input__${code.toUpperCase()}`
}

export function friendlyInputToEngineValue(variable: FormulaVariableDefinition, raw: string) {
  const meta = getFriendlyVariableMeta(variable)
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`Ingrese un valor válido para “${meta.label}”.`)
  if (meta.kind === 'boolean') return value === 0 ? 0 : 1
  if (meta.kind === 'percent') return value / 100
  return value
}

const OPERATION_GUIDES: Record<string, string[]> = {
  SUELDO_BASE_PAGADO: [
    'Identifica si la remuneración es mensual o corresponde a otra modalidad.',
    'Si es mensual, divide el sueldo base por los días estándar del mes y obtiene el valor diario.',
    'Multiplica ese valor por los días efectivamente trabajados y redondea el resultado al peso.',
  ],
  SEMANA_CORRIDA: [
    'Toma los haberes variables que forman parte de la semana corrida.',
    'Los divide por los días trabajados para obtener el valor diario.',
    'Multiplica el valor diario por los días de descanso pagables. Si no hay días trabajados, el resultado es $0.',
  ],
  GRATIFICACION: [
    'Suma sueldo base pagado, otros haberes imponibles y semana corrida.',
    'Calcula el porcentaje de gratificación sobre esa suma.',
    'Calcula en paralelo el tope mensual usando el ingreso mínimo y el factor legal configurado.',
    'Usa el menor de ambos valores cuando corresponde el artículo 50; si no corresponde, el resultado es $0.',
  ],
  ASIGNACIONES_DIARIAS: [
    'Suma la asignación diaria de colación y la asignación diaria de movilización.',
    'Multiplica el total diario por los días trabajados.',
    'Redondea el resultado final al peso.',
  ],
  TOTAL_IMPONIBLE: [
    'Reúne todos los conceptos configurados como imponibles.',
    'Suma sueldo base pagado, gratificación, semana corrida y movimientos imponibles que estén incluidos en la regla.',
    'Redondea el total al peso.',
  ],
  TOTAL_TRIBUTABLE: [
    'Reúne los conceptos que forman renta afecta a impuesto.',
    'Suma los componentes tributables habilitados en la regla.',
    'Redondea el total al peso.',
  ],
  TOTAL_NO_IMPONIBLE: [
    'Reúne movimientos no imponibles y asignaciones que no forman base previsional.',
    'Suma los componentes habilitados en la regla.',
    'Redondea el total al peso.',
  ],
  BASE_AFP: [
    'Toma el total imponible del trabajador.',
    'Convierte el tope AFP desde UF a pesos multiplicando el tope por el valor UF del periodo.',
    'Usa el menor valor entre el imponible real y el tope en pesos.',
  ],
  BASE_SALUD: [
    'Toma el total imponible del trabajador.',
    'Convierte el tope de salud desde UF a pesos.',
    'Usa el menor valor entre el imponible real y el tope en pesos.',
  ],
  BASE_AFC: [
    'Toma el total imponible del trabajador.',
    'Convierte el tope del seguro de cesantía desde UF a pesos.',
    'Usa el menor valor entre el imponible real y el tope en pesos.',
  ],
  AFP_TRABAJADOR: [
    'Toma la base AFP ya topada.',
    'Multiplica la base por la tasa AFP vigente del trabajador.',
    'Redondea la cotización al peso.',
  ],
  SALUD_LEGAL: [
    'Comprueba si corresponde cotización de salud.',
    'Multiplica la base de salud topada por la tasa legal vigente.',
    'Si no corresponde salud, el resultado es $0; en caso contrario redondea al peso.',
  ],
  SALUD_TRABAJADOR: [
    'Compara la cotización legal de salud con el valor del plan de salud.',
    'Utiliza el mayor de ambos valores como descuento de salud del trabajador.',
  ],
  AFC_TRABAJADOR: [
    'Comprueba si corresponde AFC y si el contrato es indefinido.',
    'Multiplica la base AFC topada por la tasa del trabajador.',
    'Si no corresponde, el resultado es $0; si corresponde, redondea al peso.',
  ],
  AFC_EMPLEADOR: [
    'Comprueba si corresponde AFC.',
    'Selecciona la tasa del empleador según contrato indefinido o plazo fijo/obra.',
    'Multiplica la base AFC por la tasa seleccionada y redondea al peso.',
  ],
  SIS_EMPLEADOR: [
    'Comprueba si el contrato es a honorarios.',
    'Si no es a honorarios, multiplica la base AFP por la tasa SIS del empleador.',
    'Redondea el resultado al peso; en honorarios el resultado es $0.',
  ],
  BASE_IMPUESTO: [
    'Parte desde el total tributable.',
    'Resta los descuentos legales habilitados en la regla: AFP, salud legal y/o AFC del trabajador.',
    'Si el resultado fuera negativo, utiliza $0 como base mínima.',
  ],
  IMPUESTO_UNICO: [
    'Toma la base de impuesto ya depurada.',
    'Busca el tramo correspondiente en la tabla de Impuesto Único vigente.',
    'Aplica factor y rebaja del tramo y entrega el impuesto final redondeado.',
  ],
  APORTES_EMPLEADOR: [
    'Reúne los aportes que son costo del empleador.',
    'Suma AFC empleador, SIS y otros aportes manuales que estén habilitados.',
    'Redondea el total al peso.',
  ],
  LIQUIDO_PAGAR: [
    'Suma los haberes imponibles y no imponibles habilitados.',
    'Resta descuentos legales y otros descuentos habilitados.',
    'Redondea el resultado final al peso. Ese es el líquido a pagar al trabajador.',
  ],
}

export function getFriendlyOperationGuide(code: string) {
  return OPERATION_GUIDES[code.toUpperCase()] ?? [
    'Toma los valores indicados en la sección “Datos que intervienen”.',
    'Ejecuta la regla contable configurada para este concepto.',
    'Entrega el resultado final sin exponer código ni lenguaje de programación.',
  ]
}

function literal(value: number) {
  if (!Number.isFinite(value)) throw new Error('La configuración contiene un número inválido.')
  return Number(value.toFixed(8)).toString()
}

function matchNumber(expression: string, regex: RegExp, fallback: number) {
  const match = expression.match(regex)
  const value = match ? Number(match[1]) : fallback
  return Number.isFinite(value) ? value : fallback
}

export function getFriendlyNumberControls(code: string, expression: string): FriendlyNumberControl[] {
  const normalizedCode = code.toUpperCase()
  if (normalizedCode === 'SUELDO_BASE_PAGADO') {
    const divisor = matchNumber(expression, /SALARY_BASE\s*\/\s*([0-9]+(?:\.[0-9]+)?)/i, 30)
    return [{
      name: 'rule_month_divisor',
      label: 'Días estándar del mes para prorratear',
      help: 'Ejemplo habitual: 30 días. SERCOPREV usa este número sólo cuando la remuneración es mensual.',
      value: divisor,
      suffix: 'días',
      step: '1',
      min: 1,
      max: 366,
    }]
  }

  if (normalizedCode === 'GRATIFICACION') {
    const factor = matchNumber(expression, /\)\s*\*\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*\(INGRESO_MINIMO/i, 0.25)
    const minimumMultiplier = matchNumber(expression, /INGRESO_MINIMO\s*\*\s*([0-9]+(?:\.[0-9]+)?)/i, 4.75)
    const months = matchNumber(expression, /\(INGRESO_MINIMO\s*\*\s*[0-9]+(?:\.[0-9]+)?\)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/i, 12)
    return [
      {
        name: 'rule_gratification_percent',
        label: 'Porcentaje de gratificación',
        help: 'Se muestra como porcentaje normal. Ejemplo: 25 significa 25%.',
        value: factor * 100,
        suffix: '%',
        step: '0.01',
        min: 0,
        max: 100,
      },
      {
        name: 'rule_minimum_income_multiplier',
        label: 'Multiplicador del ingreso mínimo para el tope',
        help: 'Factor utilizado para construir el tope legal antes de llevarlo a valor mensual.',
        value: minimumMultiplier,
        step: '0.01',
        min: 0,
        max: 100,
      },
      {
        name: 'rule_months_divisor',
        label: 'Meses usados para mensualizar el tope',
        help: 'Normalmente 12 meses.',
        value: months,
        suffix: 'meses',
        step: '1',
        min: 1,
        max: 24,
      },
    ]
  }

  return []
}

type TermRule = { code: string; label: string; operation: 'sumar' | 'restar' }

const TERM_RULES: Record<string, TermRule[]> = {
  TOTAL_IMPONIBLE: [
    { code: 'SALARY_BASE_PAID', label: 'Sueldo base pagado', operation: 'sumar' },
    { code: 'GRATIFICATION', label: 'Gratificación', operation: 'sumar' },
    { code: 'WEEK_RUN', label: 'Semana corrida', operation: 'sumar' },
    { code: 'MOVEMENT_TAXABLE', label: 'Otros movimientos imponibles', operation: 'sumar' },
  ],
  TOTAL_TRIBUTABLE: [
    { code: 'SALARY_BASE_PAID', label: 'Sueldo base pagado', operation: 'sumar' },
    { code: 'GRATIFICATION', label: 'Gratificación', operation: 'sumar' },
    { code: 'WEEK_RUN', label: 'Semana corrida', operation: 'sumar' },
    { code: 'MOVEMENT_INCOME_TAXABLE', label: 'Otros movimientos tributables', operation: 'sumar' },
  ],
  TOTAL_NO_IMPONIBLE: [
    { code: 'MOVEMENT_NON_TAXABLE', label: 'Movimientos no imponibles', operation: 'sumar' },
    { code: 'DAILY_ALLOWANCES', label: 'Asignaciones diarias', operation: 'sumar' },
  ],
  BASE_IMPUESTO: [
    { code: 'AFP_WORKER', label: 'AFP trabajador', operation: 'restar' },
    { code: 'LEGAL_HEALTH', label: 'Salud legal', operation: 'restar' },
    { code: 'UNEMPLOYMENT_WORKER', label: 'AFC trabajador', operation: 'restar' },
  ],
  APORTES_EMPLEADOR: [
    { code: 'UNEMPLOYMENT_EMPLOYER', label: 'AFC empleador', operation: 'sumar' },
    { code: 'SIS_EMPLOYER', label: 'SIS empleador', operation: 'sumar' },
    { code: 'EMPLOYER_MANUAL', label: 'Otros aportes manuales', operation: 'sumar' },
  ],
  LIQUIDO_PAGAR: [
    { code: 'TAXABLE_EARNINGS', label: 'Total imponible', operation: 'sumar' },
    { code: 'NON_TAXABLE_EARNINGS', label: 'Total no imponible', operation: 'sumar' },
    { code: 'LEGAL_DEDUCTIONS', label: 'Descuentos legales', operation: 'restar' },
    { code: 'OTHER_DEDUCTIONS', label: 'Otros descuentos', operation: 'restar' },
  ],
}

export function getFriendlyTermControls(code: string, expression: string): FriendlyTermControl[] {
  const terms = TERM_RULES[code.toUpperCase()] ?? []
  const upperExpression = expression.toUpperCase()
  return terms.map((term) => ({ ...term, included: upperExpression.includes(term.code) }))
}

export function hasFriendlyRuleEditor(code: string, expression: string) {
  return getFriendlyNumberControls(code, expression).length > 0 || getFriendlyTermControls(code, expression).length > 0
}

function requireNumber(values: Record<string, string>, name: string, min: number, max: number) {
  const value = Number(values[name])
  if (!Number.isFinite(value) || value < min || value > max) throw new Error('Revise los números ingresados en la configuración de la regla.')
  return value
}

function replaceRequired(source: string, regex: RegExp, replacement: string) {
  if (!regex.test(source)) throw new Error('La versión vigente no puede editarse con el asistente visual. Revise la configuración con soporte técnico.')
  return source.replace(regex, replacement)
}

export function buildFriendlyRuleExpression(code: string, currentExpression: string, values: Record<string, string>) {
  const normalizedCode = code.toUpperCase()
  let expression = currentExpression.trim().toUpperCase()

  if (normalizedCode === 'SUELDO_BASE_PAGADO') {
    const divisor = requireNumber(values, 'rule_month_divisor', 1, 366)
    expression = replaceRequired(expression, /SALARY_BASE\s*\/\s*[0-9]+(?:\.[0-9]+)?/i, `SALARY_BASE / ${literal(divisor)}`)
    return expression
  }

  if (normalizedCode === 'GRATIFICACION') {
    const percent = requireNumber(values, 'rule_gratification_percent', 0, 100) / 100
    const multiplier = requireNumber(values, 'rule_minimum_income_multiplier', 0, 100)
    const months = requireNumber(values, 'rule_months_divisor', 1, 24)
    expression = replaceRequired(expression, /(\)\s*\*\s*)[0-9]+(?:\.[0-9]+)?(\s*,\s*\(INGRESO_MINIMO)/i, `$1${literal(percent)}$2`)
    expression = replaceRequired(expression, /(INGRESO_MINIMO\s*\*\s*)[0-9]+(?:\.[0-9]+)?/i, `$1${literal(multiplier)}`)
    expression = replaceRequired(expression, /(\(INGRESO_MINIMO\s*\*\s*[0-9]+(?:\.[0-9]+)?\)\s*\/\s*)[0-9]+(?:\.[0-9]+)?/i, `$1${literal(months)}`)
    return expression
  }

  const terms = TERM_RULES[normalizedCode]
  if (!terms?.length) throw new Error('Esta regla no requiere edición directa. Sus tasas, topes o valores se administran desde los parámetros del módulo correspondiente.')

  const selected = terms.filter((term) => values[`include__${term.code}`] === '1')

  if (normalizedCode === 'BASE_IMPUESTO') {
    const deductions = selected.filter((term) => term.operation === 'restar').map((term) => term.code)
    return `MAX(0, INCOME_TAXABLE_EARNINGS${deductions.map((item) => ` - ${item}`).join('')})`
  }

  if (normalizedCode === 'LIQUIDO_PAGAR') {
    const additions = selected.filter((term) => term.operation === 'sumar').map((term) => term.code)
    const deductions = selected.filter((term) => term.operation === 'restar').map((term) => term.code)
    const body = [
      additions.length ? additions.join(' + ') : '0',
      ...deductions.map((item) => `- ${item}`),
    ].join(' ')
    return `ROUND(${body})`
  }

  const additions = selected.filter((term) => term.operation === 'sumar').map((term) => term.code)
  return `ROUND(${additions.length ? additions.join(' + ') : '0'})`
}

export function getFriendlyRuleSummary(code: string, expression: string) {
  const numbers = getFriendlyNumberControls(code, expression)
  const terms = getFriendlyTermControls(code, expression)
  const lines: string[] = []

  for (const item of numbers) {
    lines.push(`${item.label}: ${item.value.toLocaleString('es-CL', { maximumFractionDigits: 4 })}${item.suffix ? ` ${item.suffix}` : ''}`)
  }

  if (terms.length) {
    const included = terms.filter((item) => item.included)
    if (included.length) lines.push(`Conceptos incluidos: ${included.map((item) => `${item.operation === 'restar' ? 'restar' : 'sumar'} ${item.label}`).join(' · ')}`)
  }

  return lines.length ? lines : getFriendlyOperationGuide(code)
}
