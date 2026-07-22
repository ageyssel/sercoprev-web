import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

export const metadata = { title: 'Política de privacidad | SERCOPREV' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f4f7f9] px-4 py-10 sm:px-6">
      <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <BrandLogo />
        <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Información legal</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0f2438]">Política de privacidad</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">SERCOPREV utiliza los datos entregados mediante formularios, comunicaciones y el portal de clientes exclusivamente para evaluar solicitudes, prestar servicios contables y administrativos, gestionar la relación con sus clientes y cumplir obligaciones legales.</p>
        <div className="mt-8 grid gap-7 text-sm leading-7 text-slate-600">
          <Section title="Datos que tratamos">Podemos tratar información de contacto, identificación de empresas, antecedentes contables, tributarios, laborales, contractuales y documentos proporcionados por clientes o prospectos.</Section>
          <Section title="Finalidad">Los datos se utilizan para responder consultas, preparar propuestas, ejecutar servicios contratados, administrar obligaciones, solicitar antecedentes, entregar documentos y mantener la seguridad del portal.</Section>
          <Section title="Seguridad y acceso">El portal emplea autenticación, aislamiento por empresa, políticas de acceso a nivel de base de datos y enlaces temporales para documentos. El acceso se limita a usuarios autorizados y al equipo responsable de la prestación del servicio.</Section>
          <Section title="Conservación">Los antecedentes se conservan durante la vigencia de la relación comercial y por los periodos que resulten necesarios para respaldar el servicio, atender obligaciones legales o resolver controversias.</Section>
          <Section title="Contacto">Para consultas sobre privacidad, rectificación o actualización de datos, escriba a contabilidad@sercoprev.cl.</Section>
        </div>
        <Link href="/" className="mt-10 inline-flex rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white">Volver al inicio</Link>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-black text-[#17324a]">{title}</h2><p className="mt-2">{children}</p></section>
}
