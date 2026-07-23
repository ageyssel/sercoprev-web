import 'server-only'

import { cookies, headers } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendStaffMfaEmail } from '@/lib/staff-mfa-email'
import {
  STAFF_MFA_CHALLENGE_COOKIE,
  STAFF_MFA_CHALLENGE_SECONDS,
  STAFF_MFA_CODE_DIGITS,
  STAFF_MFA_COOKIE,
  STAFF_MFA_MAX_ATTEMPTS,
  STAFF_MFA_SESSION_SECONDS,
  createSignedStaffMfaToken,
  hashChallengeToken,
  hashIpAddress,
  hashTrustedToken,
  hashVerificationCode,
  randomNumericCode,
  randomOpaqueToken,
  userAgentHash,
  verifySignedStaffMfaToken,
} from '@/lib/staff-mfa-token'

const RESEND_COOLDOWN_SECONDS = 60
const MAX_CODES_PER_HOUR = 5

type ChallengeRow = {
  id: string
  user_id: string
  email: string
  code_hash: string
  challenge_token_hash: string
  user_agent_hash: string
  attempts: number
  max_attempts: number
  expires_at: string
  consumed_at: string | null
  created_at: string
  last_sent_at: string
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return mismatch === 0
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  }
}

async function requestFingerprint() {
  const requestHeaders = await headers()
  const userAgent = requestHeaders.get('user-agent')
  const forwarded = requestHeaders.get('cf-connecting-ip')
    || requestHeaders.get('x-real-ip')
    || requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
    || null
  return {
    userAgent,
    userAgentHash: await userAgentHash(userAgent),
    ipHash: await hashIpAddress(forwarded),
  }
}

async function audit(input: {
  userId: string
  action: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await createAdminClient().from('auditoria_eventos').insert({
      actor_user_id: input.userId,
      empresa_id: null,
      accion: input.action,
      entidad: 'staff_email_mfa',
      entidad_id: input.entityId ?? input.userId,
      metadata: input.metadata ?? {},
    })
  } catch (error) {
    console.error('STAFF_MFA_AUDIT_FAILED', error)
  }
}

async function clearExpiredRecords() {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const old = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  await Promise.all([
    admin.from('staff_mfa_challenges').delete().lt('expires_at', old),
    admin.from('staff_mfa_sessions').delete().lt('expires_at', old),
    admin.from('staff_mfa_sessions').update({ revoked_at: now }).is('revoked_at', null).lt('expires_at', now),
  ])
}

