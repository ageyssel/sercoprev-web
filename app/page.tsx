import Link from 'next/link'
import { Star, MessageCircle, ChevronRight, CheckCircle2, Clock, ShieldCheck, UserCheck } from 'lucide-react'

// Forzamos el modo Edge para Cloudflare
export const runtime = 'edge'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans">
      {/* 1. NAVBAR */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-[#1d4ed8] text-white p-2 rounded-lg font-bold text-xl">SER</div>
            <span className="font-extrabold text-2xl tracking-tight">SERCOPREV</span> [cite: 3]
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium">
            <Link href="#servicios" className="hover:text-[#1d4ed8] transition-colors">Servicios</Link>
            <Link href="/login" className="bg-[#0f172a] text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-all shadow-lg">
              Portal Clientes Ingresar [cite: 5]
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-white to-[#eff6ff]">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Su Partner Estratégico en el <br />
            <span className="text-[#1d4ed8]">Camino al Éxito.</span> [cite: 6]
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Más de 30 años de trayectoria impulsando el crecimiento de empresas en Chile. [cite: 7] 
            Confíe su contabilidad a profesionales comprometidos con su tranquilidad financiera. [cite: 8]
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://wa.me/56993316939" className="flex items-center gap-2 bg-[#25d366] text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl">
              <MessageCircle /> Asesoría por WhatsApp [cite: 9]
            </a>
          </div>
        </div>
      </section>

      {/* 3. TRAYECTORIA & SOBRE NOSOTROS */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-4">Trayectoria [cite: 10]</div>
          <h2 className="text-4xl font-extrabold mb-6">Sobre Nosotros [cite: 11]</h2>
          <p className="text-lg text-gray-600 mb-6">
            Con más de tres décadas de experiencia, SERCOPREV nace con la misión de ser el aliado fundamental para las Pymes. [cite: 12]
          </p>
          <p className="text-lg font-semibold text-[#1d4ed8]">
            No somos solo contadores; somos asesores comprometidos con la eficiencia, la legalidad y la responsabilidad. [cite: 13]
          </p>
        </div>
        <div className="bg-[#0f172a] p-10 rounded-3xl text-white shadow-2xl">
          <h3 className="text-2xl font-bold mb-4">Nuestra Propuesta de Valor [cite: 14]</h3>
          <p className="text-gray-300 mb-6 italic">
            "Si busca confiar la contabilidad de su empresa a profesionales responsables, con experiencia y que brinden un servicio 100% personalizado, está en el lugar correcto." [cite: 15]
          </p>
          <div className="flex items-center gap-4 border-t border-white/10 pt-6">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center font-bold">RF</div>
            <div>
              <p className="font-bold">René Figueroa</p>
              <p className="text-sm text-gray-400">Director Ejecutivo</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SERVICIOS INTEGRALES */}
      <section id="servicios" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-black mb-4 uppercase tracking-tight">Conozca nuestros servicios [cite: 17]</h2>
          <p className="text-gray-500">Soluciones integrales diseñadas para cubrir todas las necesidades administrativas y legales de su empresa. [cite: 18]</p>
        </div>
        
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* CATEGORÍA 1 */}
          <div className="p-8 bg-[#f8fafc] rounded-2xl border border-gray-100 hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg"><ShieldCheck /></div>
            <h4 className="font-bold text-xl mb-4">Contabilidad y Tributación [cite: 19]</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Contabilidad completa y simplificada [cite: 20]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Declaraciones de impuestos (IVA, Renta) [cite: 21]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Confección de balances [cite: 22]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Auditorías contables [cite: 22]</li>
            </ul>
          </div>

          {/* CATEGORÍA 2 */}
          <div className="p-8 bg-[#f8fafc] rounded-2xl border border-gray-100 hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg"><UserCheck /></div>
            <h4 className="font-bold text-xl mb-4">Recursos Humanos [cite: 23]</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Contratos de trabajo [cite: 24]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Liquidaciones y finiquitos [cite: 25]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Pago Previred [cite: 26]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Representación ante la DT [cite: 27]</li>
            </ul>
          </div>

          {/* CATEGORÍA 3 */}
          <div className="p-8 bg-[#f8fafc] rounded-2xl border border-gray-100 hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg"><CheckCircle2 /></div>
            <h4 className="font-bold text-xl mb-4">Gestión Legal [cite: 28]</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Constitución de sociedades [cite: 29]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Flujos de caja y presupuestos [cite: 30]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Facturación electrónica [cite: 31]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Registro INAPI [cite: 32]</li>
            </ul>
          </div>

          {/* CATEGORÍA 4 */}
          <div className="p-8 bg-[#f8fafc] rounded-2xl border border-gray-100 hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg"><Clock /></div>
            <h4 className="font-bold text-xl mb-4">Trámites Generales [cite: 33]</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Patentes comerciales [cite: 34]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Resoluciones Sanitarias [cite: 34]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Gestiones SII [cite: 36]</li>
              <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-600 shrink-0"/> Conservador CBRS [cite: 37]</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. CINTA DE TESTIMONIOS (CÓDIGO MEJORADO SEGÚN PDF) */}
      <section className="bg-[#0f172a] py-24 overflow-hidden relative">
        <div className="max-w-7xl mx-auto mb-16 text-center px-6">
          <h2 className="text-4xl font-bold text-white mb-4 italic">Palabras de Agradecimiento [cite: 53]</h2>
          <p className="text-blue-400">La confianza de nuestros clientes es nuestro mayor activo. [cite: 54]</p>
        </div>

        <div className="space-y-10 group">
          {/* LÍNEA 1: CLIENTES SATISFECHOS */}
          <div className="flex overflow-hidden relative">
            <div className="flex gap-6 animate-marquee group-hover:[animation-play-state:paused]">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[350px] bg-[#1e293b] p-8 rounded-3xl border border-white/5 flex-shrink-0 transition-transform hover:scale-105">
                  <div className="flex text-yellow-500 mb-4 tracking-tighter">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-300 italic mb-4 leading-relaxed text-sm">"Excelente servicio, Don René y su equipo son muy profesionales en el área contable." [cite: 56]</p>
                  <div className="text-white font-bold text-sm">Cliente Satisfecho #{i + 1}</div> [cite: 57]
                </div>
              ))}
              {/* Duplicado para infinito */}
              {[...Array(15)].map((_, i) => (
                <div key={`d1-${i}`} className="w-[350px] bg-[#1e293b] p-8 rounded-3xl border border-white/5 flex-shrink-0">
                  <div className="flex text-yellow-500 mb-4 tracking-tighter">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-300 italic mb-4 leading-relaxed text-sm">"Excelente servicio, Don René y su equipo son muy profesionales en el área contable." [cite: 56]</p>
                  <div className="text-white font-bold text-sm">Cliente Satisfecho #{i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          {/* LÍNEA 2: EMPRESAS ASOCIADAS */}
          <div className="flex overflow-hidden relative">
            <div className="flex gap-6 animate-marquee-reverse group-hover:[animation-play-state:paused]">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[350px] bg-[#1e293b] p-8 rounded-3xl border border-white/5 flex-shrink-0 transition-transform hover:scale-105">
                  <div className="flex text-yellow-500 mb-4 tracking-tighter">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-300 italic mb-4 leading-relaxed text-sm">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA." [cite: 138]</p>
                  <div className="text-white font-bold text-sm">Empresa Asociada #{i + 16}</div> [cite: 139]
                </div>
              ))}
              {/* Duplicado para infinito */}
              {[...Array(15)].map((_, i) => (
                <div key={`d2-${i}`} className="w-[350px] bg-[#1e293b] p-8 rounded-3xl border border-white/5 flex-shrink-0">
                  <div className="flex text-yellow-500 mb-4 tracking-tighter">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-300 italic mb-4 leading-relaxed text-sm">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA." [cite: 138]</p>
                  <div className="text-white font-bold text-sm">Empresa Asociada #{i + 16}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-white pt-20 pb-10 border-t border-gray-100 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="font-bold text-xl mb-6">SERCOPREV [cite: 3, 232]</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Su partner estratégico en contabilidad, recursos humanos y gestión legal. [cite: 227]
              Impulsando el crecimiento de las Pymes chilenas con responsabilidad y excelencia. [cite: 228]
            </p>
          </div>
          <div>
            <h3 className="font-bold text-xl mb-6">Contacto</h3>
            <ul className="space-y-4 text-sm text-gray-600">
              <li>Raza Chilena 2062, Independencia, Santiago, Chile. [cite: 229]</li>
              <li>contabilidad@sercoprev.cl [cite: 230]</li>
              <li>+56 9 9331 6939 [cite: 231]</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-xl mb-6">Cápsulas "Sabías Qué" [cite: 38]</h3>
            <p className="text-gray-500 text-sm">Consejos contables por parte de nuestro director para mejores decisiones. [cite: 39]</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-100 flex flex-wrap justify-between items-center gap-4 text-xs font-medium text-gray-400 uppercase tracking-widest">
          <p>© 2026 SERCOPREV. Todos los derechos reservados. [cite: 232]</p>
          <p>Desarrollado en Chile por FocusFrame Media SpA. [cite: 233]</p>
        </div>
      </footer>
    </div>
  )
}