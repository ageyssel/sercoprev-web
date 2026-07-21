'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type PasswordActionState = {
  status: 'idle' | 'error'
  message: string
}

function isStrongPassword(value: string) {
  return value.length >= 12
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value)
}

export async function cambiarClave(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const password = typeof formData.get('password') === 'string'
    ? String(formData.get('password'))
    : ''
  const confirmation = typeof formData.get('confirmation') === 'string'
    ? String(formData.get('confirmation'))
    : ''

  if (password !== confirmation) {
    return { status: 'error', message: 'Las contraseñas no coinciden.' }
  }

  if (!isStrongPassword(password)) {
    return {
      status: 'error',
      message: 'Use al menos 12 caracteres con mayúscula, minúscula, número y símbolo.',
    }
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { status: 'error', message: 'La sesión expiró. Inicie sesión nuevamente.' }
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password })

  if (passwordError) {
    console.error('No se pudo actualizar la contraseña:', passwordError.message)
    return { status: 'error', message: 'No se pudo actualizar la contraseña.' }
  }

  const { error: profileError } = await supabase
    .from('empresas')
    .update({ must_change_password: false })
    .eq('user_id', user.id)

  if (profileError) {
    console.error('Contraseña actualizada, pero falló el indicador de perfil:', profileError.message)
    return {
      status: 'error',
      message: 'La contraseña cambió, pero no se pudo completar el perfil. Contacte al administrador.',
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
