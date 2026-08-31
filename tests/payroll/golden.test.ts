import assert from 'node:assert/strict'
import { register } from 'node:module'
import test from 'node:test'

import type { PayrollResult } from '../../lib/payroll'

const aliasResolver = `
import { pathToFileURL } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return {
      url: pathToFileURL(\`${process.cwd()}/\${specifier.slice(2)}.ts\`).href,
      shortCircuit: true,
    }
  }

  return nextResolve(specifier, context)
}
`

register(`data:text/javascript,${encodeURIComponent(aliasResolver)}`, import.meta.url)

const payrollModulePath = '../../lib/payroll.ts'
const fixturesModulePath = './fixtures/casos.ts'

const [{ calculatePayroll }, { CASOS_GOLDEN }] = await Promise.all([
  import(payrollModulePath) as Promise<typeof import('../../lib/payroll')>,
  import(fixturesModulePath) as Promise<typeof import('./fixtures/casos')>,
])

function formatValue(value: unknown) {
  const serialized = JSON.stringify(value)
  return serialized ?? String(value)
}

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
