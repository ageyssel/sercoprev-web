import Link from 'next/link'
import { AppIcon, type AppIconName } from '@/components/AppIcon'
import { COMMERCIAL_MEDIA_BUCKET, defaultCommercialConfig, type CommercialConfig, type CommercialReview, type CommercialService, type CommercialTeamMember } from '@/lib/commercial-site'
import { createAdminClient } from '@/utils/supabase/admin'
import { requirePrivilegedAdminPage } from '@/utils/supabase/require-privileged-admin'
import {
  actualizarIntegranteEquipo,
  actualizarResenaComercial,
  actualizarServicioComercial,
  crearIntegranteEquipo,
  crearResenaComercial,
  crearServicioComercial,
  eliminarIntegranteEquipo,
  eliminarResenaComercial,
  eliminarServicioComercial,
  guardarContenidoGeneral,
} from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const inputClass = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const textareaClass = 'min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium leading-6 text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const icons: AppIconName[] = ['briefcase', 'users', 'building', 'shield', 'document', 'money', 'tasks', 'settings']

function publicUrl(path: string | null | undefined) {
  if (!path) return null
  return createAdminClient().storage.from(COMMERCIAL_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

export default async function CommercialPageSettings({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requirePrivilegedAdminPage()
  const params = await searchParams
  const admin = createAdminClient()
  const [configResult, servicesResult, teamResult, reviewsResult] = await Promise.all([
    admin.from('pagina_comercial_config').select('*').eq('id', 'principal').maybeSingle(),
    admin.from('pagina_comercial_servicios').select('*').order('orden').order('titulo'),
    admin.from('pagina_comercial_equipo').select('*').order('orden').order('nombre'),
    admin.from('pagina_comercial_resenas').select('*').order('orden').order('created_at', { ascending: false }),
  ])

  const config = { ...defaultCommercialConfig, ...(configResult.data ?? {}) } as CommercialConfig
  const services = (servicesResult.data ?? []) as CommercialService[]
  const team = ((teamResult.data ?? []) as Omit<CommercialTeamMember, 'foto_url'>[]).map((member) => ({ ...member, foto_url: publicUrl(member.foto_path) }))
  const reviews = ((reviewsResult.data ?? []) as Omit<CommercialReview, 'foto_url'>[]).map((review) => ({ ...review, foto_url: publicUrl(review.foto_path) }))
  const loadError = configResult.error || servicesResult.error || teamResult.error || reviewsResult.error

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Configuración</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Página comercial</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Administre textos, servicios, equipo, fotografías y reseñas visibles en el landing de SERCOPREV.</p>
        </div>
        <Link href="/" target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#134b78]/20 bg-white px-4 text-sm font-black text-[#134b78] shadow-sm hover:bg-[#eaf3f9]">
          Ver página publicada <AppIcon name="arrow-right" className="h-4 w-4" />
        </Link>
      </header>

      {params.success && <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">{params.success}</div>}
      {params.error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">{params.error}</div>}
      {loadError && <div role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">Parte del contenido no pudo cargarse. Confirme que la migración de página comercial esté aplicada.</div>}

      <nav className="mt-7 flex flex-wrap gap-2" aria-label="Secciones de configuración comercial">
        <Anchor href="#contenido">Contenido general</Anchor>
        <Anchor href="#servicios">Servicios</Anchor>
        <Anchor href="#equipo">Equipo</Anchor>
        <Anchor href="#resenas">Reseñas</Anchor>
      </nav>

      <section id="contenido" className="mt-7 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon="settings" title="Contenido general" description="Edite los encabezados y textos principales del landing sin modificar código." />
        <form action={guardarContenidoGeneral} className="mt-7 grid gap-7">
          <ContentBlock title="Portada">
            <Field label="Etiqueta superior" name="hero_eyebrow" defaultValue={config.hero_eyebrow} />
            <Field label="Título principal" name="hero_title" defaultValue={config.hero_title} wide />
            <TextArea label="Descripción principal" name="hero_description" defaultValue={config.hero_description} wide />
          </ContentBlock>
          <ContentBlock title="Servicios">
            <Field label="Etiqueta" name="services_eyebrow" defaultValue={config.services_eyebrow} />
            <Field label="Título" name="services_title" defaultValue={config.services_title} wide />
            <TextArea label="Descripción" name="services_description" defaultValue={config.services_description} wide />
          </ContentBlock>
          <ContentBlock title="Nuestro equipo">
            <Field label="Etiqueta" name="team_eyebrow" defaultValue={config.team_eyebrow} />
            <Field label="Título" name="team_title" defaultValue={config.team_title} wide />
            <TextArea label="Descripción" name="team_description" defaultValue={config.team_description} wide />
          </ContentBlock>
          <ContentBlock title="Reseñas de clientes">
            <Field label="Etiqueta" name="reviews_eyebrow" defaultValue={config.reviews_eyebrow} />
            <Field label="Título" name="reviews_title" defaultValue={config.reviews_title} wide />
            <TextArea label="Descripción" name="reviews_description" defaultValue={config.reviews_description} wide />
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 sm:col-span-2"><input type="checkbox" name="reviews_enabled" defaultChecked={config.reviews_enabled} className="h-4 w-4 rounded border-slate-300" /> Mostrar segmento de reseñas en el landing</label>
          </ContentBlock>
          <ContentBlock title="Contacto y pie de página">
            <Field label="Título de contacto" name="contact_title" defaultValue={config.contact_title} wide />
            <TextArea label="Descripción de contacto" name="contact_description" defaultValue={config.contact_description} wide />
            <TextArea label="Descripción del pie de página" name="footer_description" defaultValue={config.footer_description} wide />
          </ContentBlock>
          <div><PrimaryButton text="Guardar contenido general" /></div>
        </form>
      </section>

      <section id="servicios" className="mt-7 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon="briefcase" title="Servicios publicados" description="Agregue, edite, ordene, oculte o elimine los servicios que aparecen en la página pública." />
        <details className="mt-6 rounded-2xl border border-[#134b78]/20 bg-[#f5f9fc] p-5" open={services.length === 0}>
          <summary className="cursor-pointer font-black text-[#134b78]">Agregar nuevo servicio</summary>
          <form action={crearServicioComercial} className="mt-5 grid gap-4 sm:grid-cols-2">
            <IconSelect />
            <Field label="Orden" name="orden" type="number" defaultValue="60" />
            <Field label="Título" name="titulo" wide required />
            <TextArea label="Descripción" name="descripcion" wide required />
            <TextArea label="Prestaciones incluidas, una por línea" name="items" wide required />
            <ActiveCheckbox />
            <div className="sm:col-span-2"><PrimaryButton text="Agregar servicio" /></div>
          </form>
        </details>
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {services.map((service) => (
            <article key={service.id} className="rounded-2xl border border-slate-200 p-5">
              <form action={actualizarServicioComercial} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={service.id} />
                <IconSelect defaultValue={service.icon} />
                <Field label="Orden" name="orden" type="number" defaultValue={String(service.orden)} />
                <Field label="Título" name="titulo" defaultValue={service.titulo} wide required />
                <TextArea label="Descripción" name="descripcion" defaultValue={service.descripcion} wide required />
                <TextArea label="Prestaciones incluidas, una por línea" name="items" defaultValue={service.items.join('\n')} wide required />
                <ActiveCheckbox defaultChecked={service.activo} />
                <div className="flex flex-wrap gap-2 sm:col-span-2"><PrimaryButton text="Guardar servicio" /><DeleteButton action={eliminarServicioComercial} id={service.id} label="Eliminar servicio" /></div>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section id="equipo" className="mt-7 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon="users" title="Nuestro equipo de trabajo" description="Administre el orden, cargo, profesión, descripción y fotografía de cada integrante." />
        <details className="mt-6 rounded-2xl border border-[#134b78]/20 bg-[#f5f9fc] p-5">
          <summary className="cursor-pointer font-black text-[#134b78]">Agregar integrante</summary>
          <form action={crearIntegranteEquipo} encType="multipart/form-data" className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" name="nombre" required />
            <Field label="Cargo o responsabilidad" name="cargo" required />
            <Field label="Profesión" name="profesion" />
            <Field label="Orden" name="orden" type="number" defaultValue="80" />
            <TextArea label="Descripción de sus funciones" name="descripcion" wide />
            <FileField />
            <Field label="Texto alternativo de la foto" name="foto_alt" wide />
            <ActiveCheckbox />
            <div className="sm:col-span-2"><PrimaryButton text="Agregar integrante" /></div>
          </form>
        </details>
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {team.map((member) => (
            <article key={member.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center gap-4">
                <Avatar name={member.nombre} src={member.foto_url} alt={member.foto_alt || member.nombre} />
                <div><h3 className="font-black text-[#0f2438]">{member.nombre}</h3><p className="mt-1 text-xs font-bold text-[#134b78]">{member.cargo}</p></div>
              </div>
              <form action={actualizarIntegranteEquipo} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={member.id} />
                <Field label="Nombre completo" name="nombre" defaultValue={member.nombre} required />
                <Field label="Cargo o responsabilidad" name="cargo" defaultValue={member.cargo} required />
                <Field label="Profesión" name="profesion" defaultValue={member.profesion || ''} />
                <Field label="Orden" name="orden" type="number" defaultValue={String(member.orden)} />
                <TextArea label="Descripción de sus funciones" name="descripcion" defaultValue={member.descripcion || ''} wide />
                <FileField hint="Solo seleccione un archivo para reemplazar la fotografía actual." />
                <Field label="Texto alternativo de la foto" name="foto_alt" defaultValue={member.foto_alt || ''} wide />
                <ActiveCheckbox defaultChecked={member.activo} />
                <div className="flex flex-wrap gap-2 sm:col-span-2"><PrimaryButton text="Guardar integrante" /><DeleteButton action={eliminarIntegranteEquipo} id={member.id} label="Eliminar integrante" /></div>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section id="resenas" className="mt-7 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon="message" title="Reseñas de clientes" description="Publique únicamente testimonios autorizados y verificables. No se agregaron reseñas ficticias." />
        <details className="mt-6 rounded-2xl border border-[#134b78]/20 bg-[#f5f9fc] p-5" open={reviews.length === 0}>
          <summary className="cursor-pointer font-black text-[#134b78]">Agregar reseña</summary>
          <form action={crearResenaComercial} encType="multipart/form-data" className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del cliente" name="nombre_cliente" required />
            <Field label="Empresa" name="empresa" />
            <Field label="Cargo o relación" name="cargo" />
            <Field label="Orden" name="orden" type="number" defaultValue="10" />
            <TextArea label="Reseña" name="resena" wide required />
            <label className="grid gap-2 text-sm font-bold text-slate-700">Calificación<select name="calificacion" defaultValue="5" className={inputClass}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} estrellas</option>)}</select></label>
            <FileField />
            <Field label="Texto alternativo de la foto" name="foto_alt" wide />
            <ActiveCheckbox />
            <div className="sm:col-span-2"><PrimaryButton text="Agregar reseña" /></div>
          </form>
        </details>
        {reviews.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">Todavía no existen reseñas. El segmento público está habilitado y mostrará las reseñas autorizadas que agregue aquí.</div> : null}
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-5 flex items-center gap-4"><Avatar name={review.nombre_cliente} src={review.foto_url} alt={review.foto_alt || review.nombre_cliente} /><div><h3 className="font-black text-[#0f2438]">{review.nombre_cliente}</h3><p className="mt-1 text-xs font-bold text-[#134b78]">{[review.cargo, review.empresa].filter(Boolean).join(' · ') || 'Cliente SERCOPREV'}</p></div></div>
              <form action={actualizarResenaComercial} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={review.id} />
                <Field label="Nombre del cliente" name="nombre_cliente" defaultValue={review.nombre_cliente} required />
                <Field label="Empresa" name="empresa" defaultValue={review.empresa || ''} />
                <Field label="Cargo o relación" name="cargo" defaultValue={review.cargo || ''} />
                <Field label="Orden" name="orden" type="number" defaultValue={String(review.orden)} />
                <TextArea label="Reseña" name="resena" defaultValue={review.resena} wide required />
                <label className="grid gap-2 text-sm font-bold text-slate-700">Calificación<select name="calificacion" defaultValue={String(review.calificacion)} className={inputClass}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} estrellas</option>)}</select></label>
                <FileField hint="Solo seleccione un archivo para reemplazar la fotografía actual." />
                <Field label="Texto alternativo de la foto" name="foto_alt" defaultValue={review.foto_alt || ''} wide />
                <ActiveCheckbox defaultChecked={review.activo} />
                <div className="flex flex-wrap gap-2 sm:col-span-2"><PrimaryButton text="Guardar reseña" /><DeleteButton action={eliminarResenaComercial} id={review.id} label="Eliminar reseña" /></div>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function Anchor({ href, children }: { href: string; children: React.ReactNode }) { return <a href={href} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#134b78] shadow-sm hover:border-[#134b78]/30 hover:bg-[#eaf3f9]">{children}</a> }
function SectionTitle({ icon, title, description }: { icon: AppIconName; title: string; description: string }) { return <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div> }
function ContentBlock({ title, children }: { title: string; children: React.ReactNode }) { return <fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2"><legend className="px-2 text-sm font-black uppercase tracking-[0.12em] text-[#a47b24]">{title}</legend>{children}</fieldset> }
function Field({ label, name, type = 'text', defaultValue, wide = false, required = false }: { label: string; name: string; type?: string; defaultValue?: string; wide?: boolean; required?: boolean }) { return <label className={`grid gap-2 text-sm font-bold text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}<input name={name} type={type} defaultValue={defaultValue} required={required} className={inputClass} /></label> }
function TextArea({ label, name, defaultValue, wide = false, required = false }: { label: string; name: string; defaultValue?: string; wide?: boolean; required?: boolean }) { return <label className={`grid gap-2 text-sm font-bold text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}<textarea name={name} defaultValue={defaultValue} required={required} className={textareaClass} /></label> }
function IconSelect({ defaultValue = 'briefcase' }: { defaultValue?: string }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">Ícono<select name="icon" defaultValue={defaultValue} className={inputClass}>{icons.map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></label> }
function ActiveCheckbox({ defaultChecked = true }: { defaultChecked?: boolean }) { return <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" name="activo" defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300" /> Publicar en el landing</label> }
function FileField({ hint = 'JPG, PNG o WebP. Máximo 5 MB.' }: { hint?: string }) { return <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Fotografía<input name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0f2438] file:px-4 file:py-2 file:text-xs file:font-black file:text-white" /><span className="text-xs font-medium text-slate-500">{hint}</span></label> }
function PrimaryButton({ text }: { text: string }) { return <button type="submit" className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#173d5c]">{text}</button> }
function DeleteButton({ action, id, label }: { action: (formData: FormData) => Promise<void>; id: string; label: string }) { return <button type="submit" formAction={action} data-record-id={id} className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 hover:bg-red-100">{label}</button> }
function Avatar({ name, src, alt }: { name: string; src: string | null; alt: string }) { const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); return src ? <img src={src} alt={alt} className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-md ring-1 ring-slate-200" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0f2438] text-lg font-black text-[#e3bf63] shadow-md">{initials}</span> }
