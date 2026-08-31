import assert from 'node:assert/strict'
import test from 'node:test'

import { calculatePayroll, type PayrollResult } from '@/lib/payroll'
import { CASOS_GOLDEN } from '@/tests/payroll/fixtures/casos'

function formatValue(value: unknown) {
  const serialized = JSON.stringify(value)
  return serialized ?? String(value)
}

// Cuando existan casos aprobados por un especialista laboral, este centinela debe
// reemplazarse por una aserción de cantidad mínima esperada de casos golden.
test('andamio golden de remuneraciones está operativo', () => {
  assert.equal(typeof calculatePayroll, 'function')
  assert.ok(Array.isArray(CASOS_GOLDEN))
})

for (const caso of CASOS_GOLDEN) {
  test(caso.nombre, () => {
    const resultado = calculatePayroll(caso.input)
    const toleranciaPesos = caso.toleranciaPesos ?? 0

    for (const campo of Object.keys(caso.esperado) as Array<keyof PayrollResult>) {
      const esperado = caso.esperado[campo]
      const obtenido = resultado[campo]

      if (typeof esperado === 'number' && typeof obtenido === 'number') {
        const diferenciaPesos = Math.abs(obtenido - esperado)
        const mensaje = `Caso "${caso.nombre}", campo "${String(campo)}": esperado ${esperado}, obtenido ${obtenido}, diferencia en pesos: ${diferenciaPesos}`

        assert.ok(diferenciaPesos <= toleranciaPesos, mensaje)
        continue
      }

      const mensaje = `Caso "${caso.nombre}", campo "${String(campo)}": esperado ${formatValue(esperado)}, obtenido ${formatValue(obtenido)}, diferencia en pesos: no aplica`
      assert.deepStrictEqual(obtenido, esperado, mensaje)
    }
  })
}
