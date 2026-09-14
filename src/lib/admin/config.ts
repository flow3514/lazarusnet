import 'server-only'
import { z } from 'zod'
import { db, hasDatabase } from '@/lib/db/prisma'
import { creditEpoch, holderTiers, treasuryAllocationBps, type EpochUnit, type HolderTier } from '@/config/tokenomics'

/**
 * Runtime protocol configuration. Defaults live in /config/tokenomics.ts;
 * admin wallets override them here (ProtocolConfig table). Reads are cached
 * for 30 s; writes invalidate the cache.
 */
export interface ProtocolSettings {
  holderTiers: HolderTier[]
  epochUnit: EpochUnit
  treasuryAllocationBps: number
  /** Informational: which provider adapter the admin intends to be active. The actual adapter is chosen by GPU_PROVIDER. */
  preferredProvider: string
  /** Runtime overrides for the contract addresses (env wins when set). Empty = not configured. */
  tokenContract: string
  treasuryContract: string
  source: 'defaults' | 'database'
  updatedAt: string | null
}

const tierSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,32}$/),
  name: z.string().min(1).max(40),
  minBalance: z.string().regex(/^\d+(\.\d+)?$/),
  creditsPerEpoch: z.string().regex(/^\d+(\.\d+)?$/),
  description: z.string().max(200).default(''),
})

export const settingsPatchSchema = z.object({
  holderTiers: z.array(tierSchema).min(1).max(8).optional(),
  epochUnit: z.enum(['day', 'week', 'month']).optional(),
  treasuryAllocationBps: z.number().int().min(0).max(10_000).optional(),
  preferredProvider: z.enum(['openai-compatible', 'ollama', 'mock', '']).optional(),
  tokenContract: z.string().regex(/^(0x[0-9a-fA-F]{40})?$/).optional(),
  treasuryContract: z.string().regex(/^(0x[0-9a-fA-F]{40})?$/).optional(),
})
export type SettingsPatch = z.infer<typeof settingsPatchSchema>

const DEFAULTS: ProtocolSettings = { holderTiers, epochUnit: creditEpoch.unit, treasuryAllocationBps, preferredProvider: '', tokenContract: '', treasuryContract: '', source: 'defaults', updatedAt: null }

let cache: { value: ProtocolSettings; at: number } | null = null

export async function getProtocolSettings(): Promise<ProtocolSettings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value
  if (!hasDatabase()) return DEFAULTS
  try {
    const rows = await db().protocolConfig.findMany()
    if (rows.length === 0) return DEFAULTS
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>
    const parsed = settingsPatchSchema.safeParse(byKey)
    const patch = parsed.success ? parsed.data : {}
    const updatedAt = rows.reduce((m, r) => (r.updatedAt > m ? r.updatedAt : m), rows[0].updatedAt)
    const value: ProtocolSettings = { ...DEFAULTS, ...patch, source: 'database', updatedAt: updatedAt.toISOString() }
    cache = { value, at: Date.now() }
    return value
  } catch {
    return DEFAULTS
  }
}

export async function updateProtocolSettings(patch: SettingsPatch, actor: string): Promise<ProtocolSettings> {
  const prisma = db()
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined)
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.protocolConfig.upsert({ where: { key }, create: { key, value: value as object, updatedBy: actor }, update: { value: value as object, updatedBy: actor } }),
    ),
  )
  cache = null
  return getProtocolSettings()
}

export type ContractSource = 'env' | 'admin' | null

/** Effective contract addresses: NEXT_PUBLIC_* env first, then the admin-set override. */
export async function resolveContracts(): Promise<{ token: `0x${string}` | null; treasury: `0x${string}` | null; source: { token: ContractSource; treasury: ContractSource } }> {
  const { publicChain } = await import('@/lib/utils/public-env')
  const s = await getProtocolSettings()
  const token = (publicChain.tokenContract || s.tokenContract || null) as `0x${string}` | null
  const treasury = (publicChain.treasuryContract || s.treasuryContract || null) as `0x${string}` | null
  return { token, treasury, source: { token: publicChain.tokenContract ? 'env' : s.tokenContract ? 'admin' : null, treasury: publicChain.treasuryContract ? 'env' : s.treasuryContract ? 'admin' : null } }
}
