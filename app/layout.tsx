import { Montserrat } from 'next/font/google'
import './globals.css'

// Configuramos la fuente Montserrat
const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'], // Diferentes grosores
})

// Optimizamos el título que aparece en la pestaña del navegador (SEO)
export const metadata = {
  title: 'SERCOPREV - Contabilidad y Gestión',
  description: 'Más de 30 años impulsando el crecimiento de Micro, Pequeñas y Medianas empresas en Chile.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      {/* Aplicamos la fuente a todo el cuerpo de la página */}
      <body className={montserrat.className}>
        {children}
      </body>
    </html>
  )
}