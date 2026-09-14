import 'server-only'
import { erc20Abi, getAddress } from 'viem'
import { publicClient } from '@/lib/blockchain/client'
import { tokenAddress } from '@/lib/blockchain/token'
import { publicChain } from '@/lib/utils/public-env'

/**
 * Live token data for $LAZARUS. Two independent sources, both key-free:
 *
 *  - the chain itself (RPC): name, symbol, decimals, totalSupply, and the
 *    Transfer log count over a recent block window
 *  - GeckoTerminal: price, liquidity, 24 h volume and swap counts for the
 *    pool, when one is indexed
 *
 * Nothing is estimated. If there is no pool yet, `market` is null with a
 * reason and the UI says so instead of printing a price.
 */
const GT_NETWORK = 'robinhood'
const ACTIVITY_BLOCKS = 8_000n
const TTL_MS = 60_000

export interface TokenContractInfo {
  address: string
  name: string
  symbol: string
  decimals: number
  totalSupply: string
  /** totalSupply / 10^decimals, formatted. */
  totalSupplyFormatted: string
  blockNumber: string
  explorerUrl: string | null
  readAt: string
}

export interface TokenActivity {
  transfers: number
  uniqueAddresses: number
  fromBlock: string
  toBlock: string
  blocks: number
  approxMinutes: number | null
}

export interface TokenMarket {
  priceUsd: string
  fdvUsd: string | null
  liquidityUsd: string | null
  volume24hUsd: string | null
  change24hPct: string | null
  change1hPct: string | null
  buys24h: number | null
  sells24h: number | null
  buyers24h: number | null
  sellers24h: number | null
  pool: { address: string; name: string; dex: string; createdAt: string | null }
  launchpad: { graduationPercentage: number; completed: boolean } | null
  source: 'geckoterminal'
  fetchedAt: string
}

export interface TokenSnapshot {
  configured: boolean
  reason?: string
  chain: { id: number; name: string; explorerUrl: string }
  contract: TokenContractInfo | null
  activity: TokenActivity | null
  activityReason?: string
  market: TokenMarket | null
  marketReason?: string
  tradeUrl: string | null
  generatedAt: string
}

let cache: { value: TokenSnapshot; at: number } | null = null

function fmtUnits(raw: bigint, decimals: number): string {
  const whole = raw / 10n ** BigInt(decimals)
  return whole.toLocaleString('en-US')
}

async function readContract(): Promise<{ info: TokenContractInfo; blockNumber: bigint } | { error: string }> {
  const client = publicClient()
  const addr = await tokenAddress()
  if (!client || !addr) return { error: 'not configured' }
  try {
    const address = getAddress(addr)
    const blockNumber = await client.getBlockNumber()
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: 'name' }).catch(() => ''),
      client.readContract({ address, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address, abi: erc20Abi, functionName: 'decimals' }),
      client.readContract({ address, abi: erc20Abi, functionName: 'totalSupply' }),
    ])
    return {
      blockNumber,
      info: {
        address,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        totalSupplyFormatted: fmtUnits(totalSupply, Number(decimals)),
        blockNumber: blockNumber.toString(),
        explorerUrl: publicChain.explorerUrl ? `${publicChain.explorerUrl}/token/${address}` : null,
        readAt: new Date().toISOString(),
      },
    }
  } catch (e) {
    return { error: (e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 160) }
  }
}

/** Counts Transfer events over the last ACTIVITY_BLOCKS blocks. Real logs, no sampling. */
async function readActivity(head: bigint, address: string): Promise<{ activity: TokenActivity } | { error: string }> {
  const client = publicClient()
  if (!client) return { error: 'no rpc' }
  const fromBlock = head > ACTIVITY_BLOCKS ? head - ACTIVITY_BLOCKS : 0n
  try {
    const [logs, headBlock, fromBlockData] = await Promise.all([
      client.getLogs({ address: getAddress(address), event: { type: 'event', name: 'Transfer', inputs: [{ type: 'address', indexed: true, name: 'from' }, { type: 'address', indexed: true, name: 'to' }, { type: 'uint256', indexed: false, name: 'value' }] }, fromBlock, toBlock: head }),
      client.getBlock({ blockNumber: head }).catch(() => null),
      client.getBlock({ blockNumber: fromBlock }).catch(() => null),
    ])
    const unique = new Set<string>()
    for (const l of logs) {
      const args = l.args as { from?: string; to?: string }
      if (args.from) unique.add(args.from.toLowerCase())
      if (args.to) unique.add(args.to.toLowerCase())
    }
    const approxMinutes = headBlock && fromBlockData ? Math.round(Number(headBlock.timestamp - fromBlockData.timestamp) / 60) : null
    return { activity: { transfers: logs.length, uniqueAddresses: unique.size, fromBlock: fromBlock.toString(), toBlock: head.toString(), blocks: Number(head - fromBlock), approxMinutes } }
  } catch (e) {
    // A node that caps the log range answers with an error; report it rather than guessing.
    return { error: (e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 160) }
  }
}

