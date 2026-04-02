import Link from 'next/link'
import Image from 'next/image'
import { Star, MessageCircle, ChevronRight, ShieldCheck, UserCheck, Gavel, FileText } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1e293b] font-sans">
      
      {/* 1. NAVBAR ELEGANTE Y SERIO */}
      <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 px-6 py-3 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* LOGO CORPORATIVO */}
          <Link href="/" className="flex items-center gap-4">
            <div className="relative h-12 w-48">
              {/* Obligatorio: Tener el logo en la carpeta public/logo.png */}
              <Image 
                src="/logo.png" 
                alt="SERCOPREV Logo" 
                fill 
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#servicios" className="text-sm font-semibold text-gray-600 hover:text-[#0f172a] transition-colors uppercase tracking-wider">
              Servicios
            </Link>
            <Link href="/login" className="bg-[#0f172a] text-white px-7 py-2.5 rounded-sm font-semibold hover:bg-[#1e293b] transition-all shadow-md text-sm tracking-wide border border-[#0f172a]">
              Acceso Clientes
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="pt-40 pb-24 px-6 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto text-center animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tighter text-[#0f172a]">
            Su Partner Estratégico <br />
            <span className="text-[#1d4ed8]">en el Camino al Éxito.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
            Más de 30 años de trayectoria impulsando el crecimiento de empresas en Chile. 
            Confíe su contabilidad a profesionales comprometidos con su tranquilidad financiera.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://wa.me/56993316939" className="flex items-center gap-2 bg-[#1d4ed8] text-white px-8 py-4 rounded-sm font-bold hover:bg-[#1e40af] transition-colors shadow-lg text-lg tracking-wide">
              <MessageCircle className="w-5 h-5" /> Asesoría por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* 3. TRAYECTORIA */}
      <section className="py-24 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div className="animate-fade-in delay-100">
          <div className="inline-block px-3 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-sm text-xs font-bold mb-6 tracking-widest uppercase">Trayectoria</div>
          <h2 className="text-4xl font-black mb-6 text-[#0f172a] tracking-tight">Sobre Nosotros</h2>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            Con más de tres décadas de experiencia, SERCOPREV nace con la misión de ser el aliado fundamental para las Pymes.
          </p>
          <p className="text-lg font-semibold text-[#1d4ed8] leading-relaxed border-l-4 border-[#1d4ed8] pl-5 py-2 bg-blue-50/50">
            No somos solo contadores; somos asesores comprometidos con la eficiencia, la legalidad y la responsabilidad.
          </p>
        </div>
        <div className="bg-[#0f172a] p-12 rounded-sm text-white shadow-xl relative animate-fade-in delay-200">
          <h3 className="text-2xl font-bold mb-6 text-[#eab308] tracking-tight">Nuestra Propuesta de Valor</h3>
          <p className="text-gray-300 mb-10 italic leading-relaxed text-lg font-light">
            "Si busca confiar la contabilidad de su empresa a profesionales responsables, con experiencia y que brinden un servicio 100% personalizado, está en el lugar correcto."
          </p>
          <div className="flex items-center gap-5 border-t border-gray-700 pt-6">
            <div className="w-14 h-14 bg-[#1d4ed8] flex items-center justify-center font-bold text-xl shadow-inner rounded-sm">RF</div>
            <div>
              <p className="font-bold text-white tracking-wide text-lg">René Figueroa</p>
              <p className="text-sm text-[#eab308] font-medium tracking-wide uppercase">Director Ejecutivo</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SERVICIOS */}
      <section id="servicios" className="py-24 bg-white px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto text-center mb-20 animate-fade-in">
          <h2 className="text-4xl font-black mb-6 uppercase tracking-tight text-[#0f172a]">Conozca nuestros servicios</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">Soluciones integrales diseñadas para cubrir todas las necesidades administrativas y legales de su empresa.</p>
        </div>
        
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-8 bg-[#fafafa] rounded-sm border border-gray-200 hover:border-[#1d4ed8] hover:shadow-xl transition-all duration-300 group">
            <div className="mb-6 text-[#1d4ed8]">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h4 className="font-bold text-xl mb-4 text-[#0f172a] tracking-tight">Contabilidad y Tributación</h4>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Contabilidad completa y simplificada</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Declaraciones (IVA, Renta)</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Balances y estados financieros</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Auditorías contables</li>
            </ul>
          </div>

          <div className="p-8 bg-[#fafafa] rounded-sm border border-gray-200 hover:border-[#1d4ed8] hover:shadow-xl transition-all duration-300 group">
            <div className="mb-6 text-[#1d4ed8]">
              <UserCheck className="w-10 h-10" />
            </div>
            <h4 className="font-bold text-xl mb-4 text-[#0f172a] tracking-tight">Recursos Humanos</h4>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Contratos de trabajo</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Liquidaciones y finiquitos</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Pago Previred</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Representación ante la DT</li>
            </ul>
          </div>

          <div className="p-8 bg-[#fafafa] rounded-sm border border-gray-200 hover:border-[#1d4ed8] hover:shadow-xl transition-all duration-300 group">
            <div className="mb-6 text-[#1d4ed8]">
              <Gavel className="w-10 h-10" />
            </div>
            <h4 className="font-bold text-xl mb-4 text-[#0f172a] tracking-tight">Gestión Legal</h4>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Constitución de sociedades</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Flujos de caja y presupuestos</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Facturación electrónica</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Registro INAPI</li>
            </ul>
          </div>

          <div className="p-8 bg-[#fafafa] rounded-sm border border-gray-200 hover:border-[#1d4ed8] hover:shadow-xl transition-all duration-300 group">
            <div className="mb-6 text-[#1d4ed8]">
              <FileText className="w-10 h-10" />
            </div>
            <h4 className="font-bold text-xl mb-4 text-[#0f172a] tracking-tight">Trámites Generales</h4>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Patentes y Resoluciones</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Tesorería General (TGR)</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Gestiones SII</li>
              <li className="flex gap-3 items-start"><ChevronRight className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5"/> Conservador (CBRS)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIOS */}
      <section className="bg-[#0f172a] py-24 px-4 overflow-hidden border-t border-gray-800">
        <div className="max-w-7xl mx-auto mb-16 text-center animate-fade-in">
          <h2 className="text-4xl font-black text-white mb-6 tracking-tight uppercase">Palabras de Agradecimiento</h2>
          <p className="text-[#eab308] text-lg font-medium tracking-wide">La confianza de nuestros clientes es nuestro mayor activo.</p>
        </div>

        <div className="space-y-8 pause-on-hover">
          <div className="flex overflow-hidden relative">
            <div className="flex gap-6 animate-marquee">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[380px] bg-[#1e293b] p-8 rounded-sm border border-gray-700 flex-shrink-0 hover:border-gray-500 transition-colors">
                  <div className="flex text-[#eab308] mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-gray-300 italic mb-6 leading-relaxed font-light">"Excelente servicio, Don René y su equipo son muy profesionales en el área contable."</p>
                  <div className="font-bold text-white text-sm tracking-widest uppercase text-gray-400">- Cliente Satisfecho #{i + 1}</div>
                </div>
              ))}
              {[...Array(15)].map((_, i) => (
                <div key={`dup1-${i}`} className="w-[380px] bg-[#1e293b] p-8 rounded-sm border border-gray-700 flex-shrink-0 hover:border-gray-500 transition-colors">
                  <div className="flex text-[#eab308] mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-gray-300 italic mb-6 leading-relaxed font-light">"Excelente servicio, Don René y su equipo son muy profesionales en el área contable."</p>
                  <div className="font-bold text-white text-sm tracking-widest uppercase text-gray-400">- Cliente Satisfecho #{i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex overflow-hidden relative">
            <div className="flex gap-6 animate-marquee-reverse">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[380px] bg-[#1e293b] p-8 rounded-sm border border-gray-700 flex-shrink-0 hover:border-gray-500 transition-colors">
                  <div className="flex text-[#eab308] mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-gray-300 italic mb-6 leading-relaxed font-light">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA."</p>
                  <div className="font-bold text-white text-sm tracking-widest uppercase text-gray-400">- Empresa Asociada #{i + 16}</div>
                </div>
              ))}
              {[...Array(15)].map((_, i) => (
                <div key={`dup2-${i}`} className="w-[380px] bg-[#1e293b] p-8 rounded-sm border border-gray-700 flex-shrink-0 hover:border-gray-500 transition-colors">
                  <div className="flex text-[#eab308] mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-gray-300 italic mb-6 leading-relaxed font-light">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA."</p>
                  <div className="font-bold text-white text-sm tracking-widest uppercase text-gray-400">- Empresa Asociada #{i + 16}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER CORPORATIVO */}
      <footer className="bg-[#0f172a] text-gray-300 py-16 px-6 border-t border-[#1e293b]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="relative h-14 w-48 mb-6 brightness-0 invert opacity-90">
              <Image 
                src="/logo.png" 
                alt="SERCOPREV Logo Blanco" 
                fill 
                className="object-contain object-left"
              />
            </div>
            <p className="text-sm leading-relaxed text-gray-400 pr-8">
              Su partner estratégico en contabilidad, recursos humanos y gestión legal.
              Impulsando el crecimiento de las Pymes chilenas con responsabilidad y excelencia.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-6 text-white uppercase tracking-wider">Contacto</h3>
            <ul className="space-y-4 text-sm text-gray-400 font-medium">
              <li className="flex items-start gap-3">Raza Chilena 2062, Independencia, Santiago.</li>
              <li className="flex items-center gap-3">contabilidad@sercoprev.cl</li>
              <li className="flex items-center gap-3">+56 9 9331 6939</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-6 text-white uppercase tracking-wider">Cápsulas "Sabías Qué"</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Consejos y explicaciones contables por parte de nuestro director para ayudarle a tomar mejores decisiones financieras y legales.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-800 flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <p>© 2026 SERCOPREV. Todos los derechos reservados.</p>
          <p>© 2026 FocusFrame Media SpA. Desarrollado en Chile.</p>
        </div>
      </footer>
    </div>
  )
}