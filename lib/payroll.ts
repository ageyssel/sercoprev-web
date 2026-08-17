import { evaluateFormula } from '@/lib/formula-engine'

export type PayrollTaxBracket = {
  from: number
  to: number | null
  factor: number
  rebate: number
}

export type PayrollParameters = {
  uf: number
  ingresoMinimo: number
  topeAfpUf: number
  topeSaludUf: number
  topeAfcUf: number
  tasaSalud: number
  tasaSisEmpleador: number
  tasaAfcTrabajadorIndefinido: number
  tasaAfcEmpleadorIndefinido: number
  tasaAfcEmpleadorPlazo: number
  tasasAfp: Record<string, number>
  impuestoSegundaCategoria: PayrollTaxBracket[]
}

export type PayrollMovement = {
  code: string
  description: string
  nature: 'Haber' | 'Descuento' | 'Aporte empleador'
  amount: number
  taxable: boolean
  incomeTaxable: boolean
}

export type PayrollFormulaVersion = {
  expression: string
  version?: number
  effectiveFrom?: string
}

export type PayrollFormulaExpressions = Record<string, PayrollFormulaVersion | string>

export type PayrollInput = {
  salaryBase: number
  contractType: 'Indefinido' | 'Plazo fijo' | 'Obra o faena' | 'Honorarios'
  paymentMode: 'Mensual' | 'Diaria' | 'Por hora'
  gratificationType: string
  workedDays: number
  restDays?: number
  variableEarningsForWeekRun?: number
  dailyMealAllowance?: number
  dailyTransportAllowance?: number
  afp?: string | null
  healthType: 'Fonasa' | 'Isapre' | 'Sin cotización'
  healthPlanUf?: number | null
  unemploymentInsuranceApplies: boolean
  movements: PayrollMovement[]
  parameters: PayrollParameters
  formulas?: PayrollFormulaExpressions
}

export type PayrollFormulaTrace = Record<string, {
  expression: string
  result: number
  source: 'publicada' | 'base'
  version: number | null
  effectiveFrom: string | null
}>

export type PayrollResult = {
  salaryBasePaid: number
  gratification: number
  weekRun: number
  taxableEarnings: number
  incomeTaxableEarnings: number
  nonTaxableEarnings: number
  pensionBase: number
  healthBase: number
  unemploymentBase: number
  afpWorker: number
  healthWorker: number
  healthAdditional: number
  unemploymentWorker: number
  unemploymentEmployer: number
  sisEmployer: number
  incomeTax: number
  otherDeductions: number
  employerContributions: number
  netPay: number
  details: Array<{ code: string; description: string; nature: 'Haber' | 'Descuento' | 'Aporte empleador'; amount: number }>
  warnings: string[]
  formulaTrace: PayrollFormulaTrace
}

const roundPeso = (value: number) => Math.round(Number.isFinite(value) ? value : 0)
const positive = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0)

