'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache' // <--- AGREGA ESTA LÍNEA

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Si hay error, volvemos al login con un mensaje
    return redirect('/login?message=Credenciales incorrectas')
  }

  // Limpiamos caché y redirigimos
  revalidatePath('/', 'layout')
  return redirect('/dashboard')
}