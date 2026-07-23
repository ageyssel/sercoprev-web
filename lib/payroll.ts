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
}

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
}

const roundPeso = (value: number) => Math.round(Number.isFinite(value) ? value : 0)
const positive = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0)

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

function calculateIncomeTax(base: number, brackets: PayrollTaxBracket[]) {
  const bracket = [...brackets]
    .sort((a, b) => a.from - b.from)
    .find((item) => base >= item.from && (item.to === null || base <= item.to))
  if (!bracket) return 0
  return roundPeso(Math.max(0, base * bracket.factor - bracket.rebate))
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const warnings: string[] = []
  const workedDays = Math.min(30, Math.max(0, input.workedDays))
  const salaryBasePaid = input.paymentMode === 'Mensual'
    ? roundPeso((positive(input.salaryBase) / 30) * workedDays)
    : roundPeso(positive(input.salaryBase) * workedDays)

  const movementEarnings = input.movements.filter((item) => item.nature === 'Haber')
  const movementDeductions = input.movements.filter((item) => item.nature === 'Descuento')
  const movementEmployer = input.movements.filter((item) => item.nature === 'Aporte empleador')

  const movementTaxable = movementEarnings.filter((item) => item.taxable).reduce((sum, item) => sum + positive(item.amount), 0)
  const movementIncomeTaxable = movementEarnings.filter((item) => item.incomeTaxable).reduce((sum, item) => sum + positive(item.amount), 0)
  const movementNonTaxable = movementEarnings.filter((item) => !item.taxable).reduce((sum, item) => sum + positive(item.amount), 0)

  const weekRun = calculateWeekRun(
    input.variableEarningsForWeekRun ?? 0,
    workedDays,
    input.restDays ?? 0,
  )

  const gratificationBase = salaryBasePaid + movementTaxable + weekRun
  const gratificationCap = positive(input.parameters.ingresoMinimo) * 4.75 / 12
  const gratification = input.gratificationType === 'Artículo 50'
    ? roundPeso(Math.min(gratificationBase * 0.25, gratificationCap))
    : 0

  const dailyAllowances = roundPeso(
    (positive(input.dailyMealAllowance ?? 0) + positive(input.dailyTransportAllowance ?? 0)) * workedDays,
  )

  const taxableEarnings = roundPeso(salaryBasePaid + gratification + weekRun + movementTaxable)
  const incomeTaxableEarnings = roundPeso(salaryBasePaid + gratification + weekRun + movementIncomeTaxable)
  const nonTaxableEarnings = roundPeso(movementNonTaxable + dailyAllowances)

  const pensionBase = Math.min(taxableEarnings, positive(input.parameters.topeAfpUf) * positive(input.parameters.uf))
  const healthBase = Math.min(taxableEarnings, positive(input.parameters.topeSaludUf) * positive(input.parameters.uf))
  const unemploymentBase = Math.min(taxableEarnings, positive(input.parameters.topeAfcUf) * positive(input.parameters.uf))

  const afpRate = input.afp ? input.parameters.tasasAfp[input.afp] : undefined
  if (input.healthType !== 'Sin cotización' && afpRate === undefined) warnings.push('La AFP no tiene una tasa configurada para el período.')
  const afpWorker = roundPeso(pensionBase * positive(afpRate ?? 0))

  const legalHealth = input.healthType === 'Sin cotización' ? 0 : roundPeso(healthBase * positive(input.parameters.tasaSalud))
  const healthPlan = input.healthType === 'Isapre'
    ? roundPeso(positive(input.healthPlanUf ?? 0) * positive(input.parameters.uf))
    : legalHealth
  const healthWorker = Math.max(legalHealth, healthPlan)
  const healthAdditional = Math.max(0, healthWorker - legalHealth)

  const indefinite = input.contractType === 'Indefinido'
  const afcApplies = input.unemploymentInsuranceApplies && input.contractType !== 'Honorarios'
  const unemploymentWorker = afcApplies && indefinite
    ? roundPeso(unemploymentBase * positive(input.parameters.tasaAfcTrabajadorIndefinido))
    : 0
  const unemploymentEmployer = afcApplies
    ? roundPeso(unemploymentBase * positive(indefinite
      ? input.parameters.tasaAfcEmpleadorIndefinido
      : input.parameters.tasaAfcEmpleadorPlazo))
    : 0
  const sisEmployer = input.contractType === 'Honorarios'
    ? 0
    : roundPeso(pensionBase * positive(input.parameters.tasaSisEmpleador))

  const otherDeductions = roundPeso(movementDeductions.reduce((sum, item) => sum + positive(item.amount), 0))
  const taxBase = Math.max(0, incomeTaxableEarnings - afpWorker - legalHealth - unemploymentWorker)
  const incomeTax = calculateIncomeTax(taxBase, input.parameters.impuestoSegundaCategoria)
  const employerManual = roundPeso(movementEmployer.reduce((sum, item) => sum + positive(item.amount), 0))
  const employerContributions = roundPeso(unemploymentEmployer + sisEmployer + employerManual)
  const legalDeductions = afpWorker + healthWorker + unemploymentWorker + incomeTax
  const netPay = roundPeso(taxableEarnings + nonTaxableEarnings - legalDeductions - otherDeductions)

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
  }
}
