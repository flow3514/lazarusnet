import 'server-only'
import { erc20Abi, getAddress } from 'viem'
import { publicClient } from '@/lib/blockchain/client'
import { publicChain } from '@/lib/utils/public-env'
import { resolveContracts } from '@/lib/admin/config'

export interface TokenMeta {
  address: `0x${string}`
  symbol: string
  decimals: number
  name: string
}

export type TokenBalanceResult =
  | { configured: false; reason: 'token' | 'chain' }
  | { configured: true; ok: true; raw: bigint; meta: TokenMeta; blockNumber: bigint }
  | { configured: true; ok: false; error: string }

let metaCache: { meta: TokenMeta; at: number } | null = null

export async function tokenAddress(): Promise<`0x${string}` | null> {
  if (!publicChain.configured) return null
  const { token } = await resolveContracts()
  return token
}

export async function tokenConfigured(): Promise<boolean> {
  return (await tokenAddress()) !== null
}

/** Reads symbol/decimals/name once per 10 minutes. */
export async function tokenMeta(): Promise<TokenMeta | null> {
  const configured = await tokenAddress()
  if (!configured) return null
  if (metaCache && metaCache.meta.address.toLowerCase() === configured.toLowerCase() && Date.now() - metaCache.at < 10 * 60_000) return metaCache.meta
  const client = publicClient()
  if (!client) return null
  const address = getAddress(configured)
  const [symbol, decimals, name] = await Promise.all([
    client.readContract({ address, abi: erc20Abi, functionName: 'symbol' }),
    client.readContract({ address, abi: erc20Abi, functionName: 'decimals' }),
    client.readContract({ address, abi: erc20Abi, functionName: 'name' }).catch(() => ''),
  ])
  const meta = { address, symbol, decimals: Number(decimals), name }
  metaCache = { meta, at: Date.now() }
  return meta
}

/** ERC-20 balanceOf(holder) on the configured token. Never fabricates: returns a typed "not configured" state. */
export async function readTokenBalance(holder: string): Promise<TokenBalanceResult> {
  if (!publicChain.configured) return { configured: false, reason: 'chain' }
  if (!(await tokenAddress())) return { configured: false, reason: 'token' }
  const client = publicClient()
  if (!client) return { configured: false, reason: 'chain' }
  try {
    const meta = await tokenMeta()
    if (!meta) return { configured: false, reason: 'token' }
    const blockNumber = await client.getBlockNumber()
    const raw = await client.readContract({ address: meta.address, abi: erc20Abi, functionName: 'balanceOf', args: [getAddress(holder)], blockNumber })
    return { configured: true, ok: true, raw, meta, blockNumber }
  } catch (e) {
    return { configured: true, ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 240) }
  }
}
