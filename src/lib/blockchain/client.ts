import 'server-only'
import { createPublicClient, http, type PublicClient } from 'viem'
import { getChain } from '@/lib/blockchain/chain'
import { AppError } from '@/lib/utils/errors'

let cached: PublicClient | null = null

/** Server-side RPC client, or null when the chain is not configured. */
export function publicClient(): PublicClient | null {
  const chain = getChain()
  if (!chain) return null
  if (!cached) cached = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0], { timeout: 8_000, retryCount: 1 }) })
  return cached
}

export function requirePublicClient(): PublicClient {
  const c = publicClient()
  if (!c) throw new AppError('CHAIN_NOT_CONFIGURED', 'Chain RPC is not configured (NEXT_PUBLIC_CHAIN_ID / NEXT_PUBLIC_RPC_URL).')
  return c
}

export interface RpcHealth {
  configured: boolean
  ok: boolean
  chainId?: number
  blockNumber?: string
  latencyMs?: number
  error?: string
}

/** Cheap liveness probe: eth_chainId + eth_blockNumber. Never throws. */
export async function rpcHealth(timeoutMs = 6000): Promise<RpcHealth> {
  const client = publicClient()
  if (!client) return { configured: false, ok: false, error: 'Chain not configured' }
  const t0 = Date.now()
  try {
    const [chainId, block] = (await Promise.race([
      Promise.all([client.getChainId(), client.getBlockNumber()]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), timeoutMs)),
    ])) as [number, bigint]
    const expected = client.chain?.id
    if (expected && chainId !== expected) return { configured: true, ok: false, chainId, error: `RPC answered chain ${chainId}, expected ${expected}` }
    return { configured: true, ok: true, chainId, blockNumber: block.toString(), latencyMs: Date.now() - t0 }
  } catch (e) {
    return { configured: true, ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) }
  }
}
