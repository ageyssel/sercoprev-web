'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { COMMERCIAL_MEDIA_BUCKET } from '@/lib/commercial-site'
import { requireAdmin } from '@/utils/supabase/require-admin'

const ADMIN_ROLES = ['Superadministrador', 'Administrador'] as const
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function multiline(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\r\n/g, '\n').slice(0, maxLength) : ''
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === 'on' || formData.get(name) === 'true'
}

function items(value: unknown) {
  return multiline(value, 6000)
    .split('\n')
    .map((item) => item.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
    .slice(0, 20)
}

function returnToAdmin(message: string, status: 'success' | 'error' = 'success'): never {
  revalidatePath('/')
  revalidatePath('/admin/configuracion/pagina-comercial')
  redirect(`/admin/configuracion/pagina-comercial?${status}=${encodeURIComponent(message)}`)
}

function imageErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback
  if (error.message === 'IMAGE_TOO_LARGE') return 'La fotografía supera 5 MB.'
  if (error.message === 'INVALID_IMAGE_TYPE') return 'La fotografía debe estar en formato JPG, PNG o WebP.'
  return fallback
}

async function uploadImage(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  file: File | null,
  folder: 'equipo' | 'resenas',
  id: string,
) {
  if (!file || file.size === 0) return null
  if (file.size > 5 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE')
  const extension = IMAGE_TYPES[file.type]
  if (!extension) throw new Error('INVALID_IMAGE_TYPE')

  const path = `${folder}/${id}/${crypto.randomUUID()}.${extension}`
  const { error } = await adminClient.storage
    .from(COMMERCIAL_MEDIA_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: '3600' })
  if (error) throw error
  return path
}

async function removeImage(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  path: string | null | undefined,
) {
  if (!path) return
  const { error } = await adminClient.storage.from(COMMERCIAL_MEDIA_BUCKET).remove([path])
  if (error) console.error('COMMERCIAL_MEDIA_REMOVE_FAILED', { path, error })
}

export async function guardarContenidoGeneral(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const payload = {
    id: 'principal',
    hero_eyebrow: clean(formData.get('hero_eyebrow'), 180),
    hero_title: clean(formData.get('hero_title'), 220),
    hero_description: multiline(formData.get('hero_description'), 1200),
    services_eyebrow: clean(formData.get('services_eyebrow'), 100),
    services_title: clean(formData.get('services_title'), 220),
    services_description: multiline(formData.get('services_description'), 1200),
    team_eyebrow: clean(formData.get('team_eyebrow'), 100),
    team_title: clean(formData.get('team_title'), 220),
    team_description: multiline(formData.get('team_description'), 1200),
    reviews_eyebrow: clean(formData.get('reviews_eyebrow'), 100),
    reviews_title: clean(formData.get('reviews_title'), 220),
    reviews_description: multiline(formData.get('reviews_description'), 1200),
    reviews_enabled: checkbox(formData, 'reviews_enabled'),
    contact_title: clean(formData.get('contact_title'), 220),
    contact_description: multiline(formData.get('contact_description'), 1200),
    footer_description: multiline(formData.get('footer_description'), 600),
  }

  if (!payload.hero_title || !payload.services_title || !payload.team_title || !payload.contact_title) {
    returnToAdmin('Complete los títulos principales antes de guardar.', 'error')
  }

  const { error } = await adminClient.from('pagina_comercial_config').upsert(payload, { onConflict: 'id' })
  if (error) {
    console.error('COMMERCIAL_CONFIG_SAVE_FAILED', error)
    returnToAdmin('No fue posible guardar el contenido general.', 'error')
  }
  returnToAdmin('Contenido general actualizado.')
}

export async function crearServicioComercial(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const payload = {
    icon: clean(formData.get('icon'), 30) || 'briefcase',
    titulo: clean(formData.get('titulo'), 160),
    descripcion: multiline(formData.get('descripcion'), 1000),
    items: items(formData.get('items')),
    orden: integer(formData.get('orden'), 0),
    activo: checkbox(formData, 'activo'),
  }
  if (payload.titulo.length < 2 || payload.descripcion.length < 2 || payload.items.length === 0) {
    returnToAdmin('Complete título, descripción y al menos un servicio.', 'error')
  }
  const { error } = await adminClient.from('pagina_comercial_servicios').insert(payload)
  if (error) {
    console.error('COMMERCIAL_SERVICE_CREATE_FAILED', error)
    returnToAdmin('No fue posible crear el servicio.', 'error')
  }
  returnToAdmin('Servicio comercial creado.')
}

