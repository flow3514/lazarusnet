import { z } from 'zod'
import { handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { requireAdmin } from '@/lib/auth/admin'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'

const schema = z.object({
  type: z.enum(['fee_inflow', 'compute_allocation', 'compute_spend', 'gpu_capacity_purchase']),
  /** USD with up to 6 decimals. */
  amountUsd: z.string().regex(/^\d+(\.\d{1,6})?$/),
  capacityUnits: z.number().int().min(0).optional(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  blockNumber: z.number().int().min(0).optional(),
  note: z.string().min(3).max(240),
})

/**
 * POST /api/admin/treasury — records a real treasury event (with its tx hash)
 * for the period before the treasury contract exposes it on-chain.
 */
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin()
  enforceRateLimits([[RATE_LIMITS.adminWallet, admin.address]])
  const body = await parseBody(req, schema)
  const [w, f = ''] = body.amountUsd.split('.')
  const amountMicroUsd = BigInt(w) * 1_000_000n + BigInt((f + '000000').slice(0, 6))
  const row = await withDb((prisma) =>
    prisma.treasuryRecord.create({ data: { type: body.type, amountMicroUsd, capacityUnits: body.capacityUnits, txHash: body.txHash, blockNumber: body.blockNumber !== undefined ? BigInt(body.blockNumber) : undefined, note: body.note, recordedBy: admin.address } }),
  )
  return json({ record: { ...row, amountMicroUsd: row.amountMicroUsd.toString(), blockNumber: row.blockNumber?.toString() ?? null } }, { status: 201 })
})
