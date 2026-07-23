'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(formData: FormData) {
  const email = typeof formData.get('email') === 'string'
    ? String(formData.get('email')).trim().toLowerCase().slice(0, 254)
    : ''
  const password = typeof formData.get('password') === 'string'
    ? String(formData.get('password')).slice(0, 128)
    : ''

  if (!EMAIL_PATTERN.test(email) || password.length < 8) redirect('/login?message=Credenciales incorrectas')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) redirect('/login?message=Credenciales incorrectas')

  const context = await resolveUserContext(supabase)
  if (!context) {
    await supabase.auth.signOut()
    redirect('/login?message=La cuenta no está habilitada para el portal')
  }

  revalidatePath('/', 'layout')
  if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')
  if (context.kind === 'staff') redirect('/admin')
  redirect('/dashboard')
}
