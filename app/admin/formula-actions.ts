'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { evaluateFormula, validateFormulaExpression } from '@/lib/formula-engine'
import { requireAdmin } from '@/utils/supabase/require-admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

type VariableDefinition = { code?: string; description?: string }

function variableCodes(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => item && typeof item === 'object' ? String((item as VariableDefinition).code ?? '').trim().toUpperCase() : '')
    .filter(Boolean)
}

async function loadFormula(adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'], formulaId: string) {
  const { data, error } = await adminClient
    .from('formula_definitions')
    .select('id, code, name, variables, active')
    .eq('id', formulaId)
    .single()
  if (error || !data || !data.active) throw new Error('FORMULA_NOT_FOUND')
  return data
}

async function audit(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  actorUserId: string,
  input: { action: string; entityId: string; metadata?: Record<string, unknown> },
) {
  const { error } = await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    accion: input.action,
    entidad: 'formula_calculo',
    entidad_id: input.entityId,
    module: 'Remuneraciones',
    description: input.action === 'publicar' ? 'Publicación de fórmula de cálculo' : 'Edición de fórmula de cálculo',
    metadata: input.metadata ?? {},
  })
  if (error) console.error('FORMULA_AUDIT_FAILED', error.message)
}

export async function guardarBorradorFormula(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador'])
  const formulaId = clean(formData.get('formula_id'), 40)
  const expression = clean(formData.get('expression'), 4000).toUpperCase()
  const reason = clean(formData.get('change_reason'), 1000)
  const effectiveFrom = clean(formData.get('effective_from'), 10)

  if (!UUID_PATTERN.test(formulaId)) redirect('/admin/formulas?error=Fórmula inválida')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) redirect('/admin/formulas?error=Indique una fecha de vigencia válida')
  if (!reason) redirect('/admin/formulas?error=Indique el motivo del cambio')

  const definition = await loadFormula(adminClient, formulaId)
  try {
    validateFormulaExpression(expression, variableCodes(definition.variables))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Expresión inválida'
    redirect(`/admin/formulas?error=${encodeURIComponent(message)}#formula-${formulaId}`)
  }

  const { data: latest } = await adminClient
    .from('formula_versions')
    .select('version')
    .eq('formula_id', formulaId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = Number(latest?.version ?? 0) + 1

  const { data, error } = await adminClient.from('formula_versions').insert({
    formula_id: formulaId,
    version: nextVersion,
    expression,
    status: 'Borrador',
    effective_from: effectiveFrom,
    change_reason: reason,
    created_by: actorUserId,
  }).select('id').single()
  if (error || !data) redirect(`/admin/formulas?error=${encodeURIComponent('No fue posible guardar la nueva versión')}`)

  await audit(adminClient, actorUserId, {
    action: 'crear_borrador',
    entityId: data.id,
    metadata: { formula_code: definition.code, version: nextVersion, effective_from: effectiveFrom, reason },
  })
  revalidatePath('/admin/formulas')
  redirect(`/admin/formulas?message=${encodeURIComponent(`Borrador v${nextVersion} guardado para ${definition.name}.`)}#formula-${formulaId}`)
}

export async function probarFormula(formData: FormData) {
  await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones', 'Cobranza', 'Lectura'])
  const formulaId = clean(formData.get('formula_id'), 40)
  const expression = clean(formData.get('expression'), 4000).toUpperCase()
  const rawInputs = clean(formData.get('inputs'), 12000)
  if (!UUID_PATTERN.test(formulaId)) redirect('/admin/formulas?error=Fórmula inválida')

  let inputs: Record<string, number> = {}
  try {
    const parsed = JSON.parse(rawInputs || '{}') as Record<string, unknown>
    inputs = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key.toUpperCase(), Number(value)]))
    if (Object.values(inputs).some((value) => !Number.isFinite(value))) throw new Error('Los valores de prueba deben ser numéricos.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON de prueba inválido'
    redirect(`/admin/formulas?error=${encodeURIComponent(message)}#formula-${formulaId}`)
  }

  try {
    const result = evaluateFormula(expression, inputs)
    redirect(`/admin/formulas?test_formula=${formulaId}&test_result=${encodeURIComponent(String(result))}#formula-${formulaId}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible evaluar la fórmula'
    redirect(`/admin/formulas?error=${encodeURIComponent(message)}#formula-${formulaId}`)
  }
}

export async function publicarVersionFormula(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador'])
  const versionId = clean(formData.get('version_id'), 40)
  if (!UUID_PATTERN.test(versionId)) redirect('/admin/formulas?error=Versión inválida')

  const { data: version, error: versionError } = await adminClient
    .from('formula_versions')
    .select('id, formula_id, version, expression, status, effective_from, formula:formula_definitions(code, name, variables)')
    .eq('id', versionId)
    .single()
  if (versionError || !version) redirect('/admin/formulas?error=Versión no disponible')

  const relation = version.formula as unknown as { code: string; name: string; variables: VariableDefinition[] } | Array<{ code: string; name: string; variables: VariableDefinition[] }> | null
  const definition = Array.isArray(relation) ? relation[0] : relation
  if (!definition) redirect('/admin/formulas?error=Definición de fórmula no disponible')

  try {
    validateFormulaExpression(version.expression, variableCodes(definition.variables))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Expresión inválida'
    redirect(`/admin/formulas?error=${encodeURIComponent(message)}#formula-${version.formula_id}`)
  }

  const { error: publishError } = await adminClient.rpc('publicar_version_formula', {
    p_version_id: versionId,
    p_actor_user_id: actorUserId,
  })

  if (publishError) {
    const message = publishError.message.includes('EFFECTIVE_DATE_MUST_FOLLOW_CURRENT_VERSION')
      ? 'La nueva fecha de vigencia debe ser posterior al inicio de la versión publicada actual.'
      : 'No fue posible publicar la versión de manera segura.'
    console.error('FORMULA_ATOMIC_PUBLISH_FAILED', publishError.message)
    redirect(`/admin/formulas?error=${encodeURIComponent(message)}#formula-${version.formula_id}`)
  }

  await audit(adminClient, actorUserId, {
    action: 'publicar',
    entityId: versionId,
    metadata: { formula_code: definition.code, version: version.version, effective_from: version.effective_from },
  })
  revalidatePath('/admin/formulas')
  redirect(`/admin/formulas?message=${encodeURIComponent(`Versión ${version.version} publicada para ${definition.name}.`)}#formula-${version.formula_id}`)
}