const BASE_FORMULAS: Record<string, string> = {
  SUELDO_BASE_PAGADO: 'IF(PAYMENT_MODE_MONTHLY, ROUND((SALARY_BASE / 30) * WORKED_DAYS), ROUND(SALARY_BASE * WORKED_DAYS))',
  SEMANA_CORRIDA: 'IF(WORKED_DAYS > 0, ROUND((VARIABLE_EARNINGS_WEEK_RUN / WORKED_DAYS) * REST_DAYS), 0)',
  GRATIFICACION: 'IF(IS_ARTICLE_50, ROUND(MIN((SALARY_BASE_PAID + MOVEMENT_TAXABLE + WEEK_RUN) * 0.25, (INGRESO_MINIMO * 4.75) / 12)), 0)',
  ASIGNACIONES_DIARIAS: 'ROUND((MEAL_ALLOWANCE_DAILY + TRANSPORT_ALLOWANCE_DAILY) * WORKED_DAYS)',
  TOTAL_IMPONIBLE: 'ROUND(SALARY_BASE_PAID + GRATIFICATION + WEEK_RUN + MOVEMENT_TAXABLE)',
  TOTAL_TRIBUTABLE: 'ROUND(SALARY_BASE_PAID + GRATIFICATION + WEEK_RUN + MOVEMENT_INCOME_TAXABLE)',
  TOTAL_NO_IMPONIBLE: 'ROUND(MOVEMENT_NON_TAXABLE + DAILY_ALLOWANCES)',
  BASE_AFP: 'MIN(TAXABLE_EARNINGS, TOPE_AFP_UF * UF)',
  BASE_SALUD: 'MIN(TAXABLE_EARNINGS, TOPE_SALUD_UF * UF)',
  BASE_AFC: 'MIN(TAXABLE_EARNINGS, TOPE_AFC_UF * UF)',
  AFP_TRABAJADOR: 'ROUND(PENSION_BASE * AFP_RATE)',
  SALUD_LEGAL: 'IF(HAS_HEALTH, ROUND(HEALTH_BASE * HEALTH_RATE), 0)',
  SALUD_TRABAJADOR: 'MAX(LEGAL_HEALTH, HEALTH_PLAN)',
  AFC_TRABAJADOR: 'IF(AFC_APPLIES * IS_INDEFINITE, ROUND(UNEMPLOYMENT_BASE * AFC_WORKER_RATE), 0)',
  AFC_EMPLEADOR: 'IF(AFC_APPLIES, ROUND(UNEMPLOYMENT_BASE * IF(IS_INDEFINITE, AFC_EMPLOYER_INDEFINITE_RATE, AFC_EMPLOYER_TERM_RATE)), 0)',
  SIS_EMPLEADOR: 'IF(IS_HONORARIOS, 0, ROUND(PENSION_BASE * SIS_RATE))',
  BASE_IMPUESTO: 'MAX(0, INCOME_TAXABLE_EARNINGS - AFP_WORKER - LEGAL_HEALTH - UNEMPLOYMENT_WORKER)',
  IMPUESTO_UNICO: 'TAX_BRACKET(TAX_BASE)',
  APORTES_EMPLEADOR: 'ROUND(UNEMPLOYMENT_EMPLOYER + SIS_EMPLOYER + EMPLOYER_MANUAL)',
  LIQUIDO_PAGAR: 'ROUND(TAXABLE_EARNINGS + NON_TAXABLE_EARNINGS - LEGAL_DEDUCTIONS - OTHER_DEDUCTIONS)',
}

function formulaInfo(formulas: PayrollFormulaExpressions | undefined, key: string) {
  const candidate = formulas?.[key]
  if (!candidate) return null
  if (typeof candidate === 'string') return { expression: candidate, version: null, effectiveFrom: null }
  return {
    expression: candidate.expression,
    version: candidate.version ?? null,
    effectiveFrom: candidate.effectiveFrom ?? null,
  }
}

function calculateWithFormula(input: {
  key: string
  variables: Record<string, number>
  formulas?: PayrollFormulaExpressions
  warnings: string[]
  trace: PayrollFormulaTrace
  taxBrackets?: PayrollTaxBracket[]
}) {
  const baseExpression = BASE_FORMULAS[input.key]
  if (!baseExpression) throw new Error(`Fórmula base no registrada: ${input.key}`)
  const configured = formulaInfo(input.formulas, input.key)
  const expression = configured?.expression ?? baseExpression

  try {
    const result = evaluateFormula(expression, input.variables, { taxBrackets: input.taxBrackets })
    input.trace[input.key] = {
      expression,
      result,
      source: configured ? 'publicada' : 'base',
      version: configured?.version ?? null,
      effectiveFrom: configured?.effectiveFrom ?? null,
    }
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'expresión inválida'
    if (!configured) throw error
    input.warnings.push(`La fórmula publicada ${input.key} no pudo evaluarse (${message}). Se aplicó la fórmula base de seguridad.`)
    const result = evaluateFormula(baseExpression, input.variables, { taxBrackets: input.taxBrackets })
    input.trace[input.key] = {
      expression: baseExpression,
      result,
      source: 'base',
      version: null,
      effectiveFrom: null,
    }
    return result
  }
}

