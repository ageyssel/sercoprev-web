// app/login/page.tsx
export const runtime = 'edge' // <--- Aquí SÍ se queda
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 border border-gray-200">
        
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[#0f172a]">Acceso Clientes</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Ingrese sus credenciales para revisar la información de su empresa.
          </p>
        </div>
        
        <form className="space-y-6" action={login}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input 
             name="email" 
             type="email" 
             required 
             className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white" 
             placeholder="cliente@correo.cl" 
           />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <input 
              name="password"
              type="password" 
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white" 
             placeholder="••••••••"
            />
          </div>

          {/* Aquí mostramos el error si las credenciales fallan */}
          {params?.message && (
            <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">
              {params.message}
            </p>
          )}
          
          <button 
            type="submit"
            className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-md"
          >
            Ingresar al Portal
          </button>
        </form>
        
        <div className="text-center pt-4">
          <a href="/" className="text-sm text-gray-500 hover:text-[#1d4ed8] font-medium transition-colors">
            ← Volver a la página principal
          </a>
        </div>
      </div>
      <footer className="mt-12 text-center text-gray-400 text-xs">
        <p>© 2026 FocusFrame Media SpA.</p>
      </footer>
    </div>
  );
}