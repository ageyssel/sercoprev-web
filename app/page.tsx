import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { AppIcon, type AppIconName } from '@/components/AppIcon'
import { BrandLogo } from '@/components/BrandLogo'
import { LeadForm } from '@/components/LeadForm'
import { loadCommercialSiteContent, type CommercialReview, type CommercialTeamMember } from '@/lib/commercial-site'

export const metadata: Metadata = {
  title: 'SERCOPREV | Contabilidad, tributación y gestión para empresas',
  description: 'Servicios contables, tributarios, laborales y empresariales para Pymes en Chile, con acompañamiento personalizado y portal digital seguro.',
  alternates: { canonical: 'https://www.sercoprev.cl/' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const faqs = [
  ['¿Trabajan solo con empresas grandes?', 'No. SERCOPREV está orientado especialmente a Pymes, emprendedores y empresas que necesitan orden, cumplimiento y acompañamiento cercano.'],
  ['¿Pueden recibir una contabilidad atrasada o desordenada?', 'Sí. Primero realizamos una evaluación, identificamos brechas y proponemos un plan de regularización con prioridades y etapas claras.'],
  ['¿Cómo recibo mis documentos e informes?', 'Los clientes cuentan con un portal privado para revisar obligaciones, solicitudes, antecedentes financieros y documentos publicados por SERCOPREV.'],
  ['¿También administran remuneraciones?', 'Sí. Podemos gestionar contratos, liquidaciones, finiquitos, cotizaciones previsionales, licencias, vacaciones y documentación laboral según el servicio contratado.'],
  ['¿Cómo comienza el servicio?', 'La primera etapa es una evaluación de la situación actual. Luego definimos alcance, antecedentes necesarios, responsables y calendario de incorporación.'],
]

export default async function HomePage() {
  const { config, services, team, reviews } = await loadCommercialSiteContent()

  return (
    <div className="min-h-screen bg-[#f7f9fa] text-[#17324a]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b2235]/95 text-white shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6">
          <BrandLogo inverse />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            <NavLink href="#servicios">Servicios</NavLink>
            <NavLink href="#equipo">Quienes Somos</NavLink>
            {config.reviews_enabled && <NavLink href="#resenas">Reseñas</NavLink>}
            <NavLink href="#metodo">Cómo trabajamos</NavLink>
            <NavLink href="#portal">Portal digital</NavLink>
            <NavLink href="#contacto">Contacto</NavLink>
            <Link href="/login" className="ml-3 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10">Portal clientes</Link>
            <Link href="#contacto" className="rounded-xl bg-[#d6ad4d] px-4 py-2.5 text-sm font-black text-[#0b2235] transition hover:bg-[#e4c36f]">Solicitar evaluación</Link>
          </nav>
          <details className="relative lg:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-white/20 [&::-webkit-details-marker]:hidden">
              <AppIcon name="menu" className="h-5 w-5" />
              <span className="sr-only">Abrir menú</span>
            </summary>
            <div className="absolute right-0 top-14 grid w-72 gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-[#17324a] shadow-2xl">
              <MobileLink href="#servicios">Servicios</MobileLink>
              <MobileLink href="#equipo">Quienes Somos</MobileLink>
              {config.reviews_enabled && <MobileLink href="#resenas">Reseñas</MobileLink>}
              <MobileLink href="#metodo">Cómo trabajamos</MobileLink>
              <MobileLink href="#portal">Portal digital</MobileLink>
              <MobileLink href="#contacto">Contacto</MobileLink>
              <Link href="/login" className="mt-2 rounded-xl bg-[#0f2438] px-4 py-3 text-center text-sm font-black text-white">Portal clientes</Link>
            </div>
          </details>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#0b2235] px-4 pb-24 pt-36 text-white sm:px-6 lg:pb-32 lg:pt-44">
          <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-[#d6ad4d]/10 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-[#2d76a8]/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d6ad4d]/30 bg-[#d6ad4d]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#f2d88e]">
                <AppIcon name="shield" className="h-4 w-4" /> {config.hero_eyebrow}
              </span>
              <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-7xl">{config.hero_title}</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">{config.hero_description}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="#contacto" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#d6ad4d] px-6 py-3.5 text-sm font-black text-[#0b2235] shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#e6c873]">
                  Solicitar evaluación contable <AppIcon name="arrow-right" className="h-4 w-4" />
                </Link>
                <Link href="/login" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10">
                  Ingresar al portal <AppIcon name="arrow-right" className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-9 grid max-w-2xl grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                {['Atención personalizada', 'Portal privado', 'Control mensual', 'Servicio integral'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><AppIcon name="check" className="h-3.5 w-3.5" /></span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <PortalPreview />
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-4 py-7 sm:px-6">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 lg:grid-cols-4">
            <TrustItem value="30+" label="años de experiencia" />
            <TrustItem value={`${services.length}`} label="áreas de servicio" />
            <TrustItem value="24/7" label="acceso al portal documental" />
            <TrustItem value="1 a 1" label="acompañamiento profesional" />
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6" id="servicios">
          <div className="mx-auto max-w-7xl">
            <SectionIntro eyebrow={config.services_eyebrow} title={config.services_title} description={config.services_description} />
            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => <ServiceCard key={service.id} icon={service.icon} title={service.titulo} description={service.descripcion} items={service.items} />)}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-24 sm:px-6" id="equipo">
          <div className="mx-auto max-w-7xl">
            <SectionIntro eyebrow={config.team_eyebrow} title={config.team_title} description={config.team_description} />
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {team.map((member) => <TeamCard key={member.id} member={member} />)}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6" id="metodo">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <SectionIntro eyebrow="Método de trabajo" title="Información ordenada, responsabilidades claras y seguimiento mensual" description="No se trata solo de presentar formularios. El servicio debe permitir saber qué está listo, qué falta, qué vence y qué decisión requiere la empresa." align="left" />
              <a href="https://wa.me/56993316939" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[#134b78]/20 bg-[#eaf3f9] px-5 py-3 text-sm font-black text-[#134b78] transition hover:bg-[#dbeaf4]">
                Conversar por WhatsApp <AppIcon name="message" className="h-4 w-4" />
              </a>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2">
              <ProcessCard number="01" title="Evaluación" description="Revisamos situación, antecedentes, urgencias y alcance del servicio." />
              <ProcessCard number="02" title="Incorporación" description="Definimos responsables, documentos, calendario y accesos necesarios." />
              <ProcessCard number="03" title="Gestión mensual" description="Procesamos obligaciones, remuneraciones, documentos y tareas." />
              <ProcessCard number="04" title="Control y asesoría" description="Entregamos información, alertas y acompañamiento para decidir." />
            </ol>
          </div>
        </section>

        <section className="overflow-hidden bg-[#eaf1f5] px-4 py-24 sm:px-6" id="portal">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
            <div className="order-2 lg:order-1"><ClientPortalPreview /></div>
            <div className="order-1 lg:order-2">
              <SectionIntro eyebrow="Portal de clientes" title="Su información contable disponible, organizada y protegida" description="El portal SERCOPREV reúne obligaciones, solicitudes, antecedentes financieros y documentos de cada empresa en un espacio privado." align="left" />
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ['Obligaciones', 'Vencimientos y estados actualizados.'],
                  ['Solicitudes', 'Antecedentes requeridos y fechas límite.'],
                  ['Documentos', 'Archivos tributarios, laborales y legales.'],
                  ['Información financiera', 'Registros e importes organizados por periodo.'],
                ].map(([title, text]) => (
                  <li key={title} className="rounded-2xl border border-white bg-white/75 p-4 shadow-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f2438] text-white"><AppIcon name="check" className="h-4 w-4" /></span>
                    <h3 className="mt-3 font-black text-[#0f2438]">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionIntro eyebrow="Compromisos" title="Una relación contable basada en claridad y responsabilidad" description="Nuestro valor no está en promesas genéricas, sino en una forma de trabajo que reduce incertidumbre y mejora el control de la empresa." />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <Commitment icon="calendar" title="Seguimiento visible" description="Fechas, obligaciones y solicitudes organizadas para que ambas partes sepan qué corresponde hacer." />
              <Commitment icon="document" title="Información centralizada" description="Documentos y antecedentes disponibles en un portal privado, evitando depender de búsquedas en correos o chats." />
              <Commitment icon="message" title="Acompañamiento profesional" description="Orientación cercana para entender contingencias, alternativas y próximos pasos." />
            </div>
          </div>
        </section>

        {config.reviews_enabled && (
          <section className="bg-[#0f2438] px-4 py-24 text-white sm:px-6" id="resenas">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e3bf63]">{config.reviews_eyebrow}</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-5xl">{config.reviews_title}</h2>
                <p className="mt-5 text-base leading-8 text-slate-300 sm:text-lg">{config.reviews_description}</p>
              </div>
              {reviews.length > 0 ? (
                <div className="mt-14 grid gap-6 lg:grid-cols-3">
                  {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
                </div>
              ) : (
                <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl">
                  <AppIcon name="message" className="mx-auto h-8 w-8 text-[#e3bf63]" />
                  <p className="mt-4 text-lg font-black">Próximamente publicaremos experiencias verificadas de nuestros clientes.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">SERCOPREV incorpora testimonios únicamente cuando existe autorización para su publicación.</p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="bg-[#f7f9fa] px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <SectionIntro eyebrow="Preguntas frecuentes" title="Respuestas antes de comenzar" description="Estas son algunas de las dudas habituales de empresas que están evaluando cambiar, regularizar o profesionalizar su gestión contable." />
            <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm sm:px-8">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-[#17324a] [&::-webkit-details-marker]:hidden">
                    {question}<AppIcon name="chevron-down" className="h-5 w-5 shrink-0 transition group-open:rotate-180" />
                  </summary>
                  <p className="max-w-3xl pb-1 pt-4 text-sm leading-7 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0f2438] px-4 py-24 sm:px-6" id="contacto">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
            <div className="text-white">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#e3bf63]">Evaluación inicial</span>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{config.contact_title}</h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{config.contact_description}</p>
              <div className="mt-8 grid gap-3 text-sm text-slate-300">
                <ContactLine icon="message" label="WhatsApp" value="+56 9 9331 6939" href="https://wa.me/56993316939" />
                <ContactLine icon="inbox" label="Correo" value="contabilidad@sercoprev.cl" href="mailto:contabilidad@sercoprev.cl" />
                <ContactLine icon="building" label="Oficina" value="Raza Chilena 2062, Independencia, Santiago" />
              </div>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-2xl shadow-black/20 sm:p-8"><LeadForm /></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <BrandLogo />
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-500">{config.footer_description}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-600">
            <Link href="/login" className="hover:text-[#134b78]">Portal clientes</Link>
            <Link href="/privacidad" className="hover:text-[#134b78]">Privacidad</Link>
            <Link href="/terminos" className="hover:text-[#134b78]">Términos</Link>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <p>© 2026 SERCOPREV. Todos los derechos reservados.</p>
          <p>Desarrollado en Chile por FocusFrame Media SpA.</p>
        </div>
      </footer>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white">{children}</Link> }
function MobileLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-slate-100">{children}</Link> }
function SectionIntro({ eyebrow, title, description, align = 'center' }: { eyebrow: string; title: string; description: string; align?: 'left' | 'center' }) { return <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}><p className="text-xs font-black uppercase tracking-[0.2em] text-[#a47b24]">{eyebrow}</p><h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#0f2438] sm:text-5xl">{title}</h2><p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">{description}</p></div> }
function ServiceCard({ icon, title, description, items }: { icon: AppIconName; title: string; description: string; items: string[] }) { return <article className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,36,56,0.06)] transition hover:-translate-y-1 hover:border-[#134b78]/30 hover:shadow-xl"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-6 w-6" /></span><h3 className="mt-6 text-xl font-black text-[#0f2438]">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p><ul className="mt-6 grid gap-3 border-t border-slate-100 pt-5 text-sm text-slate-700">{items.map((item) => <li key={item} className="flex items-start gap-2"><AppIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}</ul></article> }
function TeamCard({ member }: { member: CommercialTeamMember }) { return <article className="group rounded-3xl border border-slate-200 bg-[#f8fafb] p-6 text-center shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl"><Portrait name={member.nombre} src={member.foto_url} alt={member.foto_alt || member.nombre} /><h3 className="mt-5 text-lg font-black text-[#0f2438]">{member.nombre}</h3><p className="mt-2 text-sm font-black leading-5 text-[#134b78]">{member.cargo}</p>{member.profesion && <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[#a47b24]">{member.profesion}</p>}{member.descripcion && <p className="mt-4 text-sm leading-6 text-slate-600">{member.descripcion}</p>}</article> }
function ReviewCard({ review }: { review: CommercialReview }) { return <article className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-xl"><div className="flex gap-1 text-[#e3bf63]" aria-label={`${review.calificacion} de 5 estrellas`}>{Array.from({ length: review.calificacion }, (_, index) => <span key={index} aria-hidden="true">★</span>)}</div><blockquote className="mt-5 text-base leading-8 text-slate-200">“{review.resena}”</blockquote><div className="mt-7 flex items-center gap-4 border-t border-white/10 pt-5"><Portrait name={review.nombre_cliente} src={review.foto_url} alt={review.foto_alt || review.nombre_cliente} small /><div><p className="font-black text-white">{review.nombre_cliente}</p><p className="mt-1 text-xs font-bold text-slate-400">{[review.cargo, review.empresa].filter(Boolean).join(' · ') || 'Cliente SERCOPREV'}</p></div></div></article> }
function Portrait({ name, src, alt, small = false }: { name: string; src: string | null; alt: string; small?: boolean }) { const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); const size = small ? 52 : 132; return src ? <Image src={src} alt={alt} width={size} height={size} unoptimized className={`${small ? 'h-13 w-13' : 'mx-auto h-32 w-32'} rounded-full border-4 border-white object-cover shadow-lg ring-1 ring-slate-200/20`} /> : <span className={`${small ? 'h-13 w-13 text-sm' : 'mx-auto h-32 w-32 text-2xl'} flex items-center justify-center rounded-full bg-[#0f2438] font-black text-[#e3bf63] shadow-lg ring-1 ring-white/10`}>{initials}</span> }
function TrustItem({ value, label }: { value: string; label: string }) { return <div className="text-center lg:text-left"><p className="text-2xl font-black text-[#0f2438] sm:text-3xl">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p></div> }
function ProcessCard({ number, title, description }: { number: string; title: string; description: string }) { return <li className="rounded-2xl border border-slate-200 bg-[#f8fafb] p-5"><span className="text-xs font-black tracking-[0.2em] text-[#a47b24]">{number}</span><h3 className="mt-3 text-lg font-black text-[#0f2438]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></li> }
function Commitment({ icon, title, description }: { icon: AppIconName; title: string; description: string }) { return <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f2438] text-[#e3bf63]"><AppIcon name={icon} className="h-5 w-5" /></span><h3 className="mt-5 text-xl font-black text-[#0f2438]">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p></article> }
function ContactLine({ icon, label, value, href }: { icon: AppIconName; label: string; value: string; href?: string }) { const content = <><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#e3bf63]"><AppIcon name={icon} className="h-5 w-5" /></span><span><span className="block text-xs font-black uppercase tracking-[0.15em] text-slate-400">{label}</span><span className="mt-1 block font-bold text-white">{value}</span></span></>; return href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">{content}</a> : <div className="flex items-center gap-3 rounded-xl p-2">{content}</div> }
function PortalPreview() { return <div className="relative mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-2xl shadow-black/25 backdrop-blur"><div className="rounded-[1.5rem] bg-[#f5f8fa] p-4 text-[#17324a] sm:p-6"><div className="flex items-center justify-between border-b border-slate-200 pb-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Portal SERCOPREV</p><p className="mt-1 font-black">Resumen de la empresa</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Al día</span></div><div className="mt-5 grid grid-cols-3 gap-3"><MiniMetric label="Obligaciones" value="3" /><MiniMetric label="Solicitudes" value="1" /><MiniMetric label="Documentos" value="18" /></div><div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-sm font-black">Próximos vencimientos</p><AppIcon name="calendar" className="h-4 w-4 text-[#134b78]" /></div><div className="mt-4 space-y-3"><PreviewRow title="Formulario 29" meta="Vence 20 de julio" tone="amber" /><PreviewRow title="Cotizaciones previsionales" meta="En proceso" tone="blue" /><PreviewRow title="Informe mensual" meta="Disponible" tone="green" /></div></div></div></div> }
function ClientPortalPreview() { return <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-[#0f2438]/10 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mi empresa</p><p className="mt-1 text-lg font-black text-[#0f2438]">Panel mensual</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2438] text-[#e3bf63]"><AppIcon name="building" className="h-5 w-5" /></span></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><PreviewPanel icon="calendar" title="Obligaciones" value="2 pendientes" /><PreviewPanel icon="upload" title="Solicitudes" value="1 documento requerido" /><PreviewPanel icon="folder" title="Documentos" value="Últimos archivos publicados" /><PreviewPanel icon="money" title="Resumen financiero" value="Movimientos del periodo" /></div></div> }
function MiniMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xl font-black text-[#0f2438]">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div> }
function PreviewRow({ title, meta, tone }: { title: string; meta: string; tone: 'amber' | 'blue' | 'green' }) { const tones = { amber: 'bg-amber-400', blue: 'bg-blue-500', green: 'bg-emerald-500' }; return <div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${tones[tone]}`} /><div><p className="text-xs font-black text-[#17324a]">{title}</p><p className="text-[11px] text-slate-500">{meta}</p></div></div> }
function PreviewPanel({ icon, title, value }: { icon: AppIconName; title: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-[#f8fafb] p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-4 w-4" /></span><p className="mt-4 text-sm font-black text-[#0f2438]">{title}</p><p className="mt-1 text-xs text-slate-500">{value}</p></div> }
