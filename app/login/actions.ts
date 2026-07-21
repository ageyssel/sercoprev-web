'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../utils/supabase/server'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(formData: FormData) {
  const email = typeof formData.get('email') === 'string'
    ? String(formData.get('email')).trim().toLowerCase().slice(0, 254)
    : ''
  const password = typeof formData.get('password') === 'string'
    ? String(formData.get('password')).slice(0, 128)
    : ''

  if (!EMAIL_PATTERN.test(email) || password.length < 8) {
    redirect('/login?message=Credenciales incorrectas')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    redirect('/login?message=Credenciales incorrectas')
  }

  const { data: profile, error: profileError } = await supabase
    .from('empresas')
    .select('es_admin, must_change_password')
    .eq('user_id', data.user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    redirect('/login?message=La cuenta no está habilitada para el portal')
  }

  revalidatePath('/', 'layout')

  if (profile.es_admin) redirect('/admin')
  if (profile.must_change_password) redirect('/cuenta/cambiar-clave')
  redirect('/dashboard')
}
