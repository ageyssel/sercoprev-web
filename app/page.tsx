import Link from 'next/link'
import { Star, MessageCircle, ChevronRight, CheckCircle2, Clock, ShieldCheck, UserCheck } from 'lucide-react'

// Eliminamos el 'edge' de aquí para usar el runtime por defecto de Cloudflare si da problemas
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* NAVBAR */}
      <nav className="fixed w-full z-50 bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-[#1d4ed8] text-white p-2 rounded-lg font-bold">SER</div>
            <span className="font-extrabold text-2xl tracking-tighter">SERCOPREV</span>
          </div>
          <Link href="/login" className="bg-[#0f172a] text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition-all">
            Portal Clientes Ingresar
          </Link>
        </div>
      </nav>

      {/* HERO [cite: 6, 7] */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-white to-[#eff6ff] text-center">
        <h1 className="text-5xl md:text-6xl font-black mb-6">
          Su Partner Estratégico en el <br />
          <span className="text-[#1d4ed8]">Camino al Éxito.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          Más de 30 años de trayectoria impulsando el crecimiento de empresas en Chile[cite: 7].
        </p>
        <a href="https://wa.me/56993316939" className="inline-flex items-center gap-2 bg-[#25d366] text-white px-8 py-4 rounded-xl font-bold shadow-lg">
          <MessageCircle /> Asesoría por WhatsApp
        </a>
      </section>

      {/* SERVICIOS [cite: 19, 23, 28, 33] */}
      <section className="py-24 bg-white px-6 max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="p-8 bg-gray-50 rounded-2xl">
          <ShieldCheck className="text-blue-600 mb-4" />
          <h4 className="font-bold text-lg mb-2">Contabilidad</h4>
          <p className="text-sm text-gray-500">IVA, Renta y balances mensuales[cite: 20, 21].</p>
        </div>
        <div className="p-8 bg-gray-50 rounded-2xl">
          <UserCheck className="text-blue-600 mb-4" />
          <h4 className="font-bold text-lg mb-2">Recursos Humanos</h4>
          <p className="text-sm text-gray-500">Contratos, finiquitos y Previred[cite: 24, 26].</p>
        </div>
        <div className="p-8 bg-gray-50 rounded-2xl">
          <CheckCircle2 className="text-blue-600 mb-4" />
          <h4 className="font-bold text-lg mb-2">Gestión Legal</h4>
          <p className="text-sm text-gray-500">Constitución de sociedades y facturación[cite: 29, 31].</p>
        </div>
        <div className="p-8 bg-gray-50 rounded-2xl">
          <Clock className="text-blue-600 mb-4" />
          <h4 className="font-bold text-lg mb-2">Trámites</h4>
          <p className="text-sm text-gray-500">SII, Patentes y Tesorería[cite: 34, 36].</p>
        </div>
      </section>

      {/* TESTIMONIOS (CINTA) [cite: 53, 54] */}
      <section className="bg-[#0f172a] py-20 overflow-hidden">
        <h2 className="text-center text-3xl font-bold text-white mb-12">Palabras de Agradecimiento</h2>
        <div className="flex gap-6 animate-marquee mb-10">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-[300px] bg-[#1e293b] p-6 rounded-2xl shrink-0">
              <p className="text-gray-300 text-sm italic">"Excelente servicio, Don René y su equipo son muy profesionales." [cite: 56]</p>
              <p className="text-white font-bold mt-4 text-xs">Cliente #{i+1}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-6 animate-marquee-reverse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-[300px] bg-[#1e293b] p-6 rounded-2xl shrink-0">
              <p className="text-gray-300 text-sm italic">"El portal de clientes nos facilita mucho la gestión." [cite: 138]</p>
              <p className="text-white font-bold mt-4 text-xs">Empresa #{i+16}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER [cite: 229, 230, 231] */}
      <footer className="bg-white py-12 border-t border-gray-100 text-center text-sm text-gray-500">
        <p className="font-bold text-[#0f172a] mb-2">SERCOPREV</p>
        <p>Raza Chilena 2062, Independencia | contabilidad@sercoprev.cl</p>
        <p className="mt-4">© 2026 SERCOPREV | Desarrollado por FocusFrame Media SpA [cite: 232, 233]</p>
      </footer>
    </div>
  )
}