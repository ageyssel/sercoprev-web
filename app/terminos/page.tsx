import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

export const metadata = { title: 'Términos de uso | SERCOPREV' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f4f7f9] px-4 py-10 sm:px-6">
      <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <BrandLogo />
        <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Información legal</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0f2438]">Términos de uso del portal</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">El portal SERCOPREV es un canal privado de apoyo a la relación de servicios. La información publicada no reemplaza instrucciones formales, contratos, declaraciones presentadas ni comprobantes emitidos por autoridades o instituciones.</p>
        <div className="mt-8 grid gap-7 text-sm leading-7 text-slate-600">
          <Section title="Credenciales">Cada usuario es responsable de proteger su correo, contraseña y dispositivos. Las credenciales no deben compartirse con personas no autorizadas.</Section>
          <Section title="Información del cliente">El cliente debe entregar antecedentes completos, correctos y dentro de los plazos acordados. La falta o retraso en la entrega puede afectar la ejecución oportuna de obligaciones.</Section>
          <Section title="Documentos y estados">Los estados visibles representan el avance operacional registrado por SERCOPREV. Los comprobantes, formularios y documentos definitivos prevalecen sobre resúmenes o indicadores del portal.</Section>
          <Section title="Disponibilidad">SERCOPREV puede realizar mantenciones o mejoras. Se aplican medidas razonables de continuidad y seguridad, sin garantizar disponibilidad ininterrumpida ante eventos externos.</Section>
          <Section title="Uso permitido">No se permite intentar acceder a información de terceros, alterar el funcionamiento del portal, automatizar accesos no autorizados o utilizar el servicio para fines ilícitos.</Section>
          <Section title="Contacto">Para asistencia técnica o dudas sobre información publicada, contacte a contabilidad@sercoprev.cl.</Section>
        </div>
        <Link href="/" className="mt-10 inline-flex rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white">Volver al inicio</Link>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-black text-[#17324a]">{title}</h2><p className="mt-2">{children}</p></section>
}