export async function actualizarServicioComercial(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const id = clean(formData.get('id'), 40)
  if (!UUID_PATTERN.test(id)) returnToAdmin('Servicio inválido.', 'error')
  const payload = {
    icon: clean(formData.get('icon'), 30) || 'briefcase',
    titulo: clean(formData.get('titulo'), 160),
    descripcion: multiline(formData.get('descripcion'), 1000),
    items: items(formData.get('items')),
    orden: integer(formData.get('orden'), 0),
    activo: checkbox(formData, 'activo'),
  }
  if (payload.titulo.length < 2 || payload.descripcion.length < 2 || payload.items.length === 0) {
    returnToAdmin('Complete todos los datos del servicio.', 'error')
  }
  const { error } = await adminClient.from('pagina_comercial_servicios').update(payload).eq('id', id)
  if (error) {
    console.error('COMMERCIAL_SERVICE_UPDATE_FAILED', error)
    returnToAdmin('No fue posible actualizar el servicio.', 'error')
  }
  returnToAdmin('Servicio comercial actualizado.')
}

export async function eliminarServicioComercial(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const id = clean(formData.get('id'), 40)
  if (!UUID_PATTERN.test(id)) returnToAdmin('Servicio inválido.', 'error')
  const { error } = await adminClient.from('pagina_comercial_servicios').delete().eq('id', id)
  if (error) {
    console.error('COMMERCIAL_SERVICE_DELETE_FAILED', error)
    returnToAdmin('No fue posible eliminar el servicio.', 'error')
  }
  returnToAdmin('Servicio eliminado.')
}

export async function crearIntegranteEquipo(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const id = crypto.randomUUID()
  const payload = {
    id,
    nombre: clean(formData.get('nombre'), 160),
    cargo: clean(formData.get('cargo'), 200),
    profesion: clean(formData.get('profesion'), 160) || null,
    descripcion: multiline(formData.get('descripcion'), 1200) || null,
    foto_alt: clean(formData.get('foto_alt'), 240) || null,
    orden: integer(formData.get('orden'), 0),
    activo: checkbox(formData, 'activo'),
  }
  if (payload.nombre.length < 2 || payload.cargo.length < 2) {
    returnToAdmin('Complete nombre y cargo del integrante.', 'error')
  }

  let photoPath: string | null = null
  try {
    photoPath = await uploadImage(adminClient, formData.get('foto') as File | null, 'equipo', id)
    const { error } = await adminClient.from('pagina_comercial_equipo').insert({ ...payload, foto_path: photoPath })
    if (error) throw error
  } catch (error) {
    await removeImage(adminClient, photoPath)
    console.error('COMMERCIAL_TEAM_CREATE_FAILED', error)
    returnToAdmin(imageErrorMessage(error, 'No fue posible agregar al integrante.'), 'error')
  }

  returnToAdmin('Integrante agregado al equipo.')
}

export async function actualizarIntegranteEquipo(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const id = clean(formData.get('id'), 40)
  if (!UUID_PATTERN.test(id)) returnToAdmin('Integrante inválido.', 'error')

  const payload = {
    nombre: clean(formData.get('nombre'), 160),
    cargo: clean(formData.get('cargo'), 200),
    profesion: clean(formData.get('profesion'), 160) || null,
    descripcion: multiline(formData.get('descripcion'), 1200) || null,
    foto_alt: clean(formData.get('foto_alt'), 240) || null,
    orden: integer(formData.get('orden'), 0),
    activo: checkbox(formData, 'activo'),
  }
  if (payload.nombre.length < 2 || payload.cargo.length < 2) {
    returnToAdmin('Complete nombre y cargo del integrante.', 'error')
  }

  const { data: current, error: currentError } = await adminClient
    .from('pagina_comercial_equipo')
    .select('foto_path')
    .eq('id', id)
    .maybeSingle()
  if (currentError || !current) {
    console.error('COMMERCIAL_TEAM_CURRENT_READ_FAILED', currentError)
    returnToAdmin('No fue posible encontrar al integrante que desea actualizar.', 'error')
  }

  let newPath: string | null = null
  try {
    newPath = await uploadImage(adminClient, formData.get('foto') as File | null, 'equipo', id)
    const { error } = await adminClient
      .from('pagina_comercial_equipo')
      .update({ ...payload, foto_path: newPath ?? current.foto_path ?? null })
      .eq('id', id)
    if (error) throw error
    if (newPath && current.foto_path && current.foto_path !== newPath) await removeImage(adminClient, current.foto_path)
  } catch (error) {
    await removeImage(adminClient, newPath)
    console.error('COMMERCIAL_TEAM_UPDATE_FAILED', error)
    returnToAdmin(imageErrorMessage(error, 'No fue posible actualizar al integrante.'), 'error')
  }

  returnToAdmin('Integrante actualizado.')
}

export async function eliminarIntegranteEquipo(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const id = clean(formData.get('id'), 40)
  if (!UUID_PATTERN.test(id)) returnToAdmin('Integrante inválido.', 'error')
  const { data, error: readError } = await adminClient.from('pagina_comercial_equipo').select('foto_path').eq('id', id).maybeSingle()
  if (readError) {
    console.error('COMMERCIAL_TEAM_DELETE_READ_FAILED', readError)
    returnToAdmin('No fue posible encontrar al integrante.', 'error')
  }
  const { error } = await adminClient.from('pagina_comercial_equipo').delete().eq('id', id)
  if (error) {
    console.error('COMMERCIAL_TEAM_DELETE_FAILED', error)
    returnToAdmin('No fue posible eliminar al integrante.', 'error')
  }
  await removeImage(adminClient, data?.foto_path)
  returnToAdmin('Integrante eliminado.')
}

