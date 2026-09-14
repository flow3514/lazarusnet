import { clientIp, handler, json } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { requireSession } from '@/lib/auth/session'
import { syncAccount } from '@/lib/credits/accounting'
import { listJobs } from '@/lib/jobs/service'
import { db, withDb } from '@/lib/db/prisma'
import { isAdminAddress } from '@/lib/auth/admin'

export const runtime = 'nodejs'

/**
 * GET /api/account — the signed-in wallet's compute account: live token
 * balance (balanceOf), tier, credits, recent ledger and jobs. Reading the
 * account also credits the epoch allocation when one is due.
 */
export const GET = handler(async (req: Request) => {
  const session = await requireSession()
  enforceRateLimits([[RATE_LIMITS.readIp, clientIp(req)]])
  const account = await withDb(() => syncAccount(session.userId, session.address))
  const [jobs, ledger] = await withDb(async (prisma) => [
    await listJobs(session.address, 10),
    await prisma.computeCreditLedger.findMany({ where: { accountId: account.accountId }, orderBy: { createdAt: 'desc' }, take: 25 }),
  ])
  void db
  return json({
    address: session.address,
    isAdmin: isAdminAddress(session.address),
    account,
    jobs,
    ledger: ledger.map((l) => ({ id: l.id, type: l.type, amount: l.amount.toString(), balanceAfter: l.balanceAfter.toString(), jobId: l.jobId, epochKey: l.epochKey, note: l.note, createdAt: l.createdAt.toISOString() })),
  })
})
