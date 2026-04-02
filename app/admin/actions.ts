'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

// 1. Quitamos el "const resend = new Resend(...)" de aquí arriba

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Credenciales Supabase faltantes.")
  return createClient(url, key)
}

export async function crearCliente(formData: FormData) {
  const supabaseAdmin = getAdminClient()
  
  // 2. Inicializamos Resend JUSTO AQUÍ, solo cuando se va a usar
  const resend = new Resend(process.env.RESEND_API_KEY)

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
    const { error: dbError } = await supabaseAdmin.from('empresas').insert({
      user_id: authData.user.id,
      rut,
      razon_social,
      estado_impuestos: 'Al día',
      es_admin: false
    })

    if (dbError) throw new Error(dbError.message)

    try {
      // Solo intentamos enviar si existe la API Key
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'SERCOPREV <onboarding@resend.dev>',
          to: email,
          subject: 'Bienvenido al Portal - SERCOPREV',
          html: `<h1>Bienvenido ${razon_social}</h1><p>Tus claves son...</p>` // (Usa el HTML largo que te pasé antes)
        })
      }
    } catch (e) {
      console.error("Error de correo:", e)
    }
  }

  revalidatePath('/admin')
}