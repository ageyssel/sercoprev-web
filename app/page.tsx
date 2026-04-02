import { 
  MapPin, 
  Mail, 
  Phone, 
  Calculator, 
  FileText, 
  Users, 
  Briefcase, 
  MessageCircle,
  Star,
  ChevronRight
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* 1. NAVEGACIÓN FIJA (Sticky Header) */}
      <header className="fixed top-0 w-full z-50 bg-[#0f172a]/95 backdrop-blur-md shadow-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo SERCOPREV" className="h-10 md:h-12 object-contain" />
            <div className="hidden sm:block text-white font-bold text-xl leading-none">
              SERCOPREV <br/>
              <span className="text-[#eab308] text-xs font-medium tracking-widest uppercase">Contabilidad y Gestión</span>
            </div>
          </div>
          <a href="/login" className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-md flex items-center gap-2 text-sm border border-blue-600">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Portal de Clientes</span>
            <span className="sm:hidden">Ingresar</span>
          </a>
        </div>
      </header>

      {/* 2. HERO SECTION CON TEXTURA */}
      <main className="relative pt-40 pb-24 lg:pt-48 lg:pb-32 bg-[#0f172a] overflow-hidden">
        {/* Patrón de fondo estilo financiero */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-transparent to-[#0f172a]"></div>

        <div className="relative z-10 text-center max-w-5xl mx-auto px-4 animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Su Partner Estratégico en el <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#eab308] to-[#fef08a]">Camino al Éxito.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto font-light leading-relaxed">
            Más de 30 años de trayectoria impulsando el crecimiento de empresas en Chile. Confíe su contabilidad a profesionales comprometidos con su tranquilidad financiera.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/56993316939" target="_blank" rel="noopener noreferrer" className="bg-[#25D366] hover:bg-[#1ebd57] text-white font-bold py-3.5 px-8 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-105">
              <MessageCircle className="w-6 h-6" />
              <span>Asesoría por WhatsApp</span>
            </a>
          </div>
        </div>
      </main>

      {/* 3. SOBRE NOSOTROS */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-12 h-1 bg-[#eab308]"></div>
              <span className="text-[#1d4ed8] font-bold uppercase tracking-wider text-sm">Trayectoria</span>
            </div>
            <h2 className="text-4xl font-extrabold text-[#0f172a] mb-6">Sobre Nosotros</h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              Con más de tres décadas de experiencia, <strong>SERCOPREV</strong> nace con la misión de ser el aliado fundamental para las Pymes. No somos solo contadores; somos asesores comprometidos con la eficiencia, la legalidad y la responsabilidad.
            </p>
          </div>
          <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 relative">
            <div className="absolute -top-6 -left-6 text-[#eab308] opacity-20 text-9xl leading-none font-serif">"</div>
            <h3 className="text-2xl font-bold text-[#0f172a] mb-4 relative z-10">Nuestra Propuesta de Valor</h3>
            <p className="text-gray-600 leading-relaxed italic relative z-10">
              Si busca confiar la contabilidad de su empresa a profesionales responsables, con experiencia y que brinden un servicio 100% personalizado, está en el lugar correcto. Nos comprometemos con su tranquilidad financiera para que usted se enfoque en lo que mejor sabe hacer: <strong>hacer crecer su negocio.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* 4. NUESTROS SERVICIOS PREMIUM */}
      <section className="bg-[#0f172a] py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-white mb-4">Conozca nuestros servicios</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">Soluciones integrales diseñadas para cubrir todas las necesidades administrativas y legales de su empresa.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Área Impuesto */}
            <div className="bg-[#1e293b] p-8 rounded-xl border border-gray-700 hover:border-[#eab308] transition-all group shadow-lg">
              <div className="bg-[#0f172a] w-14 h-14 rounded-lg flex items-center justify-center mb-6 text-[#1d4ed8] group-hover:text-[#eab308] transition-colors border border-gray-700">
                <Calculator className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Contabilidad y Tributación</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Contabilidad completa y simplificada.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Declaraciones de impuestos mensuales y anuales (IVA, Renta).</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Confección de balances y estados financieros.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Auditorías y regularizaciones contables.</span></li>
              </ul>
            </div>

            {/* Área Remuneraciones */}
            <div className="bg-[#1e293b] p-8 rounded-xl border border-gray-700 hover:border-[#eab308] transition-all group shadow-lg">
               <div className="bg-[#0f172a] w-14 h-14 rounded-lg flex items-center justify-center mb-6 text-[#1d4ed8] group-hover:text-[#eab308] transition-colors border border-gray-700">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Recursos Humanos y Previsional</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Elaboración y actualización de contratos de trabajo.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Generación de liquidaciones de sueldo y finiquitos.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Declaraciones y pago de imposiciones (Previred).</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Representación ante la Dirección del Trabajo.</span></li>
              </ul>
            </div>

            {/* Gestión Administrativa */}
            <div className="bg-[#1e293b] p-8 rounded-xl border border-gray-700 hover:border-[#eab308] transition-all group shadow-lg">
               <div className="bg-[#0f172a] w-14 h-14 rounded-lg flex items-center justify-center mb-6 text-[#1d4ed8] group-hover:text-[#eab308] transition-colors border border-gray-700">
                <Briefcase className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Gestión Administrativa y Legal</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Constitución de sociedades (Tu Empresa en un Día / Notaría).</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Planificación de flujos de caja y presupuestos.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Implementación de facturación electrónica.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Registro de marca ante INAPI.</span></li>
              </ul>
            </div>

            {/* Área Trámites */}
            <div className="bg-[#1e293b] p-8 rounded-xl border border-gray-700 hover:border-[#eab308] transition-all group shadow-lg">
               <div className="bg-[#0f172a] w-14 h-14 rounded-lg flex items-center justify-center mb-6 text-[#1d4ed8] group-hover:text-[#eab308] transition-colors border border-gray-700">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Trámites Generales</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Patentes comerciales y Resoluciones Sanitarias.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Trámites ante la Tesorería General de la República.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Representación y gestiones ante el SII.</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-5 h-5 text-[#1d4ed8] shrink-0" /> <span>Gestiones ante el Conservador de Bienes Raíces.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VIDEOS (SABÍAS QUÉ) */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-16">
          <div className="w-12 h-1 bg-[#eab308] mb-4"></div>
          <h2 className="text-4xl font-extrabold text-center text-[#0f172a] mb-4">Cápsulas "Sabías Qué"</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto text-lg">Consejos y explicaciones contables por parte de nuestro director para ayudarle a tomar mejores decisiones.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-gray-200 aspect-video rounded-xl flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-md">
              <img src={`https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80`} alt="Video Thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-[#0f172a] bg-opacity-40 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[16px] border-l-[#1d4ed8] border-b-8 border-b-transparent ml-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

{/* 5. TESTIMONIOS (CINTA INFINITA) */}
      <section className="bg-[#0f172a] py-24 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto mb-12 text-center">
          <div className="w-12 h-1 bg-[#eab308] mx-auto mb-4"></div>
          <h2 className="text-4xl font-extrabold text-white mb-4">Palabras de Agradecimiento</h2>
          <p className="text-gray-400">La confianza de nuestros clientes es nuestro mayor activo.</p>
        </div>

        <div className="space-y-8 pause-on-hover">
          {/* PRIMERA LÍNEA (Hacia la izquierda) */}
          <div className="flex overflow-hidden">
            <div className="animate-marquee flex gap-6">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[350px] bg-[#1e293b] p-6 rounded-2xl border border-gray-800 flex-shrink-0">
                  <div className="flex text-[#eab308] mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-300 text-sm italic mb-4">"Excelente servicio, Don René y su equipo son muy profesionales en el área contable."</p>
                  <div className="font-bold text-white text-sm">- Cliente Satisfecho #{i + 1}</div>
                </div>
              ))}
              {/* Duplicamos para el efecto infinito */}
              {[...Array(15)].map((_, i) => (
                <div key={`dup1-${i}`} className="w-[350px] bg-[#1e293b] p-6 rounded-2xl border border-gray-800 flex-shrink-0">
                  <div className="flex text-[#eab308] mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-300 text-sm italic mb-4">"Excelente servicio, Don René y su equipo son muy profesionales en el área contable."</p>
                  <div className="font-bold text-white text-sm">- Cliente Satisfecho #{i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SEGUNDA LÍNEA (Hacia la derecha) */}
          <div className="flex overflow-hidden">
            <div className="animate-marquee-reverse flex gap-6">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-[350px] bg-[#1e293b] p-6 rounded-2xl border border-gray-800 flex-shrink-0">
                  <div className="flex text-[#eab308] mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-300 text-sm italic mb-4">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA."</p>
                  <div className="font-bold text-white text-sm">- Empresa Asociada #{i + 16}</div>
                </div>
              ))}
              {/* Duplicamos para el efecto infinito */}
              {[...Array(15)].map((_, i) => (
                <div key={`dup2-${i}`} className="w-[350px] bg-[#1e293b] p-6 rounded-2xl border border-gray-800 flex-shrink-0">
                  <div className="flex text-[#eab308] mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-300 text-sm italic mb-4">"El portal de clientes nos facilita mucho la descarga de liquidaciones y pagos de IVA."</p>
                  <div className="font-bold text-white text-sm">- Empresa Asociada #{i + 16}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* 6. PIE DE PÁGINA (Footer) */}
      <footer className="bg-gray-100 pt-16 pb-8 px-4 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-12">
            <div>
              <img src="/logo.png" alt="Logo" className="h-12 mb-6 object-contain" />
              <p className="text-gray-600 max-w-md leading-relaxed">
                Su partner estratégico en contabilidad, recursos humanos y gestión legal. Impulsando el crecimiento de las Pymes chilenas con responsabilidad y excelencia.
              </p>
            </div>
            <div className="flex flex-col justify-center space-y-4 text-gray-700">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm text-[#1d4ed8]"><MapPin className="w-5 h-5" /></div>
                <span className="font-medium">Raza Chilena 2062, Independencia, Santiago, Chile.</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm text-[#1d4ed8]"><Mail className="w-5 h-5" /></div>
                <span className="font-medium">contabilidad@sercoprev.cl</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-full shadow-sm text-[#25D366]"><Phone className="w-5 h-5" /></div>
                <span className="font-medium">+56 9 9331 6939</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-300 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 font-medium">
            <p>© 2026 SERCOPREV. Todos los derechos reservados.</p>
            <p className="mt-4 md:mt-0">© 2026 FocusFrame Media SpA. Desarrollado en Chile.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}