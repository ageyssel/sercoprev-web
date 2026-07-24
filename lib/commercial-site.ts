import 'server-only'

import { createAdminClient } from '@/utils/supabase/admin'

export const COMMERCIAL_MEDIA_BUCKET = 'pagina-comercial'

export type CommercialConfig = {
  id: string
  hero_eyebrow: string
  hero_title: string
  hero_description: string
  services_eyebrow: string
  services_title: string
  services_description: string
  team_eyebrow: string
  team_title: string
  team_description: string
  reviews_eyebrow: string
  reviews_title: string
  reviews_description: string
  reviews_enabled: boolean
  contact_title: string
  contact_description: string
  footer_description: string
}

export type CommercialService = {
  id: string
  icon: 'briefcase' | 'users' | 'building' | 'shield' | 'document' | 'money' | 'tasks' | 'settings'
  titulo: string
  descripcion: string
  items: string[]
  orden: number
  activo: boolean
}

export type CommercialTeamMember = {
  id: string
  nombre: string
  cargo: string
  profesion: string | null
  descripcion: string | null
  foto_path: string | null
  foto_alt: string | null
  foto_url: string | null
  orden: number
  activo: boolean
}

export type CommercialReview = {
  id: string
  nombre_cliente: string
  empresa: string | null
  cargo: string | null
  resena: string
  foto_path: string | null
  foto_alt: string | null
  foto_url: string | null
  calificacion: number
  orden: number
  activo: boolean
}

export type CommercialSiteContent = {
  config: CommercialConfig
  services: CommercialService[]
  team: CommercialTeamMember[]
  reviews: CommercialReview[]
}

export const defaultCommercialConfig: CommercialConfig = {
  id: 'principal',
  hero_eyebrow: 'Más de 30 años acompañando empresas',
  hero_title: 'Contabilidad clara para tomar decisiones seguras.',
  hero_description: 'Organizamos la gestión contable, tributaria, laboral y documental de su empresa para que tenga control, cumplimiento y acompañamiento profesional durante todo el año.',
  services_eyebrow: 'Servicios',
  services_title: 'Una sola firma para ordenar la gestión de su empresa',
  services_description: 'Integramos contabilidad, impuestos, remuneraciones, trámites y asesoría profesional para entregar una respuesta completa y cercana.',
  team_eyebrow: 'Nuestro equipo',
  team_title: 'Profesionales comprometidos con la gestión de su empresa',
  team_description: 'SERCOPREV organiza su trabajo por especialidades para responder con mayor rapidez y acompañar cada necesidad contable, tributaria y laboral.',
  reviews_eyebrow: 'Experiencias de clientes',
  reviews_title: 'Relaciones construidas con confianza y trabajo constante',
  reviews_description: 'Testimonios de clientes que han confiado su gestión contable, tributaria y laboral a SERCOPREV.',
  reviews_enabled: true,
  contact_title: 'Conversemos sobre la situación real de su empresa.',
  contact_description: 'Complete el formulario y nuestro equipo revisará el tipo de apoyo que necesita. También puede contactarnos directamente por teléfono, correo o WhatsApp.',
  footer_description: 'Servicios contables, tributarios, laborales y empresariales para Pymes, con acompañamiento profesional y acceso digital seguro.',
}

const fallbackServices: CommercialService[] = [
  {
    id: 'fallback-contabilidad',
    icon: 'document',
    titulo: 'Contabilidad e impuestos',
    descripcion: 'Registros, libros auxiliares, declaraciones y estados financieros para mantener la empresa ordenada y cumplir sus obligaciones.',
    items: ['Cálculo y declaración de IVA', 'Registros contables', 'Libros auxiliares de ventas y compras', 'Inventarios y balances', 'Impuesto anual, devoluciones y justificación de gastos'],
    orden: 10,
    activo: true,
  },
  {
    id: 'fallback-remuneraciones',
    icon: 'users',
    titulo: 'Remuneraciones y gestión laboral',
    descripcion: 'Administración integral de contratos, pagos, cotizaciones y documentación laboral de cada trabajador.',
    items: ['Contratos, anexos y finiquitos', 'Liquidaciones de sueldo', 'Licencias médicas', 'Vacaciones y feriados legales', 'Cotizaciones previsionales', 'Certificados laborales F30-1'],
    orden: 20,
    activo: true,
  },
  {
    id: 'fallback-tramites',
    icon: 'building',
    titulo: 'Trámites y puesta en marcha',
    descripcion: 'Gestiones ante organismos públicos y apoyo para constituir, habilitar y mantener operativa una empresa.',
    items: ['Servicio de Impuestos Internos', 'Tesorería General de la República', 'Municipalidades', 'Seremi de Salud', 'Documentación contable y mercantil', 'Formación de empresas'],
    orden: 30,
    activo: true,
  },
  {
    id: 'fallback-asesoria',
    icon: 'shield',
    titulo: 'Asesoría y consultoría profesional',
    descripcion: 'Orientación personalizada para resolver contingencias, reducir riesgos y tomar decisiones respaldadas.',
    items: ['Contratación y despido', 'Pagos y planificación de impuestos', 'Inversiones y justificación de gastos', 'Temas tributarios y laborales', 'Comparendos laborales'],
    orden: 40,
    activo: true,
  },
  {
    id: 'fallback-balances',
    icon: 'money',
    titulo: 'Balances y estados financieros',
    descripcion: 'Preparación de información financiera para conocer la situación y los resultados reales de la empresa.',
    items: ['Balance general', 'Balance clasificado', 'Estado de resultados', 'Estado de situación', 'Declaración de renta de socios y empresa'],
    orden: 50,
    activo: true,
  },
]

