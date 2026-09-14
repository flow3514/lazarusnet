import { clientIp, handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { requireSession } from '@/lib/auth/session'
import { inferenceInputSchema } from '@/lib/jobs/schema'
import { runInferenceJob } from '@/lib/jobs/service'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * POST /api/inference — Compute Console entry point (wallet session).
 * The wallet address comes from the signed session cookie, never the body.
 */
export const POST = handler(async (req: Request) => {
  const session = await requireSession()
  enforceRateLimits([
    [RATE_LIMITS.inferenceWallet, session.address],
    [RATE_LIMITS.inferenceIp, clientIp(req)],
  ])
  const input = await parseBody(req, inferenceInputSchema)
  const job = await withDb(() => runInferenceJob({ ...input, userId: session.userId, walletAddress: session.address, origin: 'wallet' }))
  return json({ job }, { status: job.status === 'failed' ? 502 : 200 })
})
