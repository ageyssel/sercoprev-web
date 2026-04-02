import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'
import { signOut } from '../dashboard/actions'
import { crearCliente, subirDocumento } from './actions'
import { ShieldAlert, UserPlus, Upload, Building } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: adminData } = await supabase
    .from('empresas')
    .select('es_admin, razon_social')
    .eq('user_id', user.id)
    .single()

  if (!adminData?.es_admin) redirect('/dashboard')

  const { data: clientes } = await supabase
    .from('empresas')
    .select('*')
    .eq('es_admin', false)
    .order('razon_social')

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-[#0f172a] text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span className="font-bold text-xl">SERCOPREV <span className="text-red-500 font-medium">ADMIN</span></span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline">Hola, Don René</span>
            <form action={signOut}>
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors font-medium">
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          
          {/* MÓDULO 1: CREAR CLIENTE */}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="p-3 bg-blue-50 rounded-lg text-[#1d4ed8]"><UserPlus className="w-6 h-6" /></div>
              <h2 className="text-2xl font-bold text-gray-800">Crear Nuevo Cliente</h2>
            </div>
            
            <form action={crearCliente} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social de la Empresa</label>
                {/* Agregamos text-gray-900, placeholder-gray-500 y border-gray-300 */}
                <input name="razon_social" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500 bg-white" placeholder="Ej. Comercializadora SpA" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">RUT Empresa</label>
                <input name="rut" type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500 bg-white" placeholder="Ej. 76.123.456-7" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Correo de Acceso</label>
                <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500 bg-white" placeholder="cliente@correo.cl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña Temporal</label>
                <input name="password" type="text" required minLength={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500 bg-white" placeholder="Mínimo 6 caracteres" />
              </div>
              <button type="submit" className="w-full bg-[#1d4ed8] hover:bg-blue-800 text-white font-bold py-3 rounded-lg mt-4 transition-colors">
                Registrar Cliente
              </button>
            </form>
          </div>

          {/* MÓDULO 2: SUBIR DOCUMENTOS */}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
             <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="p-3 bg-yellow-50 rounded-lg text-[#eab308]"><Upload className="w-6 h-6" /></div>
              <h2 className="text-2xl font-bold text-gray-800">Subir Documento PDF</h2>
            </div>

            <form action={subirDocumento} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Seleccionar Cliente</label>
                <select name="empresa_id" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900">
                  <option value="" className="text-gray-500">-- Elija una empresa --</option>
                  {clientes?.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.razon_social} ({cliente.rut})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría del Documento</label>
                <select name="categoria" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900">
                  <option value="Impuestos">Área Impuestos (IVA, Renta)</option>
                  <option value="Remuneraciones">Área Remuneraciones (Liquidaciones)</option>
                  <option value="Legal">Área Legal (Patentes, Escrituras)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Archivo (PDF, Excel, Word)</label>
                <input name="archivo" type="file" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-800 hover:file:bg-yellow-100" />
              </div>

              <button type="submit" className="w-full bg-[#eab308] hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg mt-4 transition-colors shadow-sm">
                Subir Archivo al Portal
              </button>
            </form>
          </div>

        </div>

        {/* DIRECTORIO DE CLIENTES */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <Building className="w-6 h-6 text-gray-500" />
            <h2 className="text-xl font-bold text-gray-800">Directorio de Clientes Activos</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                  <th className="p-4 font-semibold">Razón Social</th>
                  <th className="p-4 font-semibold">RUT</th>
                  <th className="p-4 font-semibold">Estado Impuestos</th>
                </tr>
              </thead>
              <tbody>
                {clientes?.map(cliente => (
                  <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{cliente.razon_social}</td>
                    <td className="p-4 text-gray-600">{cliente.rut}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-bold uppercase tracking-wide">
                        {cliente.estado_impuestos}
                      </span>
                    </td>
                  </tr>
                ))}
                {clientes?.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-gray-500 font-medium">No hay clientes registrados aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  )
}