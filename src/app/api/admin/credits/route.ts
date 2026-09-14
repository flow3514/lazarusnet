import { z } from 'zod'
import { handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { requireAdmin } from '@/lib/auth/admin'
import { normalizeAddress } from '@/lib/auth/wallet-auth'
import { getOrCreateAccount, manualAdjustment, refundCredits } from '@/lib/credits/accounting'
import { db, withDb } from '@/lib/db/prisma'
import { AppError } from '@/lib/utils/errors'

export const runtime = 'nodejs'

const schema = z.object({
  address: z.string(),
  /** Whole credits, signed for adjustments. */
  credits: z.string().regex(/^-?\d+(\.\d{1,6})?$/),
  type: z.enum(['manual_adjustment', 'protocol_reward', 'refund']).default('manual_adjustment'),
  jobId: z.string().optional(),
  note: z.string().min(3).max(200),
})

function toMicro(credits: string): bigint {
  const neg = credits.startsWith('-')
  const [w, f = ''] = credits.replace('-', '').split('.')
  const v = BigInt(w) * 1_000_000n + BigInt((f + '000000').slice(0, 6))
  return neg ? -v : v
}

/** POST /api/admin/credits — manual ledger entries (adjustment, reward, refund). */
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin()
  enforceRateLimits([[RATE_LIMITS.adminWallet, admin.address]])
  const body = await parseBody(req, schema)
  const address = normalizeAddress(body.address)
  const amount = toMicro(body.credits)
  const result = await withDb(async (prisma) => {
    const wallet = await prisma.wallet.findUnique({ where: { address } })
    if (!wallet) throw new AppError('NOT_FOUND', 'No account for that wallet (it must sign in once first).')
    const account = await getOrCreateAccount(wallet.userId)
    await prisma.$transaction(async (tx) => {
      if (body.type === 'refund') {
        if (amount <= 0n) throw new AppError('VALIDATION', 'Refunds must be positive.')
        await refundCredits(tx, account.id, amount, body.jobId ?? null, admin.address, body.note)
      } else {
        await manualAdjustment(tx, account.id, amount, admin.address, body.note, body.type)
      }
    })
    return prisma.computeAccount.findUniqueOrThrow({ where: { id: account.id } })
  })
  void db
  return json({ account: { id: result.id, balance: result.balance.toString(), reserved: result.reserved.toString() } })
})
