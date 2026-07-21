import Link from 'next/link'
import Image from 'next/image'
import { SimpleIcon } from '@/components/SimpleIcon'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1e293b]">
      <nav className="fixed w-full z-50 bg-[#1e3a8a] shadow-lg border-b border-[#1e40af] px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-4" aria-label="Inicio SERCOPREV">
            <div className="relative h-16 w-56">
              <Image
                src="/logo.png"
                alt="SERCOPREV"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="#servicios"
              className="text-white px-6 py-2.5 rounded-md font-bold hover:bg-white/10 transition-colors uppercase tracking-wider border-2 border-transparent hover:border-white/30"
            >
              Servicios
            </Link>
            <Link
              href="/login"
              className="bg-[#eab308] text-[#0f172a] px-8 py-2.5 rounded-md font-black hover:bg-yellow-400 hover:scale-105 transition-all shadow-[0_4px_14px_0_rgba(234,179,8,0.39)] uppercase tracking-wide"
            >
              Acceso Clientes
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="pt-48 pb-32 px-6 bg-[#0f172a] text-white">
          <div className="max-w-7xl mx-auto text-center animate-fade-in">
            <h1
              className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Su Partner Estratégico <br />
              <span className="text-[#eab308] italic">en el Camino al Éxito.</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              Más de 30 años de trayectoria impulsando el crecimiento de empresas en Chile.
              Confíe su contabilidad a profesionales comprometidos con su tranquilidad financiera.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://wa.me/56993316939"
                className="flex items-center gap-3 bg-[#25d366] text-white px-8 py-4 rounded-md font-bold hover:bg-[#16a34a] transition-colors shadow-lg text-lg tracking-wide border border-[#16a34a]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <SimpleIcon name="message-circle" className="w-6 h-6" /> Asesoría por WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in delay-100">
            <div className="inline-block px-3 py-1 bg-blue-100 text-[#1e3a8a] rounded-sm text-xs font-bold mb-6 tracking-widest uppercase">
              Trayectoria
            </div>
            <h2 className="text-4xl font-black mb-6 text-[#0f172a] tracking-tight">Sobre Nosotros</h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Con más de tres décadas de experiencia, SERCOPREV nace con la misión de ser el aliado fundamental para las Pymes.
            </p>
            <p className="text-lg font-semibold text-[#1e3a8a] leading-relaxed border-l-4 border-[#eab308] pl-5 py-2 bg-blue-50/50">
              No somos solo contadores; somos asesores comprometidos con la eficiencia, la legalidad y la responsabilidad.
            </p>
          </div>
          <div className="bg-[#0f172a] p-12 rounded-xl text-white shadow-2xl relative animate-fade-in delay-200">
            <h3 className="text-2xl font-bold mb-6 text-[#eab308] tracking-tight">Nuestra Propuesta de Valor</h3>
            <p className="text-gray-300 mb-10 italic leading-relaxed text-lg font-light">
              &ldquo;Si busca confiar la contabilidad de su empresa a profesionales responsables, con experiencia y que brinden un servicio 100% personalizado, está en el lugar correcto.&rdquo;
            </p>
            <div className="flex items-center gap-5 border-t border-gray-700 pt-6">
              <div className="w-14 h-14 bg-[#1e3a8a] flex items-center justify-center font-bold text-xl shadow-inner rounded-full border-2 border-[#eab308]">
                RM
              </div>
              <div>
                <p className="font-bold text-white tracking-wide text-lg">René Morales</p>
                <p className="text-sm text-[#eab308] font-medium tracking-wide uppercase">Director Ejecutivo</p>
              </div>
            </div>
          </div>
        </section>

        <section id="servicios" className="py-24 bg-white px-6 border-t border-gray-200">
          <div className="max-w-7xl mx-auto text-center mb-20 animate-fade-in">
            <h2 className="text-4xl font-black mb-6 uppercase tracking-tight text-[#0f172a]">Conozca nuestros servicios</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Soluciones integrales diseñadas para cubrir todas las necesidades administrativas y legales de su empresa.
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ServiceCard
              icon={<SimpleIcon name="shield-check" className="w-12 h-12" />}
              title="Contabilidad y Tributación"
              items={['Contabilidad simplificada', 'Declaraciones (IVA, Renta)', 'Balances financieros', 'Auditorías contables']}
            />
            <ServiceCard
              icon={<SimpleIcon name="user-check" className="w-12 h-12" />}
              title="Recursos Humanos"
              items={['Contratos de trabajo', 'Liquidaciones y finiquitos', 'Pago Previred', 'Representación DT']}
            />
            <ServiceCard
              icon={<SimpleIcon name="gavel" className="w-12 h-12" />}
              title="Gestión Legal"
              items={['Constitución de sociedades', 'Flujos de caja', 'Facturación electrónica', 'Registro INAPI']}
            />
            <ServiceCard
              icon={<SimpleIcon name="file-text" className="w-12 h-12" />}
              title="Trámites Generales"
              items={['Patentes y Resoluciones', 'Tesorería General (TGR)', 'Gestiones SII', 'Conservador (CBRS)']}
            />
          </div>
        </section>

        <section className="bg-[#f8fafc] py-24 px-6 border-t border-gray-200">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-black text-[#0f172a] mb-4 uppercase tracking-tight">Sabías qué</h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Consejos y explicaciones contables por parte de nuestro director para ayudarle a tomar mejores decisiones financieras y legales.
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <VideoCard
              image="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop"
              title="Importancia del Flujo de Caja"
            />
            <VideoCard
              image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop"
              title="Cambios Tributarios 2026"
            />
            <VideoCard
              image="https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop"
              title="Evite Multas del SII"
            />
            <VideoCard
              image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=600&auto=format&fit=crop"
              title="Contratación Correcta"
            />
          </div>
        </section>

        <section className="bg-[#0f172a] py-24 px-4 overflow-hidden border-t border-[#1e40af]">
          <div className="max-w-7xl mx-auto mb-16 text-center animate-fade-in">
            <h2 className="text-4xl font-black text-white mb-6 tracking-tight uppercase">Palabras de Agradecimiento</h2>
            <p className="text-[#eab308] text-lg font-medium tracking-wide">La confianza de nuestros clientes es nuestro mayor activo.</p>
          </div>

          <div className="space-y-8 pause-on-hover">
            <div className="flex overflow-hidden relative">
              <div className="flex gap-6 animate-marquee">
                {[...Array(15)].map((_, index) => (
                  <TestimonialCard key={index} index={index} />
                ))}
                {[...Array(15)].map((_, index) => (
                  <TestimonialCard key={`duplicate-${index}`} index={index} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1e293b] text-gray-300 py-16 px-6 border-t border-[#0f172a]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 mb-12">
          <div>
            <div className="relative h-20 w-64 mb-8">
              <Image src="/logo.png" alt="SERCOPREV" fill className="object-contain object-left" />
            </div>
            <p className="text-sm leading-relaxed text-gray-400 pr-8 max-w-md">
              Su partner estratégico en contabilidad, recursos humanos y gestión legal. Impulsando el crecimiento de las Pymes chilenas con responsabilidad y excelencia.
            </p>
          </div>
          <div className="md:text-right flex flex-col justify-end">
            <h3 className="font-bold text-lg mb-6 text-white uppercase tracking-wider">Contacto</h3>
            <address className="not-italic space-y-4 text-sm text-gray-400 font-medium md:items-end flex flex-col">
              <span>Raza Chilena 2062, Independencia, Santiago.</span>
              <a href="mailto:contabilidad@sercoprev.cl" className="hover:text-white">contabilidad@sercoprev.cl</a>
              <a href="tel:+56993316939" className="hover:text-white">+56 9 9331 6939</a>
            </address>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-700 flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <p>© 2026 SERCOPREV. Todos los derechos reservados.</p>
          <p>© 2026 FocusFrame Media SpA. Desarrollado en Chile.</p>
        </div>
      </footer>
    </div>
  )
}

function ServiceCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <article className="p-8 bg-white rounded-xl border border-gray-200 hover:border-[#1e3a8a] hover:shadow-xl transition-all duration-300 group shadow-sm">
      <div className="mb-6 text-[#1e3a8a]">{icon}</div>
      <h3 className="font-bold text-xl mb-4 text-[#0f172a]">{title}</h3>
      <ul className="space-y-3 text-sm text-gray-600 font-medium">
        {items.map((item) => (
          <li key={item} className="flex gap-3 items-start">
            <SimpleIcon name="chevron-right" className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  )
}

function VideoCard({ image, title }: { image: string; title: string }) {
  return (
    <a
      href="https://youtube.com"
      target="_blank"
      rel="noopener noreferrer"
      className="group block relative rounded-xl overflow-hidden shadow-md border border-gray-200 hover:shadow-xl transition-all"
      aria-label={`Ver video: ${title}`}
    >
      <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
        <Image src={image} alt="" fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
        <SimpleIcon name="play-circle" className="w-14 h-14 text-[#eab308] relative z-10 group-hover:scale-110 transition-transform" />
      </div>
      <div className="p-4 bg-white">
        <h3 className="font-bold text-[#0f172a] mb-1">{title}</h3>
        <p className="text-sm text-[#1e3a8a] font-semibold">Ver video &rarr;</p>
      </div>
    </a>
  )
}

function TestimonialCard({ index }: { index: number }) {
  return (
    <article className="w-[380px] bg-[#1e293b] p-8 rounded-xl border border-gray-700 flex-shrink-0 hover:border-[#eab308] transition-colors shadow-lg">
      <div className="flex text-[#eab308] mb-5" aria-label="5 de 5 estrellas">
        {[...Array(5)].map((_, starIndex) => (
          <SimpleIcon key={starIndex} name="star" className="w-5 h-5" />
        ))}
      </div>
      <p className="text-gray-300 italic mb-6 leading-relaxed font-light">
        &ldquo;Excelente servicio, Don René y su equipo son muy profesionales en el área contable.&rdquo;
      </p>
      <p className="font-bold text-sm tracking-widest uppercase text-gray-400">Cliente Satisfecho #{index + 1}</p>
    </article>
  )
}
