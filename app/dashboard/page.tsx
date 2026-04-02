import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'
import { signOut } from './actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 1. Buscamos la empresa
  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // ---> AGREGA ESTAS 3 LÍNEAS AQUÍ <---
  if (empresa?.es_admin) {
    redirect('/admin')
  }
  // ------------------------------------

  // 2. Buscamos los documentos...

  let documentos: any[] = []
  if (empresa) {
    const { data: docs } = await supabase
      .from('documentos')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('fecha_subida', { ascending: false })
    
    if (docs) {
      // Magia aquí: Generamos una URL segura que expira en 60 minutos
      documentos = await Promise.all(docs.map(async (doc) => {
        const { data } = await supabase.storage
          .from('documentos')
          .createSignedUrl(doc.nombre, 3600)
        return { ...doc, urlSegura: data?.signedUrl }
      }))
    }
  }

  const docsImpuestos = documentos.filter(d => d.categoria === 'Impuestos')
  const docsRemuneraciones = documentos.filter(d => d.categoria === 'Remuneraciones')
  const docsLegal = documentos.filter(d => d.categoria === 'Legal')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0f172a] text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="font-bold text-xl">
            <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
            <span className="font-bold text-xl text-white">Portal <span className="text-[#eab308]">Clientes</span></span>
          </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <span>Usuario: <span className="text-white font-semibold">{user.email}</span></span>
            <form action={signOut}>
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors font-medium text-xs">
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {empresa ? empresa.razon_social : 'Bienvenido al Portal'}
          </h1>
          {empresa && (
            <div className="mt-2 flex items-center gap-4 text-gray-600 font-medium">
              <span>RUT: {empresa.rut}</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs uppercase tracking-wider">
                Estado IVA: {empresa.estado_impuestos}
              </span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#1d4ed8] mb-2">Área Impuestos</h2>
            <p className="text-gray-600 text-sm mb-4 border-b pb-4">I.V.A, Balances y Registros.</p>
            <ul className="space-y-2">
              {docsImpuestos.length === 0 ? (
                <li className="text-sm text-gray-400 italic">No hay documentos recientes.</li>
              ) : (
                docsImpuestos.map(doc => (
                  <li key={doc.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">📄 {doc.nombre}</span>
                    {/* Botón convertido en enlace de descarga */}
                    <a 
                      href={doc.urlSegura} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-3 py-1 rounded"
                    >
                      Descargar
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#1d4ed8] mb-2">Área Remuneraciones</h2>
            <p className="text-gray-600 text-sm mb-4 border-b pb-4">Liquidaciones, Previred y Contratos.</p>
            <ul className="space-y-2">
              {docsRemuneraciones.length === 0 ? (
                <li className="text-sm text-gray-400 italic">No hay documentos recientes.</li>
              ) : (
                docsRemuneraciones.map(doc => (
                  <li key={doc.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">📄 {doc.nombre}</span>
                    <a href={doc.urlSegura} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-3 py-1 rounded">
                      Descargar
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#1d4ed8] mb-2">Área Trámites y Legal</h2>
            <p className="text-gray-600 text-sm mb-4 border-b pb-4">Patentes, Escrituras y SII.</p>
            <ul className="space-y-2">
              {docsLegal.length === 0 ? (
                <li className="text-sm text-gray-400 italic">No hay documentos recientes.</li>
              ) : (
                docsLegal.map(doc => (
                  <li key={doc.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">📄 {doc.nombre}</span>
                    <a href={doc.urlSegura} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-3 py-1 rounded">
                      Descargar
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}