'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Inicializamos Supabase con la LLAVE MAESTRA para saltarnos las restricciones
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function crearCliente(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rut = formData.get('rut') as string
  const razon_social = formData.get('razon_social') as string

  // 1. Crear el usuario en el sistema de Auth (Silenciosamente)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true // Lo confirmamos automáticamente
  })

  if (authError) throw new Error(authError.message)

  // 2. Vincularlo a la tabla de empresas
  if (authData.user) {
    await supabaseAdmin.from('empresas').insert({
      user_id: authData.user.id,
      rut,
      razon_social,
      estado_impuestos: 'Al día',
      es_admin: false
    })
  }

  revalidatePath('/admin') // Recargar la página
}

export async function subirDocumento(formData: FormData) {
  const empresa_id = formData.get('empresa_id') as string
  const categoria = formData.get('categoria') as string
  const file = formData.get('archivo') as File
  
  if (!file) return

  // Limpiamos el nombre del archivo para que no tenga caracteres raros
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')

  // 1. Subir el PDF al Storage usando Upsert (por si ya existe uno con ese nombre lo reemplaza)
  const { error: uploadError } = await supabaseAdmin.storage
    .from('documentos')
    .upload(safeName, file, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  // 2. Guardar el registro en la base de datos
  await supabaseAdmin.from('documentos').insert({
    empresa_id,
    nombre: safeName,
    categoria
  })

  revalidatePath('/admin') // Recargar la página
}