export async function crearResenaComercial(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const id = crypto.randomUUID()
  const payload = {
    id,
    nombre_cliente: clean(formData.get('nombre_cliente'), 160),
    empresa: clean(formData.get('empresa'), 200) || null,
    cargo: clean(formData.get('cargo'), 160) || null,
    resena: multiline(formData.get('resena'), 2000),
    foto_alt: clean(formData.get('foto_alt'), 240) || null,
    calificacion: Math.min(5, Math.max(1, integer(formData.get('calificacion'), 5))),
    orden: integer(formData.get('orden'), 0),
    activo: checkbox(formData, 'activo'),
  }
  if (payload.nombre_cliente.length < 2 || payload.resena.length < 10) {
    returnToAdmin('Complete el nombre y una reseña de al menos 10 caracteres.', 'error')
  }

  let photoPath: string | null = null
  try {
    photoPath = await uploadImage(adminClient, formData.get('foto') as File | null, 'resenas', id)
    const { error } = await adminClient.from('pagina_comercial_resenas').insert({ ...payload, foto_path: photoPath })
    if (error) throw error
  } catch (error) {
    await removeImage(adminClient, photoPath)
    console.error('COMMERCIAL_REVIEW_CREATE_FAILED', error)
    returnToAdmin(imageErrorMessage(error, 'No fue posible agregar la reseña.'), 'error')
  }

  returnToAdmin('Reseña agregada.')
}

export async function actualizarResenaComercial(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const id = clean(formData.get('id'), 40)
  if (!UUID_PATTERN.test(id)) returnToAdmin('Reseña inválida.', 'error')

  const payload = {
    nombre_cliente: clean(formData.get('nombre_cliente'), 160),
    empresa: clean(formData.get('empresa'), 200) || null,
    cargo: clean(formData.get('cargo'), 160) || null,
    resena: multiline(formData.get('resena'), 2000),
    foto_alt: clean(formData.get('foto_alt'), 240) || null,
    calificacion: Math.min(5, Math.max(1, integer(formData.get('calificacion'), 5))),
    orden: integer(formData.get('orden'), 0),
    activo: checkbox(formData, 'activo'),
  }
  if (payload.nombre_cliente.length < 2 || payload.resena.length < 10) {
    returnToAdmin('Complete correctamente la reseña.', 'error')
  }

  const { data: current, error: currentError } = await adminClient
    .from('pagina_comercial_resenas')
    .select('foto_path')
    .eq('id', id)
    .maybeSingle()
  if (currentError || !current) {
    console.error('COMMERCIAL_REVIEW_CURRENT_READ_FAILED', currentError)
    returnToAdmin('No fue posible encontrar la reseña que desea actualizar.', 'error')
  }

  let newPath: string | null = null
  try {
    newPath = await uploadImage(adminClient, formData.get('foto') as File | null, 'resenas', id)
    const { error } = await adminClient
      .from('pagina_comercial_resenas')
      .update({ ...payload, foto_path: newPath ?? current.foto_path ?? null })
      .eq('id', id)
    if (error) throw error
    if (newPath && current.foto_path && current.foto_path !== newPath) await removeImage(adminClient, current.foto_path)
  } catch (error) {
    await removeImage(adminClient, newPath)
    console.error('COMMERCIAL_REVIEW_UPDATE_FAILED', error)
    returnToAdmin(imageErrorMessage(error, 'No fue posible actualizar la reseña.'), 'error')
  }

  returnToAdmin('Reseña actualizada.')
}

export async function eliminarResenaComercial(formData: FormData) {
  const { adminClient } = await requireAdmin([...ADMIN_ROLES])
  const id = clean(formData.get('id'), 40)
  if (!UUID_PATTERN.test(id)) returnToAdmin('Reseña inválida.', 'error')
  const { data, error: readError } = await adminClient.from('pagina_comercial_resenas').select('foto_path').eq('id', id).maybeSingle()
  if (readError) {
    console.error('COMMERCIAL_REVIEW_DELETE_READ_FAILED', readError)
    returnToAdmin('No fue posible encontrar la reseña.', 'error')
  }
  const { error } = await adminClient.from('pagina_comercial_resenas').delete().eq('id', id)
  if (error) {
    console.error('COMMERCIAL_REVIEW_DELETE_FAILED', error)
    returnToAdmin('No fue posible eliminar la reseña.', 'error')
  }
  await removeImage(adminClient, data?.foto_path)
  returnToAdmin('Reseña eliminada.')
}
