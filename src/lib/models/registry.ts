import 'server-only'
import type { ModelRegistry, ModelStatus } from '@prisma/client'
import { db, hasDatabase } from '@/lib/db/prisma'
import { getProvider, providerSummary } from '@/lib/providers'
import { modelSeeds, type ModelSeed } from '@/config/models'
import { AppError } from '@/lib/utils/errors'

/**
 * Model registry: catalogue rows in Postgres (seeded from /config/models.ts)
 * plus a runtime health check against the configured provider. Status is
 * never asserted from config — it is what the provider answered, or
 * "not_configured" when there is nothing to ask.
 */
export type EndpointStatus = 'online' | 'offline' | 'maintenance' | 'not_configured' | 'unknown'

export interface ModelView {
  id: string
  name: string
  type: string
  publisher: string
  provider: string
  architecture: string
  contextLength: number
  pricePerMillionTokens: string
  creditsPerMillionTokens: string
  holderAccess: boolean
  enabled: boolean
  status: ModelStatus
  endpointStatus: EndpointStatus
  endpointModel: string
  requirements: string
  license: string
  lastCheckedAt: string | null
  lastError: string | null
}

export interface RegistryStatus {
  provider: ReturnType<typeof providerSummary>
  checkedAt: string | null
  database: boolean
  models: ModelView[]
  error?: string
}

const seedById = new Map(modelSeeds.map((m) => [m.id, m]))

/** Which provider-side id (canonical, alias, or registry id) the provider actually lists. */
function matchAvailable(available: Set<string>, id: string, endpointModel: string, seed?: ModelSeed): string | null {
  const candidates = [endpointModel, id, seed?.endpointModel ?? '', ...(seed?.aliases ?? [])].filter(Boolean)
  for (const c of candidates) if (available.has(c.toLowerCase())) return c
  return null
}
let seeded = false
let statusCache: { value: RegistryStatus; at: number } | null = null
const STATUS_TTL_MS = 60_000

export async function ensureRegistrySeeded(): Promise<void> {
  if (seeded || !hasDatabase()) return
  const prisma = db()
  await prisma.$transaction(
    modelSeeds.map((m) =>
      prisma.modelRegistry.upsert({
        where: { id: m.id },
        create: { id: m.id, name: m.name, type: m.type, provider: m.publisher, architecture: m.architecture, contextLength: m.contextLength, pricePerMillionTokens: m.pricePerMillionTokens, creditsPerMillionTokens: m.creditsPerMillionTokens, holderAccess: m.holderAccess, endpointModel: m.endpointModel },
        // Catalogue facts refresh; admin-owned fields (enabled, credits, status) are preserved.
        update: { name: m.name, type: m.type, provider: m.publisher, architecture: m.architecture, contextLength: m.contextLength, pricePerMillionTokens: m.pricePerMillionTokens, endpointModel: m.endpointModel },
      }),
    ),
  )
  seeded = true
}

function toView(row: ModelRegistry | null, seed: ModelSeed | undefined, endpointStatus: EndpointStatus): ModelView {
  const s = seed ?? seedById.get(row?.id ?? '')
  return {
    id: row?.id ?? s!.id,
    name: row?.name ?? s!.name,
    type: row?.type ?? s!.type,
    publisher: row?.provider ?? s!.publisher,
    provider: providerSummary().id,
    architecture: row?.architecture ?? s!.architecture,
    contextLength: row?.contextLength ?? s!.contextLength,
    pricePerMillionTokens: (row?.pricePerMillionTokens ?? s!.pricePerMillionTokens).toString(),
    creditsPerMillionTokens: (row?.creditsPerMillionTokens ?? s!.creditsPerMillionTokens).toString(),
    holderAccess: row?.holderAccess ?? s!.holderAccess,
    enabled: row?.enabled ?? true,
    status: row?.status ?? 'OFFLINE',
    endpointStatus,
    endpointModel: row?.endpointModel ?? s?.endpointModel ?? row?.id ?? '',
    requirements: s?.requirements ?? '',
    license: s?.license ?? '',
    lastCheckedAt: row?.lastCheckedAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
  }
}

/** Catalogue without a health check (fast; used by pages that only need metadata). */
export async function listModels(): Promise<ModelView[]> {
  if (!hasDatabase()) return modelSeeds.map((s) => toView(null, s, getProvider() ? 'unknown' : 'not_configured'))
  await ensureRegistrySeeded()
  const rows = await db().modelRegistry.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] })
  return rows.map((r) => toView(r, seedById.get(r.id), r.status === 'MAINTENANCE' ? 'maintenance' : !getProvider() ? 'not_configured' : r.lastCheckedAt ? (r.status === 'ONLINE' ? 'online' : 'offline') : 'unknown'))
}

