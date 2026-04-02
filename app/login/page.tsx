import { login } from './actions'
import { SubmitButton } from '@/app/admin/components/SubmitButton'
import Image from 'next/image'
import Link from 'next/link'

export default async function LoginPage(props: { searchParams: Promise<{ message: string }> }) {
  const searchParams = await props.searchParams;
  
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4 font-sans">
      
      <div className="mb-8">
        <Link href="/">
          <div className="relative h-16 w-56 hover:scale-105 transition-transform">
            <Image src="/logo.png" alt="SERCOPREV Logo" fill className="object-contain" priority />
          </div>
        </Link>
      </div>

      <div className="max-w-md w-full bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 space-y-8 border border-gray-100">
        <div className="text-center border-b border-gray-100 pb-6">
          <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">Acceso Portal</h2>
          <p className="text-gray-500 mt-2 text-sm font-medium">Ingrese sus credenciales de cliente</p>
        </div>
        
        <form className="space-y-6" action={login}>
          <div>
            <label className="block text-sm font-bold text-[#0f172a] mb-2 uppercase tracking-wide">Correo Electrónico</label>
            <input 
             name="email" type="email" required 
             className="w-full px-4 py-3 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-gray-900 bg-gray-50 transition-all" 
             placeholder="cliente@empresa.cl" 
           />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#0f172a] mb-2 uppercase tracking-wide">Contraseña</label>
            <input 
              name="password" type="password" required
              className="w-full px-4 py-3 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#1e3a8a] text-gray-900 bg-gray-50 transition-all" 
              placeholder="••••••••"
            />
          </div>

          {searchParams?.message && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <p className="text-red-700 text-sm font-bold">{searchParams.message}</p>
            </div>
          )}
          
          <SubmitButton 
            text="Ingresar a mi Cuenta" 
            loadingText="Verificando..." 
            className="w-full bg-[#eab308] hover:bg-yellow-500 text-[#0f172a] font-black py-4 rounded-md transition-all shadow-md text-lg tracking-wide"
          />
        </form>
        
        <div className="text-center pt-2">
          <Link href="/" className="text-sm text-gray-400 hover:text-[#1e3a8a] font-bold transition-colors">
            &larr; Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
}