interface GtPool {
  attributes?: {
    address?: string
    name?: string
    base_token_price_usd?: string
    reserve_in_usd?: string
    fdv_usd?: string
    pool_created_at?: string
    volume_usd?: { h24?: string }
    transactions?: { h24?: { buys?: number; sells?: number; buyers?: number; sellers?: number } }
    price_change_percentage?: { h1?: string; h24?: string }
  }
  relationships?: { dex?: { data?: { id?: string } } }
}

async function readMarket(address: string): Promise<{ market: TokenMarket } | { error: string }> {
  try {
    const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/${GT_NETWORK}/tokens/${address.toLowerCase()}/pools`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(9_000),
      cache: 'no-store',
    })
    if (!res.ok) return { error: `GeckoTerminal answered ${res.status}` }
    const body = (await res.json()) as { data?: GtPool[] }
    const pools = body.data ?? []
    if (pools.length === 0) return { error: 'No liquidity pool indexed for this token yet.' }
    // Deepest pool wins.
    const top = pools.reduce((a, b) => (Number(b.attributes?.reserve_in_usd ?? 0) > Number(a.attributes?.reserve_in_usd ?? 0) ? b : a))
    const a = top.attributes ?? {}
    if (!a.base_token_price_usd) return { error: 'Pool indexed but no price yet.' }
    let launchpad: TokenMarket['launchpad'] = null
    try {
      const tk = await fetch(`https://api.geckoterminal.com/api/v2/networks/${GT_NETWORK}/tokens/${address.toLowerCase()}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6_000), cache: 'no-store' })
      if (tk.ok) {
        const j = (await tk.json()) as { data?: { attributes?: { launchpad_details?: { graduation_percentage?: number; completed?: boolean } } } }
        const l = j.data?.attributes?.launchpad_details
        if (l && typeof l.graduation_percentage === 'number') launchpad = { graduationPercentage: l.graduation_percentage, completed: l.completed === true }
      }
    } catch {
      // optional
    }
    return {
      market: {
        priceUsd: a.base_token_price_usd,
        fdvUsd: a.fdv_usd ?? null,
        liquidityUsd: a.reserve_in_usd ?? null,
        volume24hUsd: a.volume_usd?.h24 ?? null,
        change24hPct: a.price_change_percentage?.h24 ?? null,
        change1hPct: a.price_change_percentage?.h1 ?? null,
        buys24h: a.transactions?.h24?.buys ?? null,
        sells24h: a.transactions?.h24?.sells ?? null,
        buyers24h: a.transactions?.h24?.buyers ?? null,
        sellers24h: a.transactions?.h24?.sellers ?? null,
        pool: { address: a.address ?? '', name: a.name ?? '', dex: top.relationships?.dex?.data?.id ?? 'unknown', createdAt: a.pool_created_at ?? null },
        launchpad,
        source: 'geckoterminal',
        fetchedAt: new Date().toISOString(),
      },
    }
  } catch (e) {
    return { error: (e instanceof Error ? e.message : String(e)).slice(0, 160) }
  }
}

export async function getTokenSnapshot(force = false): Promise<TokenSnapshot> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value
  const chain = { id: publicChain.id, name: publicChain.name, explorerUrl: publicChain.explorerUrl }
  const addr = await tokenAddress()
  if (!addr) {
    const value: TokenSnapshot = { configured: false, reason: publicChain.configured ? 'Token contract not configured.' : 'Chain not configured.', chain, contract: null, activity: null, market: null, tradeUrl: null, generatedAt: new Date().toISOString() }
    cache = { value, at: Date.now() }
    return value
  }
  const contract = await readContract()
  if ('error' in contract) {
    const value: TokenSnapshot = { configured: true, reason: contract.error, chain, contract: null, activity: null, market: null, tradeUrl: null, generatedAt: new Date().toISOString() }
    cache = { value, at: Date.now() }
    return value
  }
  const [activity, market] = await Promise.all([readActivity(contract.blockNumber, addr), readMarket(addr)])
  const value: TokenSnapshot = {
    configured: true,
    chain,
    contract: contract.info,
    activity: 'activity' in activity ? activity.activity : null,
    activityReason: 'error' in activity ? activity.error : undefined,
    market: 'market' in market ? market.market : null,
    marketReason: 'error' in market ? market.error : undefined,
    tradeUrl: `https://www.ponsfamily.com/launchpad/${addr.toLowerCase()}`,
    generatedAt: new Date().toISOString(),
  }
  cache = { value, at: Date.now() }
  return value
}
