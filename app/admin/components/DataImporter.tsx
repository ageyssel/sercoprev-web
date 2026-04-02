'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import * as XLSX from 'xlsx'

export function DataImporter({ clientes }: { clientes: any[] }) {
  const [empresaId, setEmpresaId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileUpload = async () => {
    if (!empresaId) {
      alert("Seleccione un cliente primero.")
      return
    }
    if (!file) {
      alert("Por favor, seleccione un archivo Excel (.xlsx o .csv).")
      return
    }

    try {
      setLoading(true)
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convierte el Excel a JSON automáticamente
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        if (jsonData.length === 0) {
          alert("El archivo parece estar vacío o mal formateado.")
          setLoading(false)
          return
        }

        const supabase = createClient()
        const { error } = await supabase.from('datos_empresa').insert(
          jsonData.map((row: any) => ({ ...row, empresa_id: empresaId }))
        )

        if (error) throw new Error(error.message)
        
        alert(`¡Éxito! Se subieron ${jsonData.length} registros a la plataforma.`)
        setFile(null)
      }

      reader.readAsArrayBuffer(file)
    } catch (err: any) {
      alert("Error al procesar el archivo. Detalle: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">1. Seleccionar Cliente</label>
        <select 
          required 
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1e3a8a] outline-none bg-white text-gray-900 shadow-sm"
          value={empresaId}
          onChange={(e) => setEmpresaId(e.target.value)}
        >
          <option value="" className="text-gray-500">-- Elija una empresa --</option>
          {clientes.map(cliente => (
            <option key={cliente.id} value={cliente.id}>{cliente.razon_social} ({cliente.rut})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">2. Subir Planilla (Excel o CSV)</label>
        <p className="text-xs text-gray-500 mb-2">Columnas requeridas: periodo, descripcion, monto, estado</p>
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#1e3a8a] file:text-white hover:file:bg-[#1e40af] cursor-pointer"
        />
      </div>

      <button 
        onClick={handleFileUpload}
        disabled={loading}
        className="w-full bg-[#eab308] hover:bg-yellow-500 text-[#0f172a] font-bold py-3 rounded-md transition-all shadow-md disabled:opacity-50 mt-4"
      >
        {loading ? 'Procesando Planilla...' : 'Subir Información a la Plataforma'}
      </button>
    </div>
  )
}