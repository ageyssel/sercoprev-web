import { redirect } from 'next/navigation'
import { ShieldAlert, UserPlus, Database, Building } from 'lucide-react'
import { createClient } from '../../utils/supabase/server'
import { signOut } from '../dashboard/actions'
import { CreateClientForm } from './components/CreateClientForm'
import { DataImporter } from './components/DataImporter'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: adminData, error: adminError } = await supabase
    .from('empresas')
    .select('es_admin, razon_social')
    .eq('user_id', user.id)
    .single()

  if (adminError || !adminData?.es_admin) redirect('/dashboard')

  const { data: clientes, error: clientsError } = await supabase
    .from('empresas')
    .select('id, razon_social, rut')
    .eq('es_admin', false)
    .order('razon_social')

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <nav className="bg-[#0f172a] text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500" aria-hidden="true" />
            <span className="font-bold text-xl">
              SERCOPREV <span className="text-red-500 font-medium">ADMIN</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline">{adminData.razon_social}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors font-medium"
              >
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {clientsError && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            No fue posible cargar el directorio. Revise la conexión y las políticas RLS.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <section className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200" aria-labelledby="crear-cliente-title">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="p-3 bg-blue-50 rounded-lg text-[#1d4ed8]">
                <UserPlus className="w-6 h-6" aria-hidden="true" />
              </div>
              <h1 id="crear-cliente-title" className="text-2xl font-bold text-gray-800">
                Crear Nuevo Cliente
              </h1>
            </div>
            <CreateClientForm />
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200" aria-labelledby="carga-datos-title">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="p-3 bg-yellow-50 rounded-lg text-[#eab308]">
                <Database className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 id="carga-datos-title" className="text-2xl font-bold text-gray-800">
                Cargar Datos Financieros
              </h2>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Descargue la plantilla, complétela e importe hasta 500 registros por operación.
            </p>

            <DataImporter clientes={clientes ?? []} />
          </section>
        </div>

        <section className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200" aria-labelledby="directorio-title">
          <div className="flex items-center gap-3 mb-6">
            <Building className="w-6 h-6 text-gray-500" aria-hidden="true" />
            <h2 id="directorio-title" className="text-xl font-bold text-gray-800">
              Directorio de Clientes Activos
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                  <th scope="col" className="p-4 font-semibold">Razón Social</th>
                  <th scope="col" className="p-4 font-semibold">RUT</th>
                  <th scope="col" className="p-4 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {clientes?.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{cliente.razon_social}</td>
                    <td className="p-4 text-gray-600">{cliente.rut}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-bold uppercase tracking-wide">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
                {(!clientes || clientes.length === 0) && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-500 font-medium">
                      No hay clientes registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
