'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

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

  // Si todo está bien, mandamos al dashboard (que luego redirigirá al admin si corresponde)
  revalidatePath('/', 'layout')
  return redirect('/dashboard')
}