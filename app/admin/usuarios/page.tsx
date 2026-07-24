import Link from 'next/link'
import { AppIcon } from '@/components/AppIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createClient } from '@/utils/supabase/server'
import { cambiarEstadoUsuario, restablecerAccesoUsuario } from '@/app/admin/user-actions'
import { ClientUserForm, StaffUserForm } from '@/app/admin/components/UserForms'
import { requirePrivilegedAdminPage } from '@/utils/supabase/require-privileged-admin'

export const dynamic = 'force-dynamic'

type Staff = { id: string; nombre: string; email: string; rol: string; activo: boolean; must_change_password: boolean; created_at: string }
type ClientUser = { id: string; empresa_id: string; nombre: string; email: string; rol: string; activo: boolean; must_change_password: boolean; created_at: string; empresa: { razon_social: string; nombre_fantasia: string | null } | Array<{ razon_social: string; nombre_fantasia: string | null }> | null }
type Company = { id: string; razon_social: string; nombre_fantasia: string | null; rut: string; email_contacto: string | null }

const one = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] : value

export default async function UsersPage() {
  await requirePrivilegedAdminPage()
  const supabase = await createClient()
  const [staffResult, clientUsersResult, companiesResult] = await Promise.all([
    supabase.from('usuarios_organizacion').select('id, nombre, email, rol, activo, must_change_password, created_at').order('nombre'),
    supabase.from('empresa_usuarios').select('id, empresa_id, nombre, email, rol, activo, must_change_password, created_at, empresa:empresas(razon_social, nombre_fantasia)').order('created_at', { ascending: false }),
    supabase.from('empresas').select('id, razon_social, nombre_fantasia, rut, email_contacto').eq('es_admin', false).order('razon_social'),
  ])

  const staff = (staffResult.data ?? []) as Staff[]
  const clientUsers = (clientUsersResult.data ?? []) as ClientUser[]
  const companies = (companiesResult.data ?? []) as Company[]
  const error = staffResult.error || clientUsersResult.error || companiesResult.error
  const companyOptions = companies.map((company) => ({ id: company.id, label: `${company.nombre_fantasia || company.razon_social} · ${company.rut}` }))

  return (
    <div className="mx-auto max-w-[1450px]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a47b24]">Identidad y permisos</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f2438] sm:text-4xl">Usuarios y accesos</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Cuentas del equipo SERCOPREV y accesos adicionales de clientes con roles, cambio obligatorio de contraseña y desactivación inmediata.</p>
        </div>
        <Link href="/admin/auditoria" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#10283d] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#174f7a]">
          <AppIcon name="tasks" className="h-4 w-4" />
          Ver auditoría
        </Link>
      </header>
      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">No fue posible cargar toda la gestión de usuarios. Confirme la migración de accesos.</div>}

      <section className="mt-7 grid gap-4 sm:grid-cols-3"><Metric icon="users" label="Equipo activo" value={staff.filter((item) => item.activo).length} /><Metric icon="building" label="Clientes" value={companies.length} /><Metric icon="shield" label="Accesos cliente" value={clientUsers.filter((item) => item.activo).length} /></section>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="users" title="Nuevo usuario del equipo" description="Asigne sólo las funciones necesarias para su trabajo." /><div className="mt-6"><StaffUserForm /></div></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="building" title="Nuevo usuario de cliente" description="Permita que más personas de una empresa ingresen a su mismo portal aislado." /><div className="mt-6"><ClientUserForm companies={companyOptions} /></div></section>
      </div>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="shield" title="Equipo SERCOPREV" description="Administradores y superadministradores gestionan accesos. Los demás roles no pueden abrir esta sección." /><div className="mt-5 grid gap-3">{staff.length === 0 ? <Empty text="No hay usuarios internos adicionales." /> : staff.map((user) => <UserCard key={user.id} id={user.id} type="equipo" name={user.nombre} email={user.email} role={user.rol} active={user.activo} passwordPending={user.must_change_password} />)}</div></section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon="building" title="Usuarios de clientes" description="Cada acceso adicional queda asociado a una sola empresa y hereda su aislamiento RLS." /><div className="mt-5 grid gap-3">{clientUsers.length === 0 ? <Empty text="No hay accesos adicionales de clientes." /> : clientUsers.map((user) => { const company = one(user.empresa); return <UserCard key={user.id} id={user.id} type="cliente" name={user.nombre} email={user.email} role={`${user.rol} · ${company?.nombre_fantasia || company?.razon_social || 'Sin empresa'}`} active={user.activo} passwordPending={user.must_change_password} /> })}</div></section>

      <section className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><p className="font-black">Cuenta principal de cada cliente</p><p className="mt-1">La cuenta creada junto con la empresa continúa siendo el administrador principal. Los accesos de esta pantalla son adicionales y no reemplazan esa cuenta.</p></section>
    </div>
  )
}

function UserCard({ id, type, name, email, role, active, passwordPending }: { id: string; type: 'equipo' | 'cliente'; name: string; email: string; role: string; active: boolean; passwordPending: boolean }) {
  return <article className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#17324a]">{name}</h3><StatusBadge status={active ? 'Activo' : 'Suspendido'} />{passwordPending && <StatusBadge status="Cambio de clave pendiente" />}</div><p className="mt-1 text-sm font-bold text-[#134b78]">{email}</p><p className="mt-1 text-xs text-slate-500">{role}</p></div><div className="flex flex-wrap gap-2"><form action={restablecerAccesoUsuario}><input type="hidden" name="id" value={id} /><input type="hidden" name="tipo" value={type} /><button className="h-9 rounded-lg border border-[#134b78] px-3 text-xs font-black text-[#134b78]">Restablecer acceso</button></form><form action={cambiarEstadoUsuario}><input type="hidden" name="id" value={id} /><input type="hidden" name="tipo" value={type} /><input type="hidden" name="activo" value={active ? 'false' : 'true'} /><button className={`h-9 rounded-lg px-3 text-xs font-black text-white ${active ? 'bg-red-700' : 'bg-emerald-700'}`}>{active ? 'Desactivar' : 'Activar'}</button></form></div></div></article>
}
function Metric({ icon, label, value }: { icon: 'users' | 'building' | 'shield'; label: string; value: number }) { return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><p className="text-2xl font-black text-[#0f2438]">{value}</p><p className="text-xs font-bold uppercase text-slate-500">{label}</p></div></article> }
function SectionTitle({ icon, title, description }: { icon: 'users' | 'building' | 'shield'; title: string; description: string }) { return <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#134b78]"><AppIcon name={icon} className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0f2438]">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div> }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">{text}</div> }
