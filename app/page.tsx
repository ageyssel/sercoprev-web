import Link from 'next/link'
import { Star, MessageCircle, ChevronRight, ShieldCheck, UserCheck, Gavel, FileText } from 'lucide-react'

// CONFIGURACIÓN OBLIGATORIA PARA CLOUDFLARE
export const runtime = 'edge' 

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#0f172a] font-sans">
      {/* NAVBAR */}
      <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-[#1d4ed8] text-white p-1.5 rounded font-bold text-lg">SER</div>
            <span className="font-black text-xl tracking-tighter text-[#0f172a]">SERCOPREV</span>
          </div>
          <Link href="/login" className="bg-[#1d4ed8] text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition-all text-sm">
            Portal de Clientes Ingresar
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Su Partner Estratégico en el <br />
            <span className="text-[#1d4ed8]">Camino al Éxito.</span> [cite: 6]
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Más de 30 años de trayectoria impulsando el crecimiento de empresas en Chile. [cite: 7]
            Confíe su contabilidad a profesionales comprometidos con su tranquilidad financiera. [cite: 8]
          </p>
          <a href="https://wa.me/56993316939" className="inline-flex items-center gap-2 bg-[#25d366] text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:scale-105 transition-transform">
            <MessageCircle /> Asesoría por WhatsApp [cite: 9]
          </a>
        </div>
      </section>

      {/* SERVICIOS DESDE EL PDF */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Conozca nuestros servicios</h2> [cite: 17]
          <p className="text-gray-500">Soluciones integrales para las necesidades administrativas y legales de su empresa.</ [cite: 18]
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Contabilidad */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <ShieldCheck className="text-[#1d4ed8] mb-4" />
            <h3 className="font-bold mb-3">Contabilidad y Tributación</h3> [cite: 19]
            <ul className="text-xs text-gray-500 space-y-2">
              <li>• Contabilidad completa y simplificada [cite: 20]</li>
              <li>• Declaraciones de IVA y Renta [cite: 21]</li>
              <li>• Balances y estados financieros [cite: 22]</li>
            </ul>
          </div>
          {/* RRHH */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <UserCheck className="text-[#1d4ed8] mb-4" />
            <h3 className="font-bold mb-3">Recursos Humanos</h3> [cite: 23]
            <ul className="text-xs text-gray-500 space-y-2">
              <li>• Contratos de trabajo [cite: 24]</li>
              <li>• Liquidaciones y finiquitos [cite: 25]</li>
              <li>• Pago de imposiciones Previred [cite: 26]</li>
            </ul>
          </div>
          {/* Gestión */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <Gavel className="text-[#1d4ed8] mb-4" />
            <h3 className="font-bold mb-3">Gestión Legal</h3> [cite: 28]
            <ul className="text-xs text-gray-500 space-y-2">
              <li>• Constitución de sociedades [cite: 29]</li>
              <li>• Facturación electrónica [cite: 31]</li>
              <li>• Registro de marca INAPI [cite: 32]</li>
            </ul>
          </div>
          {/* Trámites */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <FileText className="text-[#1d4ed8] mb-4" />
            <h3 className="font-bold mb-3">Trámites Generales</h3> [cite: 33]
            <ul className="text-xs text-gray-500 space-y-2">
              <li>• Patentes y Resoluciones Sanitarias [cite: 34]</li>
              <li>• Gestiones ante el SII [cite: 36]</li>
              <li>• Tesorería General [cite: 35]</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CINTA DE TESTIMONIOS (30 APROX) */}
      <section className="bg-[#0f172a] py-20 overflow-hidden">
        <h2 className="text-center text-2xl font-bold text-white mb-12 italic">Palabras de Agradecimiento</h2> [cite: 53]
        <div className="flex gap-6 animate-marquee mb-8">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="w-[300px] bg-[#1e293b] p-6 rounded-2xl shrink-0 border border-white/5">
              <div className="flex text-yellow-500 mb-2">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-3 h-3 fill-current" />)}
              </div>
              <p className="text-gray-300 text-xs italic">"Excelente servicio, Don René y su equipo son muy profesionales." [cite: 56, 59, 61]</p>
              <p className="text-white font-bold mt-3 text-[10px]">Cliente Satisfecho #{i+1}</p> [cite: 57, 60, 62]
            </div>
          ))}
        </div>
        <div className="flex gap-6 animate-marquee-reverse">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="w-[300px] bg-[#1e293b] p-6 rounded-2xl shrink-0 border border-white/5">
              <div className="flex text-yellow-500 mb-2">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-3 h-3 fill-current" />)}
              </div>
              <p className="text-gray-300 text-xs italic">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA." [cite: 138, 141, 144]</p>
              <p className="text-white font-bold mt-3 text-[10px]">Empresa Asociada #{i+16}</p> [cite: 139, 142, 145]
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-50 py-16 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 text-sm text-gray-500">
          <div>
            <h4 className="font-black text-[#0f172a] mb-4">SERCOPREV</h4>
            <p>Raza Chilena 2062, Independencia, Santiago. [cite: 229]</p>
            <p>contabilidad@sercoprev.cl | +56 9 9331 6939 [cite: 230, 231]</p>
          </div>
          <div className="md:text-right">
            <p>© 2026 SERCOPREV. Todos los derechos reservados. [cite: 232]</p>
            <p className="text-[10px] mt-2">Desarrollado por FocusFrame Media SpA. [cite: 233]</p>
          </div>
        </div>
      </footer>
    </div>
  )
}