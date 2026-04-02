// app/admin/components/DataImporter.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// Recibimos la lista completa de clientes para el select
export function DataImporter({ clientes }: { clientes: any[] }) {
  const [empresaId, setEmpresaId] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!empresaId) {
      alert("Por favor, seleccione un cliente primero.")
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      
      // Intentamos parsear el JSON. (Ejemplo esperado: [{"periodo":"Marzo 2026","descripcion":"IVA","monto":100000,"estado":"Pagado"}])
      const data = JSON.parse(jsonInput) 

      const { error } = await supabase.from('datos_empresa').insert(
        data.map((row: any) => ({ ...row, empresa_id: empresaId }))
      )

      if (error) throw new Error(error.message)
      
      alert("¡Datos actualizados exitosamente en la plataforma!")
      setJsonInput('') // Limpiamos el campo después del éxito
    } catch (err: any) {
      alert("Error al procesar los datos. Verifique el formato JSON. Detalle: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">1. Seleccionar Cliente</label>
        <select 
          required 
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900"
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
        <label className="block text-sm font-semibold text-gray-700 mb-1">2. Pegar Datos (JSON)</label>
        <textarea 
          className="w-full h-32 p-4 border border-gray-300 rounded-lg text-sm mb-2 outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-gray-800"
          placeholder='Ej: [{"periodo": "Marzo 2026", "descripcion": "Pago IVA", "monto": 150000, "estado": "Pagado"}]'
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />
      </div>

      <button 
        onClick={handleImport}
        disabled={loading}
        className="w-full bg-[#eab308] hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50"
      >
        {loading ? 'Procesando y Guardando...' : 'Subir Información a la BD'}
      </button>
    </div>
  )
}