const fallbackTeam: CommercialTeamMember[] = [
  { id: 'fallback-rene', nombre: 'René G. Morales C.', cargo: 'Director Contable General', profesion: 'Contador General', descripcion: 'Dirección de SERCOPREV, asesoría, consultoría y supervisión integral de la contabilidad general.', foto_path: null, foto_alt: null, foto_url: null, orden: 10, activo: true },
  { id: 'fallback-guillermo', nombre: 'Guillermo Paiguano', cargo: 'Equipo SERCOPREV', profesion: null, descripcion: 'Cargo, profesión y responsabilidades disponibles para completar desde la configuración de la página comercial.', foto_path: null, foto_alt: null, foto_url: null, orden: 20, activo: true },
  { id: 'fallback-jose', nombre: 'José F. Quinchao G.', cargo: 'Encargado de Tramitaciones y Asesorías Específicas', profesion: 'Contador General', descripcion: 'Tramitaciones ante el Servicio de Impuestos Internos, consultoría y asesorías específicas.', foto_path: null, foto_alt: null, foto_url: null, orden: 30, activo: true },
  { id: 'fallback-cristian', nombre: 'Cristián Báez R.', cargo: 'Encargado de Impuestos Santiago y Provincias', profesion: 'Técnico en Contabilidad', descripcion: 'Gestión tributaria y de impuestos para clientes de Santiago y regiones.', foto_path: null, foto_alt: null, foto_url: null, orden: 40, activo: true },
  { id: 'fallback-ilka', nombre: 'Ilka Tarrazona', cargo: 'Encargada de Remuneraciones — Vega Central y otros clientes', profesion: 'Técnico en Contabilidad', descripcion: 'Gestión de remuneraciones, documentación laboral y procesos previsionales de su cartera de clientes.', foto_path: null, foto_alt: null, foto_url: null, orden: 50, activo: true },
  { id: 'fallback-gabriela', nombre: 'Gabriela Gatica P.', cargo: 'Encargada de Remuneraciones — Santiago y Provincias', profesion: 'Contador General', descripcion: 'Gestión de remuneraciones y procesos laborales para clientes de Santiago, regiones y otras carteras.', foto_path: null, foto_alt: null, foto_url: null, orden: 60, activo: true },
  { id: 'fallback-gisela', nombre: 'Gisela J. Rosales Sepúlveda', cargo: 'Relaciones Públicas', profesion: 'Contador General', descripcion: 'Relaciones públicas, coordinación y atención de requerimientos vinculados con clientes y la firma.', foto_path: null, foto_alt: null, foto_url: null, orden: 70, activo: true },
]

function publicUrl(path: string | null | undefined) {
  if (!path) return null
  try {
    return createAdminClient().storage.from(COMMERCIAL_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
  } catch {
    return null
  }
}

export async function loadCommercialSiteContent(): Promise<CommercialSiteContent> {
  try {
    const admin = createAdminClient()
    const [configResult, servicesResult, teamResult, reviewsResult] = await Promise.all([
      admin.from('pagina_comercial_config').select('*').eq('id', 'principal').maybeSingle(),
      admin.from('pagina_comercial_servicios').select('*').eq('activo', true).order('orden').order('titulo'),
      admin.from('pagina_comercial_equipo').select('*').eq('activo', true).order('orden').order('nombre'),
      admin.from('pagina_comercial_resenas').select('*').eq('activo', true).order('orden').order('created_at', { ascending: false }),
    ])

    const config = configResult.error || !configResult.data
      ? defaultCommercialConfig
      : { ...defaultCommercialConfig, ...configResult.data } as CommercialConfig

    const services = servicesResult.error || !servicesResult.data?.length
      ? fallbackServices
      : servicesResult.data as CommercialService[]

    const teamRows = teamResult.error || !teamResult.data?.length
      ? fallbackTeam
      : teamResult.data as Omit<CommercialTeamMember, 'foto_url'>[]

    const reviewRows = reviewsResult.error
      ? []
      : reviewsResult.data as Omit<CommercialReview, 'foto_url'>[]

    return {
      config,
      services,
      team: teamRows.map((member) => ({ ...member, foto_url: publicUrl(member.foto_path) })),
      reviews: reviewRows.map((review) => ({ ...review, foto_url: publicUrl(review.foto_path) })),
    }
  } catch (error) {
    console.error('COMMERCIAL_SITE_CONTENT_LOAD_FAILED', error)
    return { config: defaultCommercialConfig, services: fallbackServices, team: fallbackTeam, reviews: [] }
  }
}
