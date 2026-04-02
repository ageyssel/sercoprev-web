import Link from 'next/link'
import { Star, MessageCircle, ChevronRight, CheckCircle2, Clock, ShieldCheck, UserCheck } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans">
      {/* 1. NAVBAR (Con blur y animación) */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4 animate-fade-in">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-[#1d4ed8] text-white p-2 rounded-lg font-bold text-xl shadow-md">SER</div>
            <span className="font-extrabold text-2xl tracking-tight text-[#0f172a]">SERCOPREV</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium">
            <Link href="#servicios" className="text-gray-600 hover:text-[#1d4ed8] transition-colors font-semibold">Servicios</Link>
            <Link href="/login" className="bg-[#0f172a] text-white px-6 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-all shadow-lg font-bold">
              Portal Clientes Ingresar
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION (Con gradiente y fade-in en cascada) */}
      <section className="pt-36 pb-24 px-6 bg-gradient-to-b from-white to-[#eff6ff]">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight animate-fade-in">
            Su Partner Estratégico en el <br />
            <span className="text-[#1d4ed8]">Camino al Éxito.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 animate-fade-in delay-100 leading-relaxed">
            Más de 30 años de trayectoria impulsando el crecimiento de empresas en Chile. 
            Confíe su contabilidad a profesionales comprometidos con su tranquilidad financiera.
          </p>
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in delay-200">
            <a href="https://wa.me/56993316939" className="flex items-center gap-2 bg-[#25d366] text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl text-lg">
              <MessageCircle className="w-6 h-6" /> Asesoría por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* 3. TRAYECTORIA Y SOBRE NOSOTROS */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center animate-fade-in delay-300">
        <div>
          <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-6 tracking-wide uppercase">Trayectoria</div>
          <h2 className="text-4xl font-extrabold mb-6 text-[#0f172a]">Sobre Nosotros</h2>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            Con más de tres décadas de experiencia, SERCOPREV nace con la misión de ser el aliado fundamental para las Pymes.
          </p>
          <p className="text-lg font-semibold text-[#1d4ed8] leading-relaxed border-l-4 border-[#1d4ed8] pl-4">
            No somos solo contadores; somos asesores comprometidos con la eficiencia, la legalidad y la responsabilidad.
          </p>
        </div>
        <div className="bg-[#0f172a] p-10 rounded-3xl text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#1d4ed8] rounded-full opacity-20 blur-2xl"></div>
          <h3 className="text-2xl font-bold mb-4 text-[#eab308]">Nuestra Propuesta de Valor</h3>
          <p className="text-gray-300 mb-8 italic leading-relaxed">
            "Si busca confiar la contabilidad de su empresa a profesionales responsables, con experiencia y que brinden un servicio 100% personalizado, está en el lugar correcto."
          </p>
          <div className="flex items-center gap-4 border-t border-white/10 pt-6">
            <div className="w-12 h-12 bg-[#1d4ed8] rounded-full flex items-center justify-center font-bold text-lg shadow-inner">RF</div>
            <div>
              <p className="font-bold text-white tracking-wide">René Figueroa</p>
              <p className="text-sm text-gray-400">Director Ejecutivo</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SERVICIOS (Con tarjetas premium) */}
      <section id="servicios" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto text-center mb-16 animate-fade-in">
          <div className="w-12 h-1 bg-[#1d4ed8] mx-auto mb-6 rounded-full"></div>
          <h2 className="text-4xl font-black mb-4 uppercase tracking-tight text-[#0f172a]">Conozca nuestros servicios</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">Soluciones integrales diseñadas para cubrir todas las necesidades administrativas y legales de su empresa.</p>
        </div>
        
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Contabilidad */}
          <div className="p-8 bg-[#f8fafc] rounded-2xl border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-fade-in delay-100 group">
            <div className="w-14 h-14 bg-white text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-xl mb-4 text-[#0f172a]">Contabilidad y Tributación</h4>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Contabilidad completa y simplificada</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Declaraciones (IVA, Renta)</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Balances y estados financieros</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Auditorías contables</li>
            </ul>
          </div>

          {/* RRHH */}
          <div className="p-8 bg-[#f8fafc] rounded-2xl border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-fade-in delay-200 group">
            <div className="w-14 h-14 bg-white text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
              <UserCheck className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-xl mb-4 text-[#0f172a]">Recursos Humanos</h4>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Contratos de trabajo</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Liquidaciones y finiquitos</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Pago Previred</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Representación ante la DT</li>
            </ul>
          </div>

          {/* Gestión Legal */}
          <div className="p-8 bg-[#f8fafc] rounded-2xl border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-fade-in delay-300 group">
            <div className="w-14 h-14 bg-white text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-xl mb-4 text-[#0f172a]">Gestión Legal</h4>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Constitución de sociedades</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Flujos de caja y presupuestos</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Facturación electrónica</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Registro INAPI</li>
            </ul>
          </div>

          {/* Trámites */}
          <div className="p-8 bg-[#f8fafc] rounded-2xl border border-gray-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-fade-in delay-300 group">
            <div className="w-14 h-14 bg-white text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
              <Clock className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-xl mb-4 text-[#0f172a]">Trámites Generales</h4>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Patentes y Resoluciones</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Tesorería General (TGR)</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Gestiones SII</li>
              <li className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-[#1d4ed8] shrink-0 mt-0.5"/> Conservador (CBRS)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIOS (EL DISEÑO ORIGINAL DE ALTO CONTRASTE) */}
      <section className="bg-[#0f172a] py-24 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto mb-16 text-center animate-fade-in">
          <div className="w-12 h-1 bg-[#eab308] mx-auto mb-6 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Palabras de Agradecimiento</h2>
          <p className="text-gray-400 text-lg">La confianza de nuestros clientes es nuestro mayor activo.</p>
        </div>

        <div className="space-y-8 pause-on-hover">
          {/* PRIMERA LÍNEA */}
          <div className="flex overflow-hidden relative">
            <div className="flex gap-6 animate-marquee">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[350px] bg-[#1e293b] p-8 rounded-2xl border border-gray-700/50 flex-shrink-0 hover:border-gray-500 transition-colors">
                  <div className="flex text-[#eab308] mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current drop-shadow-md" />)}
                  </div>
                  <p className="text-gray-300 italic mb-6 leading-relaxed">"Excelente servicio, Don René y su equipo son muy profesionales en el área contable."</p>
                  <div className="font-bold text-white text-sm tracking-wide">- Cliente Satisfecho #{i + 1}</div>
                </div>
              ))}
              {[...Array(15)].map((_, i) => (
                <div key={`dup1-${i}`} className="w-[350px] bg-[#1e293b] p-8 rounded-2xl border border-gray-700/50 flex-shrink-0 hover:border-gray-500 transition-colors">
                  <div className="flex text-[#eab308] mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current drop-shadow-md" />)}
                  </div>
                  <p className="text-gray-300 italic mb-6 leading-relaxed">"Excelente servicio, Don René y su equipo son muy profesionales en el área contable."</p>
                  <div className="font-bold text-white text-sm tracking-wide">- Cliente Satisfecho #{i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SEGUNDA LÍNEA */}
          <div className="flex overflow-hidden relative">
            <div className="flex gap-6 animate-marquee-reverse">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[350px] bg-[#1e293b] p-8 rounded-2xl border border-gray-700/50 flex-shrink-0 hover:border-gray-500 transition-colors">
                  <div className="flex text-[#eab308] mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current drop-shadow-md" />)}
                  </div>
                  <p className="text-gray-300 italic mb-6 leading-relaxed">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA."</p>
                  <div className="font-bold text-white text-sm tracking-wide">- Empresa Asociada #{i + 16}</div>
                </div>
              ))}
              {[...Array(15)].map((_, i) => (
                <div key={`dup2-${i}`} className="w-[350px] bg-[#1e293b] p-8 rounded-2xl border border-gray-700/50 flex-shrink-0 hover:border-gray-500 transition-colors">
                  <div className="flex text-[#eab308] mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current drop-shadow-md" />)}
                  </div>
                  <p className="text-gray-300 italic mb-6 leading-relaxed">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA."</p>
                  <div className="font-bold text-white text-sm tracking-wide">- Empresa Asociada #{i + 16}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white pt-20 pb-10 border-t border-gray-200 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="font-black text-2xl mb-6 text-[#0f172a] tracking-tighter">SERCOPREV</h3>
            <p className="text-gray-500 text-sm leading-relaxed pr-8">
              Su partner estratégico en contabilidad, recursos humanos y gestión legal.
              Impulsando el crecimiento de las Pymes chilenas con responsabilidad y excelencia.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-6 text-[#0f172a]">Contacto</h3>
            <ul className="space-y-4 text-sm text-gray-600 font-medium">
              <li className="flex items-start gap-3">Raza Chilena 2062, Independencia, Santiago.</li>
              <li className="flex items-center gap-3">contabilidad@sercoprev.cl</li>
              <li className="flex items-center gap-3">+56 9 9331 6939</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-6 text-[#0f172a]">Cápsulas "Sabías Qué"</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Consejos y explicaciones contables por parte de nuestro director para ayudarle a tomar mejores decisiones financieras y legales.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-200 flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
          <p>© 2026 SERCOPREV. Todos los derechos reservados.</p>
          <p>Desarrollado en Chile por FocusFrame Media SpA.</p>
        </div>
      </footer>
    </div>
  )
}