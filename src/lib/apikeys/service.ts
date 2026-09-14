import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { ApiKey } from '@prisma/client'
import { db } from '@/lib/db/prisma'
import { AppError } from '@/lib/utils/errors'

/**
 * Developer API keys. The plaintext is generated with CSPRNG bytes, shown to
 * the user exactly once, and only its SHA-256 is stored. Lookups hash the
 * presented key and compare against the unique index.
 */
export interface ApiKeyDTO {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export function toDTO(k: ApiKey): ApiKeyDTO {
  return { id: k.id, name: k.name, keyPrefix: k.keyPrefix, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null, revokedAt: k.revokedAt?.toISOString() ?? null }
}

export async function listApiKeys(userId: string): Promise<ApiKeyDTO[]> {
  const rows = await db().apiKey.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return rows.map(toDTO)
}

export async function createApiKey(userId: string, walletAddress: string, name: string): Promise<{ key: ApiKeyDTO; secret: string }> {
  const active = await db().apiKey.count({ where: { userId, revokedAt: null } })
  if (active >= 10) throw new AppError('CONFLICT', 'Maximum of 10 active API keys. Revoke one first.')
  const secret = `lz_live_${randomBytes(24).toString('base64url')}`
  const row = await db().apiKey.create({ data: { userId, walletAddress, name, hashedKey: sha256(secret), keyPrefix: secret.slice(0, 12) } })
  return { key: toDTO(row), secret }
}

export async function revokeApiKey(userId: string, id: string): Promise<ApiKeyDTO> {
  const k = await db().apiKey.findFirst({ where: { id, userId } })
  if (!k) throw new AppError('NOT_FOUND', 'API key not found.')
  if (k.revokedAt) return toDTO(k)
  return toDTO(await db().apiKey.update({ where: { id }, data: { revokedAt: new Date() } }))
}

/** Resolves a Bearer key to its owner. Throws UNAUTHORIZED for unknown/revoked keys. */
export async function authenticateApiKey(req: Request): Promise<{ apiKey: ApiKey; userId: string; walletAddress: `0x${string}` }> {
  const auth = req.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(lz_live_[A-Za-z0-9_-]{20,})$/.exec(auth)
  if (!m) throw new AppError('UNAUTHORIZED', 'Missing or malformed Authorization: Bearer <api key>.')
  const key = await db().apiKey.findUnique({ where: { hashedKey: sha256(m[1]) } })
  if (!key || key.revokedAt) throw new AppError('UNAUTHORIZED', 'Invalid or revoked API key.')
  await db().apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined)
  return { apiKey: key, userId: key.userId, walletAddress: key.walletAddress as `0x${string}` }
}
