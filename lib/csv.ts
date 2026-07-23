export type CsvTable = {
  headers: string[]
  rows: Array<Record<string, string>>
  delimiter: ',' | ';' | '\t'
}

type CsvDelimiter = CsvTable['delimiter']

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') quoted = !quoted
    else if (!quoted && character === delimiter) count += 1
  }
  return count
}

function detectDelimiter(text: string): CsvDelimiter {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const candidates: CsvDelimiter[] = [',', ';', '\t']
  return candidates.reduce((best, candidate) => (
    countDelimiter(firstLine, candidate) > countDelimiter(firstLine, best)
      ? candidate
      : best
  ))
}

function parseRows(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]
    if (character === '"') {
      if (quoted && next === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (!quoted && character === delimiter) {
      row.push(value.trim())
      value = ''
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && next === '\n') index += 1
      row.push(value.trim())
      value = ''
      if (row.some((cell) => cell !== '')) rows.push(row)
      row = []
    } else {
      value += character
    }
  }

  row.push(value.trim())
  if (row.some((cell) => cell !== '')) rows.push(row)
  if (quoted) throw new Error('CSV_UNCLOSED_QUOTE')
  return rows
}

export function parseCsv(text: string, maxRows = 2500): CsvTable {
  const cleanText = text.replace(/^\uFEFF/, '').trim()
  if (!cleanText) throw new Error('CSV_EMPTY')
  const delimiter = detectDelimiter(cleanText)
  const matrix = parseRows(cleanText, delimiter)
  if (matrix.length < 2) throw new Error('CSV_WITHOUT_DATA')
  if (matrix.length - 1 > maxRows) throw new Error('CSV_TOO_LARGE')

  const headers = matrix[0].map(normalizeHeader)
  if (headers.some((header) => !header)) throw new Error('CSV_INVALID_HEADER')
  if (new Set(headers).size !== headers.length) throw new Error('CSV_DUPLICATED_HEADER')

  const rows = matrix.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ''])))
  return { headers, rows, delimiter }
}

export function findValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)]
    if (value !== undefined && value !== '') return value
  }
  return ''
}

export function parseNumber(value: string) {
  const compact = value.trim().replace(/\s/g, '')
  if (!compact) return 0
  const normalized = compact.includes(',')
    ? compact.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
    : compact.replace(/,(?=\d{3}(?:\D|$))/g, '')
  const number = Number(normalized.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(number) ? number : Number.NaN
}

export function parseDate(value: string) {
  const text = value.trim()
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  const latin = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (latin) return `${latin[3]}-${latin[2].padStart(2, '0')}-${latin[1].padStart(2, '0')}`
  return null
}
