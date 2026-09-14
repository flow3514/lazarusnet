import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { env, hasAuthSecret } from '@/lib/utils/env'
import { AppError } from '@/lib/utils/errors'

/**
 * Stateless session: an HMAC-SHA256-signed cookie carrying the checksummed
 * wallet address and the user id. Only the server can mint it (after a
 * verified wallet signature), so route handlers trust `session.address` and
 * never the address the browser sends in a body.
 */
export const SESSION_COOKIE = 'lz_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface Session {
  address: `0x${string}`
  userId: string
  iat: number
  exp: number
}

function secret(): string {
  if (!hasAuthSecret()) throw new AppError('INTERNAL', 'AUTH_SECRET is not configured (32+ random characters).')
  return env.authSecret
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url')
const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url')

export function encodeSession(s: Session): string {
  const payload = b64(JSON.stringify(s))
  return `${payload}.${sign(payload)}`
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  let expected: string
  try {
    expected = sign(payload)
  } catch {
    return null
  }
  const a = Buffer.from(sig), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session
    if (typeof s.address !== 'string' || typeof s.userId !== 'string' || typeof s.exp !== 'number') return null
    if (s.exp < Date.now()) return null
    return s
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies()
  return decodeSession(jar.get(SESSION_COOKIE)?.value)
}

export async function requireSession(): Promise<Session> {
  const s = await getSession()
  if (!s) throw new AppError('UNAUTHORIZED', 'Connect a wallet and sign in first.')
  return s
}

export async function setSession(address: `0x${string}`, userId: string): Promise<Session> {
  const now = Date.now()
  const s: Session = { address, userId, iat: now, exp: now + SESSION_TTL_MS }
  const jar = await cookies()
  jar.set(SESSION_COOKIE, encodeSession(s), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
  return s
}

export async function clearSession(): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: env.isProduction, path: '/', maxAge: 0 })
}
