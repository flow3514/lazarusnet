import 'server-only'
import { rpcHealth } from '@/lib/blockchain/client'
import { pingDatabase } from '@/lib/db/prisma'
import { getProvider, providerSummary } from '@/lib/providers'
import { publicChain } from '@/lib/utils/public-env'
import type { ProviderHealth } from '@/lib/providers/provider'

/**
 * Composite health. Each component is probed for real; the overall status is
 * derived from those probes and never asserted. Cached for 20 s so the navbar
 * poller does not hammer the RPC / provider.
 */
export type ComponentState = 'ok' | 'degraded' | 'down' | 'not_configured'
export type OverallState = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'NOT_CONFIGURED'

export interface HealthComponent {
  id: 'rpc' | 'provider' | 'database' | 'inference'
  label: string
  state: ComponentState
  latencyMs?: number
  detail?: string
}

export interface HealthReport {
  overall: OverallState
  label: 'NETWORK' | 'COMPUTE'
  components: HealthComponent[]
  developmentMode: boolean
  chainId: number
  blockNumber: string | null
  checkedAt: string
}

let cache: { value: HealthReport; at: number } | null = null
const TTL = 20_000

export async function getHealth(force = false): Promise<HealthReport> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.value
  const provider = getProvider()
  const [rpc, dbp, prov] = await Promise.all([rpcHealth(), pingDatabase(), provider ? provider.health() : Promise.resolve<ProviderHealth>({ ok: false, error: 'Compute provider not configured' })])

  const components: HealthComponent[] = [
    { id: 'rpc', label: 'RPC', state: !rpc.configured ? 'not_configured' : rpc.ok ? 'ok' : 'down', latencyMs: rpc.latencyMs, detail: rpc.error ?? (rpc.ok ? `chain ${rpc.chainId}, block ${rpc.blockNumber}` : undefined) },
    { id: 'provider', label: 'Provider', state: !provider ? 'not_configured' : prov.ok ? 'ok' : 'down', latencyMs: prov.latencyMs, detail: prov.error ?? (prov.ok ? `${providerSummary().label}, ${prov.modelCount ?? 0} model(s)` : undefined) },
    { id: 'database', label: 'Database', state: dbp.error === 'DATABASE_URL not configured' ? 'not_configured' : dbp.ok ? 'ok' : 'down', latencyMs: dbp.latencyMs, detail: dbp.error },
  ]
  const inferenceOk = prov.ok && dbp.ok
  components.push({
    id: 'inference',
    label: 'Inference API',
    state: !provider || components[2].state === 'not_configured' ? 'not_configured' : inferenceOk ? 'ok' : 'down',
    detail: inferenceOk ? 'POST /api/inference ready' : !provider ? 'Compute provider not configured' : !dbp.ok ? 'Database unavailable' : 'Provider unreachable',
  })

  const states = components.map((c) => c.state)
  const configured = states.filter((s) => s !== 'not_configured')
  let overall: OverallState
  if (configured.length === 0) overall = 'NOT_CONFIGURED'
  else if (states.every((s) => s === 'ok')) overall = 'ONLINE'
  else if (components[3].state === 'down' || (components[3].state === 'not_configured' && components[0].state !== 'ok')) overall = configured.some((s) => s === 'ok') ? 'DEGRADED' : 'OFFLINE'
  else overall = 'DEGRADED'

  const value: HealthReport = {
    overall,
    label: overall === 'ONLINE' || components[3].state === 'not_configured' ? 'NETWORK' : 'COMPUTE',
    components,
    developmentMode: provider?.developmentOnly === true,
    chainId: publicChain.id,
    blockNumber: rpc.blockNumber ?? null,
    checkedAt: new Date().toISOString(),
  }
  cache = { value, at: Date.now() }
  return value
}
