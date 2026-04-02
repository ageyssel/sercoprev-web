'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Creamos una función interna para obtener el cliente solo cuando se necesite
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Las credenciales de administrador no están configuradas.")
  }

  return createClient(url, key)
}

export async function crearCliente(formData: FormData) {
  const supabaseAdmin = getAdminClient() // Se activa solo al ejecutar la acción
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rut = formData.get('rut') as string
  const razon_social = formData.get('razon_social') as string

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) throw new Error(authError.message)

  if (authData.user) {
    await supabaseAdmin.from('empresas').insert({
      user_id: authData.user.id,
      rut,
      razon_social,
      estado_impuestos: 'Al día',
      es_admin: false
    })
  }

  revalidatePath('/admin')
}

export async function subirDocumento(formData: FormData) {
  const supabaseAdmin = getAdminClient() // Se activa solo al ejecutar la acción
  
  const empresa_id = formData.get('empresa_id') as string
  const categoria = formData.get('categoria') as string
  const file = formData.get('archivo') as File
  
  if (!file) return

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('documentos')
    .upload(safeName, file, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  await supabaseAdmin.from('documentos').insert({
    empresa_id,
    nombre: safeName,
    categoria
  })

  revalidatePath('/admin')
}