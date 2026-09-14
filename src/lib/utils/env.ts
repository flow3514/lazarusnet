/**
 * Server-side environment access. Every setting is read here exactly once so
 * the rest of the codebase asks "is X configured?" instead of touching
 * process.env. Nothing here is imported by client components — the browser
 * gets its (public) values from `public-env.ts`.
 */
import { PUBLIC_ENV } from '@/lib/utils/public-env'

const read = (key: string): string => (process.env[key] ?? '').trim()

export type ProviderId = 'openai-compatible' | 'ollama' | 'mock' | ''

function providerId(): ProviderId {
  const v = read('GPU_PROVIDER').toLowerCase()
  if (v === 'openai-compatible' || v === 'openai' || v === 'vllm' || v === 'together' || v === 'fireworks') return 'openai-compatible'
  if (v === 'ollama') return 'ollama'
  if (v === 'mock' || v === 'development') return 'mock'
  if (!v && read('GPU_PROVIDER_ENDPOINT')) return 'openai-compatible'
  return ''
}

export const env = {
  isProduction: process.env.NODE_ENV === 'production',
  appUrl: PUBLIC_ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:10200',
  databaseUrl: read('DATABASE_URL'),
  authSecret: read('AUTH_SECRET'),
  adminWallets: read('ADMIN_WALLETS')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^0x[0-9a-f]{40}$/.test(s)),
  gpu: {
    provider: providerId(),
    apiKey: read('GPU_PROVIDER_API_KEY'),
    endpoint: read('GPU_PROVIDER_ENDPOINT').replace(/\/+$/, ''),
  },
  chain: {
    id: Number(PUBLIC_ENV.NEXT_PUBLIC_CHAIN_ID || 0),
    name: PUBLIC_ENV.NEXT_PUBLIC_CHAIN_NAME,
    rpcUrl: PUBLIC_ENV.NEXT_PUBLIC_RPC_URL,
    /** Upstream the read-only /api/rpc relay forwards to (server-only override). */
    rpcUpstream: read("RPC_URL") || PUBLIC_ENV.NEXT_PUBLIC_RPC_URL,
    explorerUrl: PUBLIC_ENV.NEXT_PUBLIC_EXPLORER_URL,
    tokenContract: PUBLIC_ENV.NEXT_PUBLIC_TOKEN_CONTRACT,
    treasuryContract: PUBLIC_ENV.NEXT_PUBLIC_TREASURY_CONTRACT,
  },
}

export function hasDatabase(): boolean {
  return env.databaseUrl.length > 0
}

export function hasAuthSecret(): boolean {
  return env.authSecret.length >= 16
}

export interface ConfigStatus {
  id: string
  label: string
  configured: boolean
  required: boolean
  envKey: string
  purpose: string
}

/** What is wired up on this deployment. Booleans only — safe to render. */
export async function configStatuses(): Promise<ConfigStatus[]> {
  const p = env.gpu.provider
  const { resolveContracts } = await import('@/lib/admin/config')
  const contracts = await resolveContracts().catch(() => ({ token: null, treasury: null, source: { token: null, treasury: null } }))
  return [
    { id: 'database', label: 'PostgreSQL', configured: hasDatabase(), required: true, envKey: 'DATABASE_URL', purpose: 'Accounts, credit ledger, jobs, registry, revenue' },
    { id: 'auth', label: 'Session secret', configured: hasAuthSecret(), required: true, envKey: 'AUTH_SECRET', purpose: 'Signed session cookies for wallet sign-in' },
    { id: 'chain', label: 'Chain RPC', configured: env.chain.id > 0 && env.chain.rpcUrl.length > 0, required: true, envKey: 'NEXT_PUBLIC_RPC_URL', purpose: 'Reads token balances and treasury state' },
    { id: 'token', label: contracts.source.token === 'admin' ? 'Token contract (admin-set)' : 'Token contract', configured: contracts.token !== null, required: false, envKey: 'NEXT_PUBLIC_TOKEN_CONTRACT', purpose: 'Holder tiers via balanceOf(address)' },
    { id: 'treasury', label: contracts.source.treasury === 'admin' ? 'Treasury contract (admin-set)' : 'Treasury contract', configured: contracts.treasury !== null, required: false, envKey: 'NEXT_PUBLIC_TREASURY_CONTRACT', purpose: 'Protocol fees, allocation, spend' },
    {
      id: 'provider',
      label: p ? `Compute provider: ${p}` : 'Compute provider',
      configured: p === 'mock' ? !env.isProduction : p !== '' && env.gpu.endpoint.length > 0,
      required: true,
      envKey: 'GPU_PROVIDER / GPU_PROVIDER_ENDPOINT',
      purpose: p === 'mock' ? 'Development mode — returns labelled placeholder output, never used in production' : 'Runs inference jobs on GPU capacity',
    },
    { id: 'admin', label: 'Admin allowlist', configured: env.adminWallets.length > 0, required: false, envKey: 'ADMIN_WALLETS', purpose: 'Wallets allowed to change protocol configuration' },
  ]
}
