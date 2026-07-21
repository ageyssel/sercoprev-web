'use client'

import { useState } from 'react'
import { SimpleIcon } from '@/components/SimpleIcon'
import { importarDatosEmpresa } from '../actions'

const SERVICE_STRUCTURE = {
  'Contabilidad y Tributación': [
    'Contabilidad simplificada',
    'Declaraciones (IVA, Renta)',
    'Balances financieros',
    'Auditorías contables',
  ],
  'Recursos Humanos': [
    'Contratos de trabajo',
    'Liquidaciones y finiquitos',
    'Pago Previred',
    'Representación DT',
  ],
  'Gestión Legal': [
    'Constitución de sociedades',
    'Flujos de caja',
    'Facturación electrónica',
    'Registro INAPI',
  ],
  'Trámites Generales': [
    'Patentes y Resoluciones',
    'Tesorería General (TGR)',
    'Gestiones SII',
    'Conservador (CBRS)',
  ],
} as const

type ClientOption = {
  id: string
  razon_social: string
}

type Feedback = {
  ok: boolean
  message: string
}

type ImportRow = Record<string, string>

const MAX_FILE_SIZE = 2 * 1024 * 1024
const MAX_ROWS = 500
const REQUIRED_HEADERS = ['periodo', 'descripcion', 'monto', 'estado'] as const

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function countDelimiter(line: string, delimiter: string) {
  let quoted = false
  let count = 0

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (!quoted && character === delimiter) {
      count += 1
    }
  }

  return count
}

function parseCsv(text: string): ImportRow[] {
  const source = text.replace(/^\uFEFF/, '')
  const firstLine = source.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = countDelimiter(firstLine, ';') >= countDelimiter(firstLine, ',') ? ';' : ','
  const table: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if (character === delimiter && !quoted) {
      row.push(field)
      field = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some((cell) => cell.trim() !== '')) table.push(row)
      row = []
      field = ''
      continue
    }

    field += character
  }

  if (quoted) throw new Error('El archivo CSV contiene comillas sin cerrar.')

  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) table.push(row)

  if (table.length < 2) {
    throw new Error('La planilla está vacía o no contiene registros.')
  }

  const headers = table[0].map(normalizeHeader)
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header))

  if (missingHeaders.length > 0) {
    throw new Error(`Faltan columnas obligatorias: ${missingHeaders.join(', ')}.`)
  }

  const rows = table.slice(1).map((cells) => {
    const record: ImportRow = {}
    headers.forEach((header, index) => {
      record[header] = cells[index]?.trim() ?? ''
    })
    return record
  })

  if (rows.length > MAX_ROWS) {
    throw new Error(`La planilla no puede superar ${MAX_ROWS} registros.`)
  }

  return rows
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

export function DataImporter({ clientes }: { clientes: ClientOption[] }) {
  const [empresaId, setEmpresaId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const descargarPlanillaTipo = () => {
    if (!categoria || !subcategoria) {
      setFeedback({ ok: false, message: 'Seleccione el área y el trámite.' })
      return
    }

    const csv = [
      REQUIRED_HEADERS.map(csvCell).join(';'),
      [
        'Ej: Abril 2026',
        `Ej: ${subcategoria}`,
        150000,
        'Al día',
      ].map(csvCell).join(';'),
    ].join('\r\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `Plantilla_${subcategoria.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = async () => {
    if (!empresaId || !categoria || !subcategoria || !file) {
      setFeedback({
        ok: false,
        message: 'Complete todos los campos y seleccione una planilla CSV.',
      })
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFeedback({ ok: false, message: 'El archivo debe estar guardado en formato CSV.' })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setFeedback({ ok: false, message: 'La planilla CSV no puede superar 2 MB.' })
      return
    }

    try {
      setLoading(true)
      setFeedback(null)

      const rows = parseCsv(await file.text())
      const result = await importarDatosEmpresa({
        empresaId,
        categoria,
        subcategoria,
        rows,
      })

      setFeedback(result)

      if (result.ok) {
        setFile(null)
        setFileInputKey((current) => current + 1)
      }
    } catch (error) {
      setFeedback({
        ok: false,
        message: error instanceof Error ? error.message : 'No fue posible leer la planilla CSV.',
      })
    } finally {
      setLoading(false)
    }
  }

  const availableSubcategories = categoria
    ? SERVICE_STRUCTURE[categoria as keyof typeof SERVICE_STRUCTURE]
    : []

  return (
    <div className="space-y-6 bg-white p-2 rounded-lg mt-4">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="empresa-importacion" className="block text-sm font-bold text-[#0f172a] mb-2">
            1. Seleccionar Cliente
          </label>
          <select
            id="empresa-importacion"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-gray-50"
            value={empresaId}
            onChange={(event) => setEmpresaId(event.target.value)}
          >
            <option value="">-- Seleccionar Empresa --</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.razon_social}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="categoria-importacion" className="block text-sm font-bold text-[#0f172a] mb-2">
            2. Área de Servicio
          </label>
          <select
            id="categoria-importacion"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-gray-50"
            value={categoria}
            onChange={(event) => {
              setCategoria(event.target.value)
              setSubcategoria('')
            }}
          >
            <option value="">-- Seleccionar Área --</option>
            {Object.keys(SERVICE_STRUCTURE).map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {categoria && (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-fade-in">
          <label htmlFor="subcategoria-importacion" className="block text-sm font-bold text-[#1e3a8a] mb-2">
            3. Trámite Específico
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <select
              id="subcategoria-importacion"
              required
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
              value={subcategoria}
              onChange={(event) => setSubcategoria(event.target.value)}
            >
              <option value="">-- Seleccionar Trámite --</option>
              {availableSubcategories.map((subcategory) => (
                <option key={subcategory} value={subcategory}>{subcategory}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={descargarPlanillaTipo}
              disabled={!subcategoria}
              className="flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              <SimpleIcon name="download" className="w-4 h-4" /> Bajar Plantilla CSV
            </button>
          </div>
        </div>
      )}

      {subcategoria && (
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl text-center bg-gray-50 hover:bg-gray-100 transition-colors animate-fade-in">
          <SimpleIcon name="upload" className="w-10 h-10 text-[#1e3a8a] mx-auto mb-3" />
          <label htmlFor="archivo-importacion" className="block text-sm font-bold text-[#0f172a] mb-2">
            4. Subir CSV completado
          </label>
          <input
            key={fileInputKey}
            id="archivo-importacion"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mx-auto text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#1e3a8a] file:text-white hover:file:bg-[#1e40af] cursor-pointer"
          />
          <p className="mt-2 text-xs text-gray-500">
            Compatible con Excel. Máximo 500 filas y 2 MB. Guarde el archivo como CSV UTF-8.
          </p>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border p-3 text-sm font-semibold ${
            feedback.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <button
        type="button"
        onClick={handleFileUpload}
        disabled={loading || !file}
        className="w-full flex justify-center items-center gap-2 bg-[#eab308] hover:bg-yellow-500 text-[#0f172a] font-black py-4 rounded-xl transition-all shadow-md disabled:opacity-50 mt-6 text-lg"
      >
        {loading ? 'Procesando CSV...' : 'Subir a la Base de Datos'}
      </button>
    </div>
  )
}
