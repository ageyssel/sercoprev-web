export const STAFF_MFA_COOKIE = '__Host-sercoprev_staff_mfa'
export const STAFF_MFA_CHALLENGE_COOKIE = '__Host-sercoprev_staff_mfa_challenge'
export const STAFF_MFA_CODE_DIGITS = 8
export const STAFF_MFA_CHALLENGE_SECONDS = 10 * 60
export const STAFF_MFA_SESSION_SECONDS = 24 * 60 * 60
export const STAFF_MFA_MAX_ATTEMPTS = 5

export type StaffMfaTokenPayload = {
  v: 1
  sid: string
  uid: string
  exp: number
  ua: string
}

const encoder = new TextEncoder()

function signingSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!secret) throw new Error('STAFF_MFA_SIGNING_SECRET_UNAVAILABLE')
  return `sercoprev-staff-mfa-v1:${secret}`
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function userAgentHash(userAgent: string | null | undefined) {
  return sha256((userAgent ?? 'unknown').trim().toLowerCase().slice(0, 1000))
}

export async function hashIpAddress(ip: string | null | undefined) {
  if (!ip) return null
  return hmac(`ip:${ip.trim().slice(0, 128)}`)
}

export async function hashChallengeToken(token: string) {
  return hmac(`challenge-token:${token}`)
}

export async function hashVerificationCode(challengeId: string, code: string) {
  return hmac(`challenge-code:${challengeId}:${code}`)
}

export async function hashTrustedToken(token: string) {
  return hmac(`trusted-token:${token}`)
}

export function randomOpaqueToken(bytes = 32) {
  const value = new Uint8Array(bytes)
  crypto.getRandomValues(value)
  return bytesToBase64Url(value)
}

export function randomNumericCode() {
  const span = 90_000_000
  const limit = 4_294_967_296 - (4_294_967_296 % span)
  const value = new Uint32Array(1)
  do crypto.getRandomValues(value)
  while (value[0] >= limit)
  return String(10_000_000 + (value[0] % span))
}

export async function createSignedStaffMfaToken(input: {
  sessionId: string
  userId: string
  expiresAt: Date
  userAgent: string | null | undefined
}) {
  const payload: StaffMfaTokenPayload = {
    v: 1,
    sid: input.sessionId,
    uid: input.userId,
    exp: input.expiresAt.getTime(),
    ua: await userAgentHash(input.userAgent),
  }
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await hmac(`session:${encoded}`)
  return `${encoded}.${signature}`
}

export async function verifySignedStaffMfaToken(
  token: string | null | undefined,
  userId: string,
  userAgent: string | null | undefined,
): Promise<StaffMfaTokenPayload | null> {
  if (!token || token.length > 4096) return null
  const [encoded, suppliedSignature, extra] = token.split('.')
  if (!encoded || !suppliedSignature || extra) return null

  try {
    const expectedSignature = await hmac(`session:${encoded}`)
    if (!constantTimeEqual(suppliedSignature, expectedSignature)) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as Partial<StaffMfaTokenPayload>
    if (payload.v !== 1 || typeof payload.sid !== 'string' || typeof payload.uid !== 'string' || typeof payload.exp !== 'number' || typeof payload.ua !== 'string') return null
    if (payload.uid !== userId || payload.exp <= Date.now()) return null
    if (!constantTimeEqual(payload.ua, await userAgentHash(userAgent))) return null
    return payload as StaffMfaTokenPayload
  } catch {
    return null
  }
}
