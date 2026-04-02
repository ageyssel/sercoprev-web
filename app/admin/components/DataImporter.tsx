'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import * as XLSX from 'xlsx'
import { Download, UploadCloud } from 'lucide-react'

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

  const descargarPlanillaTipo = () => {
    if (!categoria || !subcategoria) {
      alert("Seleccione Área y Trámite para descargar la planilla.");
      return;
    }

    const wsData = [
      ["periodo", "descripcion", "monto", "estado", "categoria", "subcategoria"],
      ["Ej: Abril 2026", `Ej: ${subcategoria}`, "150000", "Al día", categoria, subcategoria]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Datos");
    XLSX.writeFile(wb, `Plantilla_${subcategoria.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  }

  const handleFileUpload = async () => {
    if (!empresaId || !categoria || !subcategoria || !file) {
      alert("Complete todos los campos y seleccione el archivo de la planilla.")
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
        
        if (jsonData.length === 0) throw new Error("La planilla está vacía.")

        const supabase = createClient()
        const payload = jsonData.map((row: any) => ({ 
          ...row, 
          empresa_id: empresaId,
          categoria: row.categoria || categoria, 
          subcategoria: row.subcategoria || subcategoria
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
    <div className="space-y-6 bg-white p-2 rounded-lg mt-4">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-[#0f172a] mb-2">1. Seleccionar Cliente</label>
          <select required className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-gray-50" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">-- Seleccionar Empresa --</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-[#0f172a] mb-2">2. Área de Servicio</label>
          <select required className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-gray-50" value={categoria} onChange={(e) => { setCategoria(e.target.value); setSubcategoria(''); }}>
            <option value="">-- Seleccionar Área --</option>
            {Object.keys(ESTRUCTURA_SERVICIOS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {categoria && (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-fade-in">
          <label className="block text-sm font-bold text-[#1e3a8a] mb-2">3. Trámite Específico</label>
          <div className="flex flex-col md:flex-row gap-4">
            <select required className="flex-1 px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)}>
              <option value="">-- Seleccionar Trámite --</option>
              {ESTRUCTURA_SERVICIOS[categoria as keyof typeof ESTRUCTURA_SERVICIOS].map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            
            <button onClick={descargarPlanillaTipo} disabled={!subcategoria} className="flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50">
              <Download className="w-4 h-4" /> Bajar Planilla Tipo
            </button>
          </div>
        </div>
      )}

      {subcategoria && (
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl text-center bg-gray-50 hover:bg-gray-100 transition-colors animate-fade-in">
          <UploadCloud className="w-10 h-10 text-[#1e3a8a] mx-auto mb-3" />
          <label className="block text-sm font-bold text-[#0f172a] mb-2">4. Subir Planilla Completada (.xlsx)</label>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="mx-auto text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#1e3a8a] file:text-white hover:file:bg-[#1e40af] cursor-pointer" />
        </div>
      )}

      <button onClick={handleFileUpload} disabled={loading || !file} className="w-full flex justify-center items-center gap-2 bg-[#eab308] hover:bg-yellow-500 text-[#0f172a] font-black py-4 rounded-xl transition-all shadow-md disabled:opacity-50 mt-6 text-lg">
        {loading ? 'Procesando Planilla...' : 'Subir a la Base de Datos'}
      </button>
    </div>
  )
}