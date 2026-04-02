// app/admin/components/DataImporter.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import * as XLSX from 'xlsx'
import { Download, UploadCloud } from 'lucide-react'

// Definimos la estructura exacta que pediste
const ESTRUCTURA_SERVICIOS = {
  "Contabilidad y Tributación": [
    "Contabilidad simplificada", "Declaraciones (IVA, Renta)", "Balances financieros", "Auditorías contables"
  ],
  "Recursos Humanos": [
    "Contratos de trabajo", "Liquidaciones y finiquitos", "Pago Previred", "Representación DT"
  ],
  "Gestión Legal": [
    "Constitución de sociedades", "Flujos de caja", "Facturación electrónica", "Registro INAPI"
  ],
  "Trámites Generales": [
    "Patentes y Resoluciones", "Tesorería General (TGR)", "Gestiones SII", "Conservador (CBRS)"
  ]
}

export function DataImporter({ clientes }: { clientes: any[] }) {
  const [empresaId, setEmpresaId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // Generador de Plantillas Excel Dinámicas
  const descargarPlanillaTipo = () => {
    if (!categoria || !subcategoria) {
      alert("Seleccione una Categoría y Subcategoría primero para generar la planilla.");
      return;
    }

    const wsData = [
      ["Periodo", "Descripcion", "Monto", "Estado", "Categoria", "Subcategoria"],
      ["Ej: Marzo 2026", `Ej: ${subcategoria}`, "150000", "Al día", categoria, subcategoria]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Datos");
    XLSX.writeFile(wb, `Plantilla_${subcategoria.replace(/\s+/g, '_')}.xlsx`);
  }

  const handleFileUpload = async () => {
    if (!empresaId || !categoria || !subcategoria || !file) {
      alert("Por favor complete todos los campos y seleccione un archivo.")
      return
    }

    try {
      setLoading(true)
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        if (jsonData.length === 0) throw new Error("El archivo está vacío.")

        const supabase = createClient()
        // Aseguramos que los datos se guarden con la categoría elegida
        const payload = jsonData.map((row: any) => ({ 
          ...row, 
          empresa_id: empresaId,
          categoria: row.Categoria || categoria, 
          subcategoria: row.Subcategoria || subcategoria
        }))

        const { error } = await supabase.from('datos_empresa').insert(payload)
        if (error) throw new Error(error.message)
        
        alert(`¡Éxito! Se subieron ${jsonData.length} registros para ${subcategoria}.`)
        setFile(null)
      }
      reader.readAsArrayBuffer(file)
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 bg-white p-2 rounded-lg">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Paso 1: Cliente */}
        <div>
          <label className="block text-sm font-bold text-[#0f172a] mb-2">1. Cliente</label>
          <select required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none text-gray-900 bg-gray-50" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>

        {/* Paso 2: Categoría */}
        <div>
          <label className="block text-sm font-bold text-[#0f172a] mb-2">2. Área de Servicio</label>
          <select required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none text-gray-900 bg-gray-50" value={categoria} onChange={(e) => { setCategoria(e.target.value); setSubcategoria(''); }}>
            <option value="">-- Seleccionar Área --</option>
            {Object.keys(ESTRUCTURA_SERVICIOS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Paso 3: Subcategoría y Descarga */}
      {categoria && (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-fade-in">
          <label className="block text-sm font-bold text-[#1e3a8a] mb-2">3. Trámite Específico</label>
          <div className="flex flex-col md:flex-row gap-4">
            <select required className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none text-gray-900 bg-white" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)}>
              <option value="">-- Seleccionar Trámite --</option>
              {ESTRUCTURA_SERVICIOS[categoria as keyof typeof ESTRUCTURA_SERVICIOS].map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            
            {/* BOTÓN PARA DESCARGAR PLANTILLA TIPO */}
            <button 
              onClick={descargarPlanillaTipo} 
              disabled={!subcategoria}
              className="flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Bajar Planilla Tipo
            </button>
          </div>
        </div>
      )}

      {/* Paso 4: Subir Archivo */}
      {subcategoria && (
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl text-center bg-gray-50 hover:bg-gray-100 transition-colors animate-fade-in">
          <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <label className="block text-sm font-bold text-[#0f172a] mb-2">4. Subir Planilla Completada (.xlsx)</label>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="mx-auto text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1e3a8a] file:text-white hover:file:bg-[#1e40af] cursor-pointer" />
        </div>
      )}

      <button onClick={handleFileUpload} disabled={loading || !file} className="w-full flex justify-center items-center gap-2 bg-[#eab308] hover:bg-yellow-500 text-[#0f172a] font-black py-4 rounded-xl transition-all shadow-lg disabled:opacity-50 mt-6 text-lg">
        {loading ? 'Procesando Documento...' : 'Subir a la Base de Datos'}
      </button>
    </div>
  )
}