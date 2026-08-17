'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { evaluateFormula, validateFormulaExpression } from '@/lib/formula-engine'
import {
  buildFriendlyRuleExpression,
  friendlyInputName,
  friendlyInputToEngineValue,
  type FormulaVariableDefinition,
} from '@/lib/formula-friendly'
import { requireAdmin } from '@/utils/supabase/require-admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

type VariableDefinition = FormulaVariableDefinition

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>['adminClient']

function variableCodes(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => item && typeof item === 'object' ? String((item as VariableDefinition).code ?? '').trim().toUpperCase() : '')
    .filter(Boolean)
}

function variableDefinitions(value: unknown): VariableDefinition[] {
  if (!Array.isArray(value)) return []
  const result: VariableDefinition[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const source = item as VariableDefinition
    const code = String(source.code ?? '').trim().toUpperCase()
    if (!code) continue
    const description = String(source.description ?? '').trim()
    result.push(description ? { code, description } : { code })
  }
  return result
}

async function loadFormula(adminClient: AdminClient, formulaId: string) {
  const { data, error } = await adminClient
    .from('formula_definitions')
    .select('id, code, name, variables, default_expression, active')
    .eq('id', formulaId)
    .single()
  if (error || !data || !data.active) throw new Error('FORMULA_NOT_FOUND')
  return data
}

async function loadCurrentExpression(adminClient: AdminClient, formulaId: string, fallback: string) {
  const { data, error } = await adminClient
    .from('formula_versions')
    .select('expression')
    .eq('formula_id', formulaId)
    .eq('status', 'Publicada')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('FORMULA_VERSION_NOT_AVAILABLE')
  return String(data?.expression ?? fallback).trim().toUpperCase()
}

async function loadVersionExpression(adminClient: AdminClient, formulaId: string, versionId: string | null, fallback: string) {
  if (!versionId || !UUID_PATTERN.test(versionId)) return loadCurrentExpression(adminClient, formulaId, fallback)
  const { data, error } = await adminClient
    .from('formula_versions')
    .select('expression')
    .eq('id', versionId)
    .eq('formula_id', formulaId)
    .maybeSingle()
  if (error || !data) throw new Error('FORMULA_VERSION_NOT_AVAILABLE')
  return String(data.expression).trim().toUpperCase()
}

async function audit(
  adminClient: AdminClient,
  actorUserId: string,
  input: { action: string; entityId: string; metadata?: Record<string, unknown> },
) {
  const { error } = await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    accion: input.action,
    entidad: 'formula_calculo',
    entidad_id: input.entityId,
    module: 'Remuneraciones',
    description: input.action === 'publicar' ? 'Publicación de fórmula de cálculo' : 'Edición guiada de fórmula de cálculo',
    metadata: input.metadata ?? {},
  })
  if (error) console.error('FORMULA_AUDIT_FAILED', error.message)
}

export async function guardarBorradorFormula(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador'])
  const formulaId = clean(formData.get('formula_id'), 40)
  const reason = clean(formData.get('change_reason'), 1000)
  const effectiveFrom = clean(formData.get('effective_from'), 10)

  if (!UUID_PATTERN.test(formulaId)) redirect('/admin/formulas?error=Fórmula inválida')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) redirect('/admin/formulas?error=Indique una fecha de vigencia válida')
  if (!reason) redirect('/admin/formulas?error=Indique el motivo del cambio')

  const definition = await loadFormula(adminClient, formulaId)
  const currentExpression = await loadCurrentExpression(adminClient, formulaId, definition.default_expression)
  const values = Object.fromEntries(
    [...formData.entries()]
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, value]) => [key, value.trim()]),
  )

  let expression = ''
  try {
    expression = buildFriendlyRuleExpression(definition.code, currentExpression, values)
    validateFormulaExpression(expression, variableCodes(definition.variables))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'La configuración ingresada no es válida.'
    redirect(`/admin/formulas?error=${encodeURIComponent(message)}#formula-${formulaId}`)
  }

  if (expression === currentExpression) {
    redirect(`/admin/formulas?error=${encodeURIComponent('No se detectaron cambios respecto de la regla vigente.')}#formula-${formulaId}`)
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
    metadata: {
      formula_code: definition.code,
      version: nextVersion,
      effective_from: effectiveFrom,
      reason,
      editor: 'no-code',
    },
  })
  revalidatePath('/admin/formulas')
  redirect(`/admin/formulas?message=${encodeURIComponent(`Borrador v${nextVersion} guardado para ${definition.name}. Puede revisarlo y simularlo antes de publicar.`)}&preview_version=${data.id}#formula-${formulaId}`)
}

export async function probarFormula(formData: FormData) {
  const { adminClient } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones', 'Cobranza', 'Lectura'])
  const formulaId = clean(formData.get('formula_id'), 40)
  const versionId = clean(formData.get('version_id'), 40) || null
  if (!UUID_PATTERN.test(formulaId)) redirect('/admin/formulas?error=Fórmula inválida')

  const definition = await loadFormula(adminClient, formulaId)
  const variables = variableDefinitions(definition.variables)
  let expression = ''
  let inputs: Record<string, number> = {}

  try {
    expression = await loadVersionExpression(adminClient, formulaId, versionId, definition.default_expression)
    inputs = Object.fromEntries(variables.map((variable) => {
      const raw = clean(formData.get(friendlyInputName(variable.code)), 80)
      return [variable.code, friendlyInputToEngineValue(variable, raw)]
    }))
    validateFormulaExpression(expression, variables.map((item) => item.code))
    const result = evaluateFormula(expression, inputs)
    const preview = versionId ? `&preview_version=${encodeURIComponent(versionId)}` : ''
    redirect(`/admin/formulas?test_formula=${formulaId}&test_result=${encodeURIComponent(String(result))}${preview}#formula-${formulaId}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible evaluar la regla de cálculo.'
    const preview = versionId ? `&preview_version=${encodeURIComponent(versionId)}` : ''
    redirect(`/admin/formulas?error=${encodeURIComponent(message)}${preview}#formula-${formulaId}`)
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
    const message = error instanceof Error ? error.message : 'La configuración de esta versión no es válida.'
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
    metadata: { formula_code: definition.code, version: version.version, effective_from: version.effective_from, editor: 'no-code' },
  })
  revalidatePath('/admin/formulas')
  redirect(`/admin/formulas?message=${encodeURIComponent(`Versión ${version.version} publicada para ${definition.name}.`)}#formula-${version.formula_id}`)
}
