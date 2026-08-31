import assert from 'node:assert/strict'
import test from 'node:test'

import { parseBancoCentralDailyHtml, parsePreviredHtml } from '@/lib/official-data-parsers'
import { parseDecimalRateInput, percentageToDecimalRate } from '@/lib/rate-decimal'

const CURRENT_PERIOD = 'Para cotizaciones a pagar en septiembre 2026 (remuneraciones agosto 2026)'

function parsedValue(result: ReturnType<typeof parsePreviredHtml>, code: string) {
  return result.values.find((item) => item.code === code)
}

function assertRate(actual: number | undefined, expected: number) {
  assert.ok(actual !== undefined && Math.abs(actual - expected) < 1e-12, `esperado ${expected}, obtenido ${actual}`)
}

test('PREVIRED acepta el texto nuevo de SIS y AFP con tres porcentajes', () => {
  const result = parsePreviredHtml(`
    <main>
      ${CURRENT_PERIOD}
      Seguro de Invalidez y Sobrevivencia (SIS): 1,78%
      Capital 11,44% 0,1% 11,54%
    </main>
  `, new Date('2026-08-31T18:00:00.000Z'))

  assert.equal(result.period, '2026-08-01')
  assertRate(parsedValue(result, 'TASA_SIS_EMPLEADOR')?.value, 0.0178)
  assertRate(parsedValue(result, 'TASA_AFP_CAPITAL')?.value, 0.1144)
  assert.equal(parsedValue(result, 'TASA_AFP_CAPITAL')?.metadata?.percentage_columns_found, 3)
  assertRate(parsedValue(result, 'TASA_AFP_EMPLEADOR_CUENTA_CAPITAL')?.value, 0.001)
  assert.equal(result.errors.TASA_SIS_EMPLEADOR, undefined)
  assert.equal(result.errors.TASA_AFP_CAPITAL, undefined)
})

test('PREVIRED mantiene compatibilidad con Tasa SIS y AFP de cuatro porcentajes', () => {
  const result = parsePreviredHtml(`
    ${CURRENT_PERIOD}
    TASA SIS - 1,62 %
    CAPITAL: 11,44 % 0,10 % 11,54 % 13,06 %
  `)

  assertRate(parsedValue(result, 'TASA_SIS_EMPLEADOR')?.value, 0.0162)
  assert.equal(parsedValue(result, 'TASA_AFP_CAPITAL')?.metadata?.percentage_columns_found, 4)
  assertRate(parsedValue(result, 'TASA_AFP_CAPITAL')?.value, 0.1144)
})

test('PREVIRED convierte porcentajes a decimales exactos con seis posiciones de precisión', () => {
  const result = parsePreviredHtml(`
    ${CURRENT_PERIOD}
    Provida 11,45% 0,10% 11,55%
    Uno 10,46% 0,10% 10,56%
  `)

  assert.equal(percentageToDecimalRate(11.45), 0.1145)
  assert.equal(parsedValue(result, 'TASA_AFP_PROVIDA')?.value, 0.1145)
  assert.equal(parsedValue(result, 'TASA_AFP_UNO')?.value, 0.1046)
})

test('el parser de tasas del formulario conserva decimales de tres cifras', () => {
  assert.equal(parseDecimalRateInput('0.006'), 0.006)
  assert.equal(parseDecimalRateInput('0.024'), 0.024)
  assert.equal(parseDecimalRateInput('0,030'), 0.03)
})

test('PREVIRED recolecta errores por campo sin perder los valores que sí pudo leer', () => {
  const result = parsePreviredHtml(`
    ${CURRENT_PERIOD}
    Capital 11,44% 0,1% 11,54%
    Para afiliados a una AFP (90 UF)
  `)

  assertRate(parsedValue(result, 'TASA_AFP_CAPITAL')?.value, 0.1144)
  assert.equal(parsedValue(result, 'TOPE_IMPONIBLE_AFP_UF')?.value, 90)
  assert.equal(result.errors.TASA_SIS_EMPLEADOR, 'PREVIRED_SIS_RATE_NOT_FOUND')
  assert.equal(result.errors.INGRESO_MINIMO_GENERAL, 'PREVIRED_MINIMUM_INCOME_NOT_FOUND')
})

test('Banco Central mantiene UF aunque dólar y euro estén ND', () => {
  const result = parseBancoCentralDailyHtml(`
    <input id="txtDate" value="31 Aug 2026" />
    <label id="lblValor1_1">40.873,77</label>
    <label id="lblValor1_3">ND</label>
    <label id="lblValor1_5">N/D</label>
  `, new Date('2026-08-31T18:00:00.000Z'))

  assert.equal(result.referenceDate, '2026-08-31')
  assert.equal(result.values.find((item) => item.code === 'UF_DIARIA')?.value, 40873.77)
  assert.equal(result.values.some((item) => item.code === 'DOLAR_OBSERVADO'), false)
  assert.equal(result.values.some((item) => item.code === 'EURO'), false)
  assert.equal(result.errors.DOLAR_OBSERVADO, 'DOLAR_OBSERVADO_NOT_AVAILABLE')
  assert.equal(result.errors.EURO, 'EURO_NOT_AVAILABLE')
})