/** Runs the provider health check and persists ONLINE/OFFLINE per model. Cached for 60 s. */
export async function checkModelStatuses(force = false): Promise<RegistryStatus> {
  if (!force && statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) return statusCache.value
  const provider = getProvider()
  const summary = providerSummary()
  const database = hasDatabase()

  if (!provider) {
    const models = await listModels()
    const value: RegistryStatus = { provider: summary, checkedAt: null, database, models: models.map((m) => ({ ...m, endpointStatus: m.status === 'MAINTENANCE' ? 'maintenance' : 'not_configured' })) }
    statusCache = { value, at: Date.now() }
    return value
  }

  let available: Set<string> | null = null
  let error: string | undefined
  try {
    const list = await provider.getAvailableModels()
    available = new Set(list.flatMap((m) => [m.id.toLowerCase(), m.id.toLowerCase().split('/').pop() ?? '']))
  } catch (e) {
    error = (e instanceof Error ? e.message : String(e)).slice(0, 200)
  }
  const checkedAt = new Date()

  if (!database) {
    const models = modelSeeds.map((s) => {
      const hit = available ? matchAvailable(available, s.id, s.endpointModel, s) : null
      const v = toView(null, s, hit ? 'online' : 'offline')
      return hit ? { ...v, endpointModel: hit } : v
    })
    const value: RegistryStatus = { provider: summary, checkedAt: checkedAt.toISOString(), database, models, error }
    statusCache = { value, at: Date.now() }
    return value
  }

  await ensureRegistrySeeded()
  const prisma = db()
  const rows = await prisma.modelRegistry.findMany()
  const updates = rows.map((r) => {
    if (r.status === 'MAINTENANCE') return prisma.modelRegistry.update({ where: { id: r.id }, data: { lastCheckedAt: checkedAt } })
    const hit = available ? matchAvailable(available, r.id, r.endpointModel ?? r.id, seedById.get(r.id)) : null
    return prisma.modelRegistry.update({ where: { id: r.id }, data: { status: hit ? 'ONLINE' : 'OFFLINE', endpointModel: hit ?? r.endpointModel, lastCheckedAt: checkedAt, lastError: hit ? null : error ?? 'Model not listed by provider' } })
  })
  await prisma.$transaction(updates)
  const fresh = await prisma.modelRegistry.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] })
  const models = fresh.map((r) => toView(r, seedById.get(r.id), r.status === 'MAINTENANCE' ? 'maintenance' : r.status === 'ONLINE' ? 'online' : 'offline'))
  const value: RegistryStatus = { provider: summary, checkedAt: checkedAt.toISOString(), database, models, error }
  statusCache = { value, at: Date.now() }
  return value
}

/** Loads one runnable model (enabled, not in maintenance). */
export async function getRunnableModel(id: string, holder: boolean): Promise<ModelView> {
  const models = await listModels()
  const m = models.find((x) => x.id === id)
  if (!m) throw new AppError('NOT_FOUND', `Unknown model "${id}".`)
  if (!m.enabled) throw new AppError('MODEL_UNAVAILABLE', `${m.name} is disabled by protocol configuration.`)
  if (m.status === 'MAINTENANCE') throw new AppError('MODEL_UNAVAILABLE', `${m.name} is in maintenance.`)
  if (holder && !m.holderAccess) throw new AppError('FORBIDDEN', `${m.name} is not available to holder credits.`)
  return m
}

export interface AdminModelPatch {
  enabled?: boolean
  status?: ModelStatus
  creditsPerMillionTokens?: string
  holderAccess?: boolean
}

export async function updateModelAdmin(id: string, patch: AdminModelPatch): Promise<ModelView> {
  await ensureRegistrySeeded()
  const data: Record<string, unknown> = {}
  if (patch.enabled !== undefined) data.enabled = patch.enabled
  if (patch.status !== undefined) data.status = patch.status
  if (patch.holderAccess !== undefined) data.holderAccess = patch.holderAccess
  if (patch.creditsPerMillionTokens !== undefined) data.creditsPerMillionTokens = BigInt(patch.creditsPerMillionTokens)
  const row = await db().modelRegistry.update({ where: { id }, data })
  statusCache = null
  return toView(row, seedById.get(row.id), row.status === 'MAINTENANCE' ? 'maintenance' : row.status === 'ONLINE' ? 'online' : 'offline')
}
