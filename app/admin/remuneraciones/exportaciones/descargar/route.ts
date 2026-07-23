import { NextRequest, NextResponse } from 'next/server'
import { isCurrentStaffMfaVerified } from '@/lib/staff-mfa'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function csv(rows: unknown[][]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`
}

function fileResponse(content: string, filename: string) {
  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}

type Relation<T> = T | T[] | null
const one = <T,>(value: Relation<T>) => Array.isArray(value) ? value[0] : value

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const context = await resolveUserContext(supabase)
  if (!context) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (context.kind !== 'staff') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  if (!await isCurrentStaffMfaVerified(context.user.id)) return NextResponse.json({ error: 'MFA_REQUIRED' }, { status: 403 })
  if (context.mustChangePassword) return NextResponse.json({ error: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 })

  const empresaId = request.nextUrl.searchParams.get('empresa')?.trim() ?? ''
  const type = request.nextUrl.searchParams.get('tipo')?.trim() ?? ''
  const period = request.nextUrl.searchParams.get('periodo')?.trim() ?? ''
  if (!UUID_PATTERN.test(empresaId) || !['trabajadores', 'resumen', 'detalle'].includes(type)) {
    return NextResponse.json({ error: 'INVALID_EXPORT' }, { status: 400 })
  }
  if (period && !/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: 'INVALID_PERIOD' }, { status: 400 })

  const { data: company, error: companyError } = await supabase.from('empresas').select('rut, razon_social').eq('id', empresaId).eq('es_admin', false).single()
  if (companyError || !company) return NextResponse.json({ error: 'COMPANY_NOT_FOUND' }, { status: 404 })
  const baseName = company.rut.replace(/[^0-9Kk-]/g, '').toUpperCase()

  if (type === 'trabajadores') {
    const { data, error } = await supabase
      .from('trabajadores')
      .select('rut, nombres, apellido_paterno, apellido_materno, email, telefono, fecha_nacimiento, fecha_ingreso, fecha_termino, estado, afp, salud_tipo, salud_institucion, salud_plan_uf, afc_aplica, centro:centros_costo(codigo, nombre)')
      .eq('empresa_id', empresaId)
      .order('apellido_paterno')
    if (error) return NextResponse.json({ error: 'EXPORT_FAILED' }, { status: 500 })

    const rows: unknown[][] = [[
      'RUT', 'Nombres', 'Apellido paterno', 'Apellido materno', 'Correo', 'Teléfono',
      'Fecha nacimiento', 'Fecha ingreso', 'Fecha término', 'Estado', 'AFP',
      'Sistema salud', 'Institución salud', 'Plan salud UF', 'AFC', 'Centro costo',
    ]]
    for (const worker of data ?? []) {
      const center = one(worker.centro as unknown as Relation<{ codigo: string; nombre: string }>)
      rows.push([
        worker.rut, worker.nombres, worker.apellido_paterno, worker.apellido_materno,
        worker.email, worker.telefono, worker.fecha_nacimiento, worker.fecha_ingreso,
        worker.fecha_termino, worker.estado, worker.afp, worker.salud_tipo,
        worker.salud_institucion, worker.salud_plan_uf, worker.afc_aplica ? 'Sí' : 'No',
        center ? `${center.codigo} · ${center.nombre}` : '',
      ])
    }
    return fileResponse(csv(rows), `sercoprev-trabajadores-${baseName}.csv`)
  }

  let periodsQuery = supabase.from('periodos_remuneraciones').select('id, periodo').eq('empresa_id', empresaId)
  if (period) periodsQuery = periodsQuery.eq('periodo', `${period}-01`)
  const { data: periods, error: periodsError } = await periodsQuery
  if (periodsError) return NextResponse.json({ error: 'EXPORT_FAILED' }, { status: 500 })
  const periodIds = (periods ?? []).map((item) => item.id)
  if (periodIds.length === 0) return fileResponse(csv([['Sin registros para el filtro seleccionado']]), `sercoprev-${type}-${baseName}-${period || 'todos'}.csv`)

  if (type === 'resumen') {
    const { data, error } = await supabase
      .from('liquidaciones')
      .select('sueldo_base, total_imponible, total_tributable, total_no_imponible, descuentos_legales, otros_descuentos, aportes_empleador, liquido_pagar, estado, trabajador:trabajadores(rut, nombres, apellido_paterno, apellido_materno), periodo:periodos_remuneraciones(periodo)')
      .in('periodo_id', periodIds)
      .order('created_at')
    if (error) return NextResponse.json({ error: 'EXPORT_FAILED' }, { status: 500 })

    const rows: unknown[][] = [[
      'Periodo', 'RUT', 'Trabajador', 'Sueldo base pagado', 'Total imponible',
      'Total tributable', 'Total no imponible', 'Descuentos legales',
      'Otros descuentos', 'Aportes empleador', 'Líquido a pagar', 'Estado',
    ]]
    for (const item of data ?? []) {
      const worker = one(item.trabajador as unknown as Relation<{ rut: string; nombres: string; apellido_paterno: string; apellido_materno: string | null }>)
      const itemPeriod = one(item.periodo as unknown as Relation<{ periodo: string }>)
      rows.push([
        itemPeriod?.periodo?.slice(0, 7) ?? '',
        worker?.rut ?? '',
        worker ? `${worker.nombres} ${worker.apellido_paterno} ${worker.apellido_materno ?? ''}`.trim() : '',
        item.sueldo_base,
        item.total_imponible,
        item.total_tributable,
        item.total_no_imponible,
        item.descuentos_legales,
        item.otros_descuentos,
        item.aportes_empleador,
        item.liquido_pagar,
        item.estado,
      ])
    }
    return fileResponse(csv(rows), `sercoprev-liquidaciones-${baseName}-${period || 'todos'}.csv`)
  }

  const { data, error } = await supabase
    .from('liquidaciones')
    .select('id, trabajador:trabajadores(rut, nombres, apellido_paterno), periodo:periodos_remuneraciones(periodo), detalles:liquidacion_detalles(codigo, descripcion, naturaleza, imponible, tributable, monto, orden)')
    .in('periodo_id', periodIds)
    .order('created_at')
  if (error) return NextResponse.json({ error: 'EXPORT_FAILED' }, { status: 500 })

  const rows: unknown[][] = [['Periodo', 'RUT', 'Trabajador', 'Código', 'Concepto', 'Naturaleza', 'Imponible', 'Tributable', 'Monto', 'Orden']]
  for (const item of data ?? []) {
    const worker = one(item.trabajador as unknown as Relation<{ rut: string; nombres: string; apellido_paterno: string }>)
    const itemPeriod = one(item.periodo as unknown as Relation<{ periodo: string }>)
    const details = [...((item.detalles ?? []) as Array<{ codigo: string; descripcion: string; naturaleza: string; imponible: boolean; tributable: boolean; monto: number; orden: number }>)]
      .sort((a, b) => a.orden - b.orden)
    for (const detail of details) {
      rows.push([
        itemPeriod?.periodo?.slice(0, 7) ?? '',
        worker?.rut ?? '',
        worker ? `${worker.nombres} ${worker.apellido_paterno}` : '',
        detail.codigo,
        detail.descripcion,
        detail.naturaleza,
        detail.imponible ? 'Sí' : 'No',
        detail.tributable ? 'Sí' : 'No',
        detail.monto,
        detail.orden,
      ])
    }
  }
  return fileResponse(csv(rows), `sercoprev-detalle-liquidaciones-${baseName}-${period || 'todos'}.csv`)
}
