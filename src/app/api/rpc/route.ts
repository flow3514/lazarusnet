import { clientIp, handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { z } from 'zod'
import { env } from '@/lib/utils/env'
import { AppError } from '@/lib/utils/errors'

export const runtime = 'nodejs'

/**
 * Read-only JSON-RPC relay for the configured chain.
 *
 * Some networks (this one included) are unreachable from certain ISPs, and a
 * browser cannot always reach the upstream RPC directly. This route forwards a
 * strict allowlist of *read* methods and nothing else: no eth_sendRawTransaction,
 * no account or admin namespaces. It holds no keys and signs nothing.
 */
const ALLOWED = new Set([
  'eth_chainId',
  'eth_blockNumber',
  'eth_call',
  'eth_getCode',
  'eth_getBalance',
  'eth_getLogs',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_getTransactionCount',
  'eth_gasPrice',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_maxPriorityFeePerGas',
  'net_version',
])

const callSchema = z.object({
  jsonrpc: z.literal('2.0').optional(),
  id: z.union([z.number(), z.string(), z.null()]).optional(),
  method: z.string().min(1).max(64),
  params: z.array(z.unknown()).max(8).optional(),
})
const bodySchema = z.union([callSchema, z.array(callSchema).min(1).max(10)])

export const POST = handler(async (req: Request) => {
  enforceRateLimits([[RATE_LIMITS.readIp, clientIp(req)]])
  if (!env.chain.rpcUpstream) throw new AppError('CHAIN_NOT_CONFIGURED', 'Chain RPC is not configured.')
  const body = await parseBody(req, bodySchema)
  const calls = Array.isArray(body) ? body : [body]
  for (const c of calls) {
    if (!ALLOWED.has(c.method)) throw new AppError('FORBIDDEN', `Method ${c.method} is not relayed. This endpoint is read-only.`)
  }
  const upstream = await fetch(env.chain.rpcUpstream, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(Array.isArray(body) ? calls.map((c) => ({ jsonrpc: '2.0', id: c.id ?? 1, method: c.method, params: c.params ?? [] })) : { jsonrpc: '2.0', id: calls[0].id ?? 1, method: calls[0].method, params: calls[0].params ?? [] }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e) => {
    throw new AppError('PROVIDER_ERROR', 'Upstream RPC unreachable.', e instanceof Error ? e.message : String(e))
  })
  if (!upstream.ok) throw new AppError('PROVIDER_ERROR', `Upstream RPC answered ${upstream.status}.`)
  const data = await upstream.json()
  return json(data, { headers: { 'cache-control': 'no-store' } })
})

export const GET = handler(async () => json({ ok: true, relay: 'read-only JSON-RPC', chainId: env.chain.id, methods: [...ALLOWED].sort() }))
