import type { PayrollInput, PayrollResult } from '../../../lib/payroll'

export type CasoGolden = {
  nombre: string
  descripcion: string
  input: PayrollInput
  esperado: Partial<PayrollResult>
  toleranciaPesos: number
}

// Cada caso debe ser aprobado por un especialista laboral antes de incorporarse:
// un caso incorrecto congelaría un error como si fuera la verdad esperada del sistema.
export const CASOS_GOLDEN: CasoGolden[] = []