export function calculateWeekRun(variableEarnings: number, workedDays: number, restDays: number) {
  if (workedDays <= 0 || restDays <= 0) return 0
  return roundPeso((positive(variableEarnings) / workedDays) * restDays)
}

export function calculateProportionalVacation(monthlySalary: number, pendingBusinessDays: number) {
  const dailyValue = positive(monthlySalary) / 30
  return roundPeso(dailyValue * positive(pendingBusinessDays))
}

export function calculateTerminationDraft(input: {
  monthlySalary: number
  yearsOfService: number
  pendingVacationDays: number
  noticePaid: boolean
  severanceYears: boolean
  pendingEarnings?: number
  otherEarnings?: number
  deductions?: number
}) {
  const monthlySalary = positive(input.monthlySalary)
  const notice = input.noticePaid ? monthlySalary : 0
  const serviceYears = input.severanceYears ? Math.min(11, Math.max(0, Math.floor(input.yearsOfService))) : 0
  const severance = roundPeso(monthlySalary * serviceYears)
  const vacation = calculateProportionalVacation(monthlySalary, input.pendingVacationDays)
  const pending = positive(input.pendingEarnings ?? 0)
  const other = positive(input.otherEarnings ?? 0)
  const deductions = positive(input.deductions ?? 0)

  return {
    notice: roundPeso(notice),
    severance,
    vacation,
    pendingEarnings: roundPeso(pending),
    otherEarnings: roundPeso(other),
    deductions: roundPeso(deductions),
    total: roundPeso(notice + severance + vacation + pending + other - deductions),
  }
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const warnings: string[] = []
  const formulaTrace: PayrollFormulaTrace = {}
  const workedDays = Math.min(30, Math.max(0, input.workedDays))
  const formula = (key: string, variables: Record<string, number>) => calculateWithFormula({
    key,
    variables,
    formulas: input.formulas,
    warnings,
    trace: formulaTrace,
    taxBrackets: input.parameters.impuestoSegundaCategoria,
  })

  const movementEarnings = input.movements.filter((item) => item.nature === 'Haber')
  const movementDeductions = input.movements.filter((item) => item.nature === 'Descuento')
  const movementEmployer = input.movements.filter((item) => item.nature === 'Aporte empleador')

  const movementTaxable = movementEarnings.filter((item) => item.taxable).reduce((sum, item) => sum + positive(item.amount), 0)
  const movementIncomeTaxable = movementEarnings.filter((item) => item.incomeTaxable).reduce((sum, item) => sum + positive(item.amount), 0)
  const movementNonTaxable = movementEarnings.filter((item) => !item.taxable).reduce((sum, item) => sum + positive(item.amount), 0)

  const salaryBasePaid = roundPeso(formula('SUELDO_BASE_PAGADO', {
    PAYMENT_MODE_MONTHLY: Number(input.paymentMode === 'Mensual'),
    SALARY_BASE: positive(input.salaryBase),
    WORKED_DAYS: workedDays,
  }))

  const weekRun = roundPeso(formula('SEMANA_CORRIDA', {
    VARIABLE_EARNINGS_WEEK_RUN: positive(input.variableEarningsForWeekRun ?? 0),
    WORKED_DAYS: workedDays,
    REST_DAYS: positive(input.restDays ?? 0),
  }))

  const gratification = roundPeso(formula('GRATIFICACION', {
    IS_ARTICLE_50: Number(input.gratificationType === 'Artículo 50'),
    SALARY_BASE_PAID: salaryBasePaid,
    MOVEMENT_TAXABLE: movementTaxable,
    WEEK_RUN: weekRun,
    INGRESO_MINIMO: positive(input.parameters.ingresoMinimo),
  }))

  const dailyAllowances = roundPeso(formula('ASIGNACIONES_DIARIAS', {
    MEAL_ALLOWANCE_DAILY: positive(input.dailyMealAllowance ?? 0),
    TRANSPORT_ALLOWANCE_DAILY: positive(input.dailyTransportAllowance ?? 0),
    WORKED_DAYS: workedDays,
  }))

  const taxableEarnings = roundPeso(formula('TOTAL_IMPONIBLE', {
    SALARY_BASE_PAID: salaryBasePaid,
    GRATIFICATION: gratification,
    WEEK_RUN: weekRun,
    MOVEMENT_TAXABLE: movementTaxable,
  }))
  const incomeTaxableEarnings = roundPeso(formula('TOTAL_TRIBUTABLE', {
    SALARY_BASE_PAID: salaryBasePaid,
    GRATIFICATION: gratification,
    WEEK_RUN: weekRun,
    MOVEMENT_INCOME_TAXABLE: movementIncomeTaxable,
  }))
  const nonTaxableEarnings = roundPeso(formula('TOTAL_NO_IMPONIBLE', {
    MOVEMENT_NON_TAXABLE: movementNonTaxable,
    DAILY_ALLOWANCES: dailyAllowances,
  }))

  const pensionBase = positive(formula('BASE_AFP', {
    TAXABLE_EARNINGS: taxableEarnings,
    TOPE_AFP_UF: positive(input.parameters.topeAfpUf),
    UF: positive(input.parameters.uf),
  }))
  const healthBase = positive(formula('BASE_SALUD', {
    TAXABLE_EARNINGS: taxableEarnings,
    TOPE_SALUD_UF: positive(input.parameters.topeSaludUf),
    UF: positive(input.parameters.uf),
  }))
  const unemploymentBase = positive(formula('BASE_AFC', {
    TAXABLE_EARNINGS: taxableEarnings,
    TOPE_AFC_UF: positive(input.parameters.topeAfcUf),
    UF: positive(input.parameters.uf),
  }))

  const afpRate = input.afp ? input.parameters.tasasAfp[input.afp] : undefined
  if (input.healthType !== 'Sin cotización' && afpRate === undefined) warnings.push('La AFP no tiene una tasa configurada para el período.')
  const afpWorker = roundPeso(formula('AFP_TRABAJADOR', {
    PENSION_BASE: pensionBase,
    AFP_RATE: positive(afpRate ?? 0),
  }))

  const legalHealth = roundPeso(formula('SALUD_LEGAL', {
    HAS_HEALTH: Number(input.healthType !== 'Sin cotización'),
    HEALTH_BASE: healthBase,
    HEALTH_RATE: positive(input.parameters.tasaSalud),
  }))
  const healthPlan = input.healthType === 'Isapre'
    ? roundPeso(positive(input.healthPlanUf ?? 0) * positive(input.parameters.uf))
    : legalHealth
  const healthWorker = roundPeso(formula('SALUD_TRABAJADOR', {
    LEGAL_HEALTH: legalHealth,
    HEALTH_PLAN: healthPlan,
  }))
  const healthAdditional = Math.max(0, healthWorker - legalHealth)

  const indefinite = input.contractType === 'Indefinido'
  const afcApplies = input.unemploymentInsuranceApplies && input.contractType !== 'Honorarios'
  const unemploymentWorker = roundPeso(formula('AFC_TRABAJADOR', {
    AFC_APPLIES: Number(afcApplies),
    IS_INDEFINITE: Number(indefinite),
    UNEMPLOYMENT_BASE: unemploymentBase,
    AFC_WORKER_RATE: positive(input.parameters.tasaAfcTrabajadorIndefinido),
  }))
  const unemploymentEmployer = roundPeso(formula('AFC_EMPLEADOR', {
    AFC_APPLIES: Number(afcApplies),
    IS_INDEFINITE: Number(indefinite),
    UNEMPLOYMENT_BASE: unemploymentBase,
    AFC_EMPLOYER_INDEFINITE_RATE: positive(input.parameters.tasaAfcEmpleadorIndefinido),
    AFC_EMPLOYER_TERM_RATE: positive(input.parameters.tasaAfcEmpleadorPlazo),
  }))
  const sisEmployer = roundPeso(formula('SIS_EMPLEADOR', {
    IS_HONORARIOS: Number(input.contractType === 'Honorarios'),
    PENSION_BASE: pensionBase,
    SIS_RATE: positive(input.parameters.tasaSisEmpleador),
  }))

  const otherDeductions = roundPeso(movementDeductions.reduce((sum, item) => sum + positive(item.amount), 0))
  const taxBase = positive(formula('BASE_IMPUESTO', {
    INCOME_TAXABLE_EARNINGS: incomeTaxableEarnings,
    AFP_WORKER: afpWorker,
    LEGAL_HEALTH: legalHealth,
    UNEMPLOYMENT_WORKER: unemploymentWorker,
  }))
  const incomeTax = roundPeso(formula('IMPUESTO_UNICO', { TAX_BASE: taxBase }))
  const employerManual = roundPeso(movementEmployer.reduce((sum, item) => sum + positive(item.amount), 0))
  const employerContributions = roundPeso(formula('APORTES_EMPLEADOR', {
    UNEMPLOYMENT_EMPLOYER: unemploymentEmployer,
    SIS_EMPLOYER: sisEmployer,
    EMPLOYER_MANUAL: employerManual,
  }))
  const legalDeductions = afpWorker + healthWorker + unemploymentWorker + incomeTax
  const netPay = roundPeso(formula('LIQUIDO_PAGAR', {
    TAXABLE_EARNINGS: taxableEarnings,
    NON_TAXABLE_EARNINGS: nonTaxableEarnings,
    LEGAL_DEDUCTIONS: legalDeductions,
    OTHER_DEDUCTIONS: otherDeductions,
  }))

  const details: PayrollResult['details'] = [
    { code: 'SUELDO_BASE', description: 'Sueldo base proporcional', nature: 'Haber', amount: salaryBasePaid },
    ...(gratification > 0 ? [{ code: 'GRATIFICACION', description: 'Gratificación legal', nature: 'Haber' as const, amount: gratification }] : []),
    ...(weekRun > 0 ? [{ code: 'SEMANA_CORRIDA', description: 'Semana corrida', nature: 'Haber' as const, amount: weekRun }] : []),
    ...(dailyAllowances > 0 ? [{ code: 'ASIGNACIONES_DIARIAS', description: 'Colación y movilización diaria', nature: 'Haber' as const, amount: dailyAllowances }] : []),
    ...input.movements.map((item) => ({ code: item.code, description: item.description, nature: item.nature, amount: roundPeso(item.amount) })),
    { code: 'AFP', description: `Cotización AFP${input.afp ? ` ${input.afp}` : ''}`, nature: 'Descuento', amount: afpWorker },
    { code: 'SALUD', description: input.healthType, nature: 'Descuento', amount: healthWorker },
    ...(unemploymentWorker > 0 ? [{ code: 'AFC_TRABAJADOR', description: 'Seguro de cesantía trabajador', nature: 'Descuento' as const, amount: unemploymentWorker }] : []),
    ...(incomeTax > 0 ? [{ code: 'IUSC', description: 'Impuesto Único de Segunda Categoría', nature: 'Descuento' as const, amount: incomeTax }] : []),
    ...(unemploymentEmployer > 0 ? [{ code: 'AFC_EMPLEADOR', description: 'Seguro de cesantía empleador', nature: 'Aporte empleador' as const, amount: unemploymentEmployer }] : []),
    ...(sisEmployer > 0 ? [{ code: 'SIS', description: 'Seguro de invalidez y sobrevivencia', nature: 'Aporte empleador' as const, amount: sisEmployer }] : []),
  ]

  return {
    salaryBasePaid,
    gratification,
    weekRun,
    taxableEarnings,
    incomeTaxableEarnings,
    nonTaxableEarnings,
    pensionBase: roundPeso(pensionBase),
    healthBase: roundPeso(healthBase),
    unemploymentBase: roundPeso(unemploymentBase),
    afpWorker,
    healthWorker,
    healthAdditional,
    unemploymentWorker,
    unemploymentEmployer,
    sisEmployer,
    incomeTax,
    otherDeductions,
    employerContributions,
    netPay,
    details,
    warnings,
    formulaTrace,
  }
}
