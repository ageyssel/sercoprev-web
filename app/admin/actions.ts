'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

// Inicializamos Resend (asegúrate de tener RESEND_API_KEY en tu .env.local)
const resend = new Resend(process.env.RESEND_API_KEY)

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

  // 1. Crear el usuario en Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) throw new Error(authError.message)

  if (authData.user) {
    // 2. Guardar los datos en la base de datos
    const { error: dbError } = await supabaseAdmin.from('empresas').insert({
      user_id: authData.user.id,
      rut,
      razon_social,
      estado_impuestos: 'Al día',
      es_admin: false
    })

    if (dbError) throw new Error(dbError.message)

    // 3. ENVIAR CORREO CORPORATIVO AUTOMÁTICO
    try {
      await resend.emails.send({
        from: 'SERCOPREV Portal <onboarding@resend.dev>', // Cambia esto cuando verifiques tu dominio en Resend
        to: email,
        subject: 'Bienvenido al Portal de Clientes - SERCOPREV',
        html: `
          <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">SERCOPREV</h1>
              <p style="color: #eab308; margin-top: 5px; font-style: italic; font-size: 14px;">Su partner estratégico en el camino al éxito</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff; color: #374151;">
              <h2 style="color: #1e3a8a; margin-top: 0;">Bienvenido, ${razon_social}</h2>
              <p>Es un placer para nosotros informarle que su cuenta en el nuevo <strong>Portal de Clientes SERCOPREV</strong> ha sido activada exitosamente.</p>
              
              <p>A partir de este momento, podrá revisar sus estados de pago, liquidaciones, declaraciones de impuestos y más información confidencial de manera rápida y segura.</p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #1e3a8a;">
                <p style="margin: 0 0 10px 0; color: #0f172a;"><strong>Sus credenciales de acceso:</strong></p>
                <p style="margin: 0 0 5px 0;"><strong>Enlace:</strong> <a href="https://sercoprev.cl/login" style="color: #1e3a8a; text-decoration: none; font-weight: bold;">sercoprev.cl/login</a></p>
                <p style="margin: 0 0 5px 0;"><strong>Usuario:</strong> ${email}</p>
                <p style="margin: 0;"><strong>Contraseña temporal:</strong> ${password}</p>
              </div>
              
              <p>Le recomendamos ingresar lo antes posible para familiarizarse con la plataforma y cambiar su contraseña si lo desea.</p>
              
              <p style="margin-top: 30px; margin-bottom: 5px;">Atentamente,</p>
              <p style="font-weight: bold; margin: 0; color: #0f172a;">René Morales</p>
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">Director Ejecutivo - SERCOPREV</p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
              Este es un correo automático generado por FocusFrame Media SpA para SERCOPREV. Por favor, no responda a este mensaje.
            </div>
          </div>
        `
      })
    } catch (emailError) {
      console.error("Error enviando el correo de bienvenida:", emailError)
      // Usamos try/catch para que, si el correo falla (ej: llave de Resend mal puesta), 
      // el cliente igual quede creado en la base de datos correctamente.
    }
  }

  revalidatePath('/admin')
}