export function maskStaffEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'correo registrado'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`
}

export async function isCurrentStaffMfaVerified(userId: string, requireDatabase = true) {
  const cookieStore = await cookies()
  const token = cookieStore.get(STAFF_MFA_COOKIE)?.value
  const requestHeaders = await headers()
  const payload = await verifySignedStaffMfaToken(token, userId, requestHeaders.get('user-agent'))
  if (!payload || !token) return false
  if (!requireDatabase) return true

  const fingerprint = await requestFingerprint()
  const tokenHash = await hashTrustedToken(token)
  const { data, error } = await createAdminClient()
    .from('staff_mfa_sessions')
    .select('id')
    .eq('id', payload.sid)
    .eq('user_id', userId)
    .eq('token_hash', tokenHash)
    .eq('user_agent_hash', fingerprint.userAgentHash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  return !error && Boolean(data)
}

export async function startStaffMfaChallenge(input: {
  userId: string
  email: string
  displayName: string
}) {
  await clearExpiredRecords()
  const admin = createAdminClient()
  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const cookieStore = await cookies()
  const fingerprint = await requestFingerprint()

  const { data: recent, count, error: recentError } = await admin
    .from('staff_mfa_challenges')
    .select('id, last_sent_at', { count: 'exact' })
    .eq('user_id', input.userId)
    .gte('created_at', hourAgo)
    .order('created_at', { ascending: false })
    .limit(MAX_CODES_PER_HOUR)

  if (recentError) throw recentError
  const latestSentAt = recent?.[0]?.last_sent_at ? new Date(recent[0].last_sent_at).getTime() : 0
  if ((count ?? 0) >= MAX_CODES_PER_HOUR) throw new Error('STAFF_MFA_RATE_LIMIT_HOURLY')
  if (latestSentAt > now.getTime() - RESEND_COOLDOWN_SECONDS * 1000) throw new Error('STAFF_MFA_RATE_LIMIT_COOLDOWN')

  await admin
    .from('staff_mfa_challenges')
    .update({ consumed_at: now.toISOString() })
    .eq('user_id', input.userId)
    .is('consumed_at', null)

  const challengeId = crypto.randomUUID()
  const challengeToken = randomOpaqueToken()
  const code = randomNumericCode()
  const expiresAt = new Date(now.getTime() + STAFF_MFA_CHALLENGE_SECONDS * 1000)
  const row = {
    id: challengeId,
    user_id: input.userId,
    email: input.email,
    code_hash: await hashVerificationCode(challengeId, code),
    challenge_token_hash: await hashChallengeToken(challengeToken),
    user_agent_hash: fingerprint.userAgentHash,
    ip_hash: fingerprint.ipHash,
    attempts: 0,
    max_attempts: STAFF_MFA_MAX_ATTEMPTS,
    expires_at: expiresAt.toISOString(),
    consumed_at: null,
    created_at: now.toISOString(),
    last_sent_at: now.toISOString(),
  }

  const { error: insertError } = await admin.from('staff_mfa_challenges').insert(row)
  if (insertError) throw insertError

  try {
    await sendStaffMfaEmail({
      challengeId,
      userId: input.userId,
      email: input.email,
      displayName: input.displayName,
      code,
      expiresMinutes: Math.floor(STAFF_MFA_CHALLENGE_SECONDS / 60),
    })
  } catch (error) {
    await admin.from('staff_mfa_challenges').delete().eq('id', challengeId)
    throw error
  }

  cookieStore.set(STAFF_MFA_CHALLENGE_COOKIE, challengeToken, cookieOptions(STAFF_MFA_CHALLENGE_SECONDS))
  await audit({
    userId: input.userId,
    action: 'mfa_codigo_enviado',
    entityId: challengeId,
    metadata: { email_masked: maskStaffEmail(input.email), expires_at: expiresAt.toISOString() },
  })

  return { challengeId, expiresAt, codeDigits: STAFF_MFA_CODE_DIGITS }
}

export async function getPendingStaffMfaChallenge(userId: string) {
  const cookieStore = await cookies()
  const challengeToken = cookieStore.get(STAFF_MFA_CHALLENGE_COOKIE)?.value
  if (!challengeToken) return null

  const fingerprint = await requestFingerprint()
  const { data, error } = await createAdminClient()
    .from('staff_mfa_challenges')
    .select('id, user_id, email, code_hash, challenge_token_hash, user_agent_hash, attempts, max_attempts, expires_at, consumed_at, created_at, last_sent_at')
    .eq('user_id', userId)
    .eq('challenge_token_hash', await hashChallengeToken(challengeToken))
    .eq('user_agent_hash', fingerprint.userAgentHash)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !data) return null
  return data as ChallengeRow
}

async function createTrustedSession(userId: string) {
  const admin = createAdminClient()
  const cookieStore = await cookies()
  const fingerprint = await requestFingerprint()
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + STAFF_MFA_SESSION_SECONDS * 1000)
  const token = await createSignedStaffMfaToken({
    sessionId,
    userId,
    expiresAt,
    userAgent: fingerprint.userAgent,
  })

  await admin
    .from('staff_mfa_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('user_agent_hash', fingerprint.userAgentHash)
    .is('revoked_at', null)

  const { error } = await admin.from('staff_mfa_sessions').insert({
    id: sessionId,
    user_id: userId,
    token_hash: await hashTrustedToken(token),
    user_agent_hash: fingerprint.userAgentHash,
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  })
  if (error) throw error

  cookieStore.set(STAFF_MFA_COOKIE, token, cookieOptions(STAFF_MFA_SESSION_SECONDS))
  cookieStore.delete(STAFF_MFA_CHALLENGE_COOKIE)
  return { sessionId, expiresAt }
}

export async function verifyStaffMfaCode(userId: string, rawCode: string) {
  const code = rawCode.replace(/\D/g, '').slice(0, STAFF_MFA_CODE_DIGITS)
  if (code.length !== STAFF_MFA_CODE_DIGITS) return { ok: false as const, reason: 'invalid' as const, remaining: null }

  const admin = createAdminClient()
  const challenge = await getPendingStaffMfaChallenge(userId)
  if (!challenge) return { ok: false as const, reason: 'expired' as const, remaining: null }
  if (challenge.attempts >= challenge.max_attempts) return { ok: false as const, reason: 'locked' as const, remaining: 0 }

  const expectedHash = await hashVerificationCode(challenge.id, code)
  if (!constantTimeEqual(challenge.code_hash, expectedHash)) {
    const attempts = challenge.attempts + 1
    const locked = attempts >= challenge.max_attempts
    await admin.from('staff_mfa_challenges').update({
      attempts,
      consumed_at: locked ? new Date().toISOString() : null,
    }).eq('id', challenge.id)
    await audit({
      userId,
      action: locked ? 'mfa_codigo_bloqueado' : 'mfa_codigo_incorrecto',
      entityId: challenge.id,
      metadata: { attempts, remaining: Math.max(0, challenge.max_attempts - attempts) },
    })
    return { ok: false as const, reason: locked ? 'locked' as const : 'invalid' as const, remaining: Math.max(0, challenge.max_attempts - attempts) }
  }

  const consumedAt = new Date().toISOString()
  const { error: consumeError } = await admin
    .from('staff_mfa_challenges')
    .update({ consumed_at: consumedAt })
    .eq('id', challenge.id)
    .is('consumed_at', null)
  if (consumeError) throw consumeError

  const trusted = await createTrustedSession(userId)
  await audit({
    userId,
    action: 'mfa_verificado',
    entityId: trusted.sessionId,
    metadata: { challenge_id: challenge.id, expires_at: trusted.expiresAt.toISOString() },
  })
  return { ok: true as const, expiresAt: trusted.expiresAt }
}

export async function revokeCurrentStaffMfaSession(userId: string | null | undefined) {
  const cookieStore = await cookies()
  const token = cookieStore.get(STAFF_MFA_COOKIE)?.value
  const requestHeaders = await headers()
  if (token && userId) {
    const payload = await verifySignedStaffMfaToken(token, userId, requestHeaders.get('user-agent'))
    if (payload) {
      await createAdminClient().from('staff_mfa_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', payload.sid).eq('user_id', userId)
      await audit({ userId, action: 'mfa_sesion_revocada', entityId: payload.sid })
    }
  }
  cookieStore.delete(STAFF_MFA_COOKIE)
  cookieStore.delete(STAFF_MFA_CHALLENGE_COOKIE)
}

export async function clearPendingStaffMfaChallenge(userId?: string | null) {
  const cookieStore = await cookies()
  const token = cookieStore.get(STAFF_MFA_CHALLENGE_COOKIE)?.value
  if (token && userId) {
    await createAdminClient().from('staff_mfa_challenges').update({ consumed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('challenge_token_hash', await hashChallengeToken(token))
      .is('consumed_at', null)
  }
  cookieStore.delete(STAFF_MFA_CHALLENGE_COOKIE)
}
