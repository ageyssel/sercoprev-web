import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'
import { signOut } from './actions'

export const dynamic = 'force-dynamic'

type DocumentRow = {
  id: string
  nombre_original: string
  storage_path: string
  categoria: 'Impuestos' | 'Remuneraciones' | 'Legal'
  fecha_subida: string
}

type DocumentWithUrl = DocumentRow & {
  signedUrl: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: empresa, error: companyError } = await supabase
    .from('empresas')
    .select('id, razon_social, rut, estado_impuestos, es_admin, must_change_password')
    .eq('user_id', user.id)
    .single()

  if (companyError || !empresa) {
    await supabase.auth.signOut()
    redirect('/login?message=Su cuenta no tiene una empresa asociada')
  }

  if (empresa.es_admin) redirect('/admin')
  if (empresa.must_change_password) redirect('/cuenta/cambiar-clave')

  const { data: documentRows, error: documentsError } = await supabase
    .from('documentos')
    .select('id, nombre_original, storage_path, categoria, fecha_subida')
    .eq('empresa_id', empresa.id)
    .order('fecha_subida', { ascending: false })

  const documentos: DocumentWithUrl[] = await Promise.all(
    ((documentRows ?? []) as DocumentRow[]).map(async (document) => {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(document.storage_path, 900)

      return {
        ...document,
        signedUrl: error ? null : data.signedUrl,
      }
    }),
  )

  const docsByCategory = {
    Impuestos: documentos.filter((document) => document.categoria === 'Impuestos'),
    Remuneraciones: documentos.filter((document) => document.categoria === 'Remuneraciones'),
    Legal: documentos.filter((document) => document.categoria === 'Legal'),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0f172a] text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-28">
              <Image src="/logo.png" alt="SERCOPREV" fill className="object-contain object-left" priority />
            </div>
            <span className="font-bold text-xl text-white">
              Portal <span className="text-[#eab308]">Clientes</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <span className="break-all">
              Usuario: <span className="text-white font-semibold">{user.email}</span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors font-medium text-xs"
              >
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{empresa.razon_social}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-gray-600 font-medium">
            <span>RUT: {empresa.rut}</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs uppercase tracking-wider">
              Estado IVA: {empresa.estado_impuestos}
            </span>
          </div>
        </header>

        {documentsError && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            No fue posible cargar sus documentos. Inténtelo nuevamente o contacte a SERCOPREV.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DocumentCard
            title="Área Impuestos"
            description="I.V.A, balances y registros."
            documents={docsByCategory.Impuestos}
          />
          <DocumentCard
            title="Área Remuneraciones"
            description="Liquidaciones, Previred y contratos."
            documents={docsByCategory.Remuneraciones}
          />
          <DocumentCard
            title="Área Trámites y Legal"
            description="Patentes, escrituras y SII."
            documents={docsByCategory.Legal}
          />
        </div>
      </main>
    </div>
  )
}

function DocumentCard({
  title,
  description,
  documents,
}: {
  title: string
  description: string
  documents: DocumentWithUrl[]
}) {
  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-[#1d4ed8] mb-2">{title}</h2>
      <p className="text-gray-600 text-sm mb-4 border-b pb-4">{description}</p>
      <ul className="space-y-2">
        {documents.length === 0 ? (
          <li className="text-sm text-gray-400 italic">No hay documentos recientes.</li>
        ) : (
          documents.map((document) => (
            <li key={document.id} className="flex gap-3 justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
              <span className="font-medium text-gray-700 break-words">{document.nombre_original}</span>
              {document.signedUrl ? (
                <a
                  href={document.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-blue-700 hover:text-blue-900 text-xs font-bold bg-blue-50 px-3 py-1 rounded"
                >
                  Descargar
                </a>
              ) : (
                <span className="shrink-0 text-xs font-semibold text-red-700">No disponible</